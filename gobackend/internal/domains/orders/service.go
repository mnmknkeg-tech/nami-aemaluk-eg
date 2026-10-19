package orders

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/customers"
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/notification"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/pagination"
	"go.uber.org/zap"
)

// Service implements the Orders domain business logic.
type Service struct {
	cfg   *config.Config
	repo  *Repository
	notif *notification.Service
}

// NewService creates a new orders service. notifSvc is optional and used to
// push real-time notifications to the shop when a new order arrives.
func NewService(cfg *config.Config, repo *Repository, notifSvc *notification.Service) *Service {
	return &Service{cfg: cfg, repo: repo, notif: notifSvc}
}

// CreateOrder creates an order from a cart payload (authenticated users).
func (s *Service) CreateOrder(ctx context.Context, req CreateOrderRequest, userID, actorRole, actorShopID string) (*Order, error) {
	if userID == "" {
		return nil, errors.Unauthorized("unauthenticated", "غير مصرح")
	}
	return s.createOrderCore(ctx, req, userID, actorRole, actorShopID, false)
}

// CreateGuestOrder creates an order from a public storefront visitor without
// login (guest checkout). The visitor must provide a phone number and a
// delivery address; the order source is marked as "guest".
func (s *Service) CreateGuestOrder(ctx context.Context, req CreateOrderRequest) (*Order, error) {
	return s.createOrderCore(ctx, req, "", "GUEST", "", true)
}

func (s *Service) createOrderCore(ctx context.Context, req CreateOrderRequest, userID, actorRole, actorShopID string, allowGuest bool) (*Order, error) {
	shopID := strings.TrimSpace(req.ShopID)
	if shopID == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}
	if strings.EqualFold(actorRole, "MERCHANT") {
		if actorShopID == "" || !strings.EqualFold(actorShopID, shopID) {
			return nil, errors.Forbidden("shop_ownership", "لا يمكنك إنشاء طلب لمتجر آخر")
		}
	}

	source := "customer"
	if req.Source != nil {
		if raw := strings.ToLower(strings.TrimSpace(*req.Source)); raw == "pos" {
			if strings.EqualFold(actorRole, "MERCHANT") || strings.EqualFold(actorRole, "ADMIN") {
				source = "pos"
			}
		}
	}

	if allowGuest && source == "customer" {
		source = "guest"
	}

	customerPhone := ""
	if req.CustomerPhone != nil {
		customerPhone = strings.TrimSpace(*req.CustomerPhone)
	}
	manual := ""
	if req.DeliveryAddressManual != nil {
		manual = strings.TrimSpace(*req.DeliveryAddressManual)
	}

	// Guests (public storefront checkout) must always provide a phone and a
	// delivery address — in every environment.
	if source != "pos" && (allowGuest || !s.cfg.IsProduction()) {
		if customerPhone == "" {
			return nil, errors.Validation("customer_phone_required", "رقم الهاتف مطلوب")
		}
		hasCoords := req.DeliveryLat != nil && req.DeliveryLng != nil
		if !hasCoords && manual == "" {
			return nil, errors.Validation("delivery_required", "حدد موقعك على الخريطة أو اكتب العنوان")
		}
	}

	if len(req.Items) == 0 {
		return nil, errors.Validation("items_required", "items مطلوبة")
	}

	// Only POS-capable actors (the shop's own merchant or an admin) may choose
	// the initial status and payment status; guests and customers always start
	// at PENDING/unpaid so a public checkout call cannot forge a DELIVERED/PAID
	// order.
	trustedActor := strings.EqualFold(actorRole, "MERCHANT") || strings.EqualFold(actorRole, "ADMIN")

	order := &Order{
		Status:                OrderStatusPending,
		UserID:                userID,
		ShopID:                shopID,
		Source:                source,
		PaymentMethod:         req.PaymentMethod,
		Notes:                 req.Notes,
		CustomerPhone:         req.CustomerPhone,
		DeliveryAddressManual: req.DeliveryAddressManual,
		DeliveryLat:           req.DeliveryLat,
		DeliveryLng:           req.DeliveryLng,
		DeliveryNote:          req.DeliveryNote,
		CustomerNote:          req.CustomerNote,
		PosShiftID:            req.PosShiftID,
	}

	// POS orders are always linked to the currently open shift so the shift
	// totals (total_sales / orders_count) join exactly — even if the device
	// clock is skewed. The cashier desktop sends posShiftId; the dashboard
	// POS doesn't, so fall back to the shop's open shift.
	if source == "pos" {
		if order.PosShiftID == nil || strings.TrimSpace(*order.PosShiftID) == "" {
			if shiftID, err := s.repo.FindOpenShiftID(ctx, shopID); err == nil && shiftID != "" {
				order.PosShiftID = &shiftID
			}
		}
		// A stale shift id (shift already closed / other shop) must not point
		// the order at the wrong shift — fall back to the open one.
		if order.PosShiftID != nil && !s.repo.ShiftBelongsToShop(ctx, *order.PosShiftID, shopID) {
			if shiftID, err := s.repo.FindOpenShiftID(ctx, shopID); err == nil && shiftID != "" {
				order.PosShiftID = &shiftID
			} else {
				order.PosShiftID = nil
			}
		}
	}

	if trustedActor {
		order.PaymentStatus = req.PaymentStatus
	}

	if req.Status != nil && trustedActor {
		status := OrderStatus(strings.ToUpper(strings.TrimSpace(*req.Status)))
		if !isValidOrderStatus(status) {
			return nil, errors.Validation("status_invalid", "حالة الطلب غير صحيحة")
		}
		order.Status = status
	}

	total := 0.0
	decrementStock := false
	for i, it := range req.Items {
		pid := strings.TrimSpace(it.ProductID)
		if pid == "" {
			return nil, errors.Validation("productId_required", "productId مطلوب")
		}
		if it.Quantity <= 0 {
			return nil, errors.Validation("quantity_invalid", "quantity غير صحيحة")
		}

		p, err := s.repo.GetProductForOrder(ctx, pid, shopID)
		if err != nil {
			return nil, err
		}
		if p == nil || !p.IsActive {
			return nil, errors.Validation("product_unavailable", "بعض المنتجات غير متاحة")
		}
		if p.TrackStock && it.Quantity > p.Stock {
			return nil, errors.Validation("insufficient_stock", "الكمية غير متوفرة في المخزون")
		}
		if p.TrackStock {
			decrementStock = true
		}

		order.Items = append(order.Items, OrderItem{
			ProductID:        pid,
			ProductName:      p.Name,
			Quantity:         it.Quantity,
			Price:            p.Price,
			Addons:           it.Addons,
			VariantSelection: it.VariantSelection,
		})
		total += p.Price * float64(it.Quantity)
		_ = i
	}

	// The total is always computed server-side from DB product prices. The
	// client-supplied total is honored only for POS orders created by the
	// shop's own merchant/admin (the cashier app prices addons/discounts
	// client-side); public and customer flows can never set it.
	if trustedActor && source == "pos" && req.Total != nil && *req.Total > 0 {
		order.Total = *req.Total
	} else {
		order.Total = total
	}

	created, err := s.repo.CreateOrder(ctx, order, decrementStock)
	if err != nil {
		logger.Global().Error("create order failed", zap.Error(err))
		return nil, errors.Internal("create_order_failed", err)
	}

	// العميل الموحد: اربط الطلب بالعميل المركزي (بحث بالهاتف → إنشاء لو جديد →
	// عدادات + نقاط ولاء). Best-effot — لا يفشل الطلب أبدًا.
	{
		cPhone := customerPhone
		cName := ""
		if req.Customer != nil {
			if cName == "" {
				cName = strings.TrimSpace(req.Customer.Name)
			}
			if cPhone == "" {
				cPhone = strings.TrimSpace(req.Customer.Phone)
			}
		}
		if cPhone != "" {
			linkCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
			customers.LinkOrderCustomer(linkCtx, s.repo.Pool(), created.ShopID, cPhone, cName, created.Source, created.ID, created.Total)
			cancel()
		}
	}

	// Fire-and-forget: notify the shop about the new order (bell ring on
	// dashboard + push). Source distinguishes website vs POS/cashier orders.
	if s.notif != nil {
		notifSvc := s.notif
		shopID := created.ShopID
		orderID := created.ID
		orderSource := created.Source
		orderTotal := created.Total
		go func() {
			notifCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			if err := notifSvc.NotifyNewOrder(notifCtx, shopID, orderID, orderID, orderSource, orderTotal); err != nil {
				logger.Global().Warn("notify new order failed", zap.Error(err))
			}
			// Admins also get an in-app row so the platform side sees every order.
			shopName := s.shopName(context.Background(), shopID)
			adminCtx, adminCancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer adminCancel()
			if err := notifSvc.NotifyAdminsNewOrder(adminCtx, shopName, orderID, orderID, orderTotal); err != nil {
				logger.Global().Warn("notify admins new order failed", zap.Error(err))
			}
		}()
	}

	return created, nil
}

// shopName resolves a shop display name for notification copy (best-effort).
func (s *Service) shopName(ctx context.Context, shopID string) string {
	var name string
	if err := s.repo.Pool().QueryRow(ctx, `SELECT name FROM shops WHERE id = $1`, shopID).Scan(&name); err != nil {
		return ""
	}
	return name
}

// GetByID returns an order by ID with ownership verification to prevent IDOR.
// - Admin: can access any order
// - Merchant: only orders for their own shop
// - Courier: only orders assigned to them
// - Customer: only their own orders
func (s *Service) GetByID(ctx context.Context, id, actorID, actorShopID, actorRole string) (*Order, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	order, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if order == nil {
		return nil, errors.NotFound("order", id)
	}

	role := strings.ToUpper(strings.TrimSpace(actorRole))
	switch role {
	case "ADMIN":
		// Admin can access any order.
	case "MERCHANT":
		if actorShopID == "" || order.ShopID != actorShopID {
			return nil, errors.Forbidden("insufficient_role", "غير مصرح لك بالوصول إلى هذا الطلب")
		}
	case "COURIER":
		if order.CourierID == nil || *order.CourierID != actorID {
			return nil, errors.Forbidden("insufficient_role", "غير مصرح لك بالوصول إلى هذا الطلب")
		}
	default:
		// CUSTOMER or any other role can only see their own orders.
		if order.UserID != actorID {
			return nil, errors.Forbidden("insufficient_role", "غير مصرح لك بالوصول إلى هذا الطلب")
		}
	}

	return order, nil
}

// ListByShop returns orders for a shop.
func (s *Service) ListByShop(ctx context.Context, shopID string, actorShopID, actorRole string, req OrderListRequest) ([]Order, pagination.Meta, error) {
	if shopID == "" {
		return nil, pagination.Meta{}, errors.Validation("shopId_required", "shopId مطلوب")
	}
	if !isAdmin(actorRole) && actorShopID != shopID {
		return nil, pagination.Meta{}, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	page, limit, offset := normalizeOrderPaging(req.Page, req.Limit)
	orders, err := s.repo.ListByShop(ctx, shopID, req.From, req.To, limit, offset)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	total, err := s.repo.CountByShop(ctx, shopID, req.From, req.To)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	return orders, pagination.NewMeta(total, page, limit), nil
}

// ListMerchantMine returns orders for the merchant's own shop.
func (s *Service) ListMerchantMine(ctx context.Context, actorShopID, actorRole string, req OrderListRequest) ([]Order, pagination.Meta, error) {
	if actorShopID == "" {
		return nil, pagination.Meta{}, errors.Validation("shopId_required", "shopId غير متوفر")
	}
	page, limit, offset := normalizeOrderPaging(req.Page, req.Limit)
	orders, err := s.repo.ListByShop(ctx, actorShopID, req.From, req.To, limit, offset)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	total, err := s.repo.CountByShop(ctx, actorShopID, req.From, req.To)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	return orders, pagination.NewMeta(total, page, limit), nil
}

// ListAllAdmin returns all orders for admin.
func (s *Service) ListAllAdmin(ctx context.Context, req OrderListRequest) ([]Order, pagination.Meta, error) {
	page, limit, offset := normalizeOrderPaging(req.Page, req.Limit)
	orders, err := s.repo.ListAllAdmin(ctx, req.ShopID, req.UserID, req.From, req.To, limit, offset)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	total, err := s.repo.CountAllAdmin(ctx, req.ShopID, req.UserID, req.From, req.To)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	return orders, pagination.NewMeta(total, page, limit), nil
}

// ListMyCourierOrders returns orders assigned to the authenticated courier.
func (s *Service) ListMyCourierOrders(ctx context.Context, courierID string, req CourierOrderListRequest) ([]Order, pagination.Meta, error) {
	if courierID == "" {
		return nil, pagination.Meta{}, errors.Unauthorized("unauthenticated", "غير مصرح")
	}
	page, limit, offset := normalizeOrderPaging(req.Page, req.Limit)
	orders, err := s.repo.ListByCourier(ctx, courierID, limit, offset)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	total, err := s.repo.CountByCourier(ctx, courierID)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	return orders, pagination.NewMeta(total, page, limit), nil
}

// ListCustomerOrders returns orders placed by a customer.
func (s *Service) ListCustomerOrders(ctx context.Context, userID string, page, limit int) ([]Order, pagination.Meta, error) {
	if userID == "" {
		return nil, pagination.Meta{}, errors.Unauthorized("unauthenticated", "غير مصرح")
	}
	p, l, offset := normalizeOrderPaging(page, limit)
	orders, err := s.repo.ListByUserID(ctx, userID, l, offset)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	total, err := s.repo.CountByUserID(ctx, userID)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	return orders, pagination.NewMeta(total, p, l), nil
}

// UpdateOrder updates order status and metadata for merchant/admin.
func (s *Service) UpdateOrder(ctx context.Context, id string, req UpdateOrderRequest, actorShopID, actorRole string) (*Order, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	order, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if order == nil {
		return nil, errors.NotFound("order", id)
	}
	if !isAdmin(actorRole) && actorShopID != order.ShopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}

	var updated *Order

	if req.Status != nil {
		nextStatus := OrderStatus(strings.ToUpper(*req.Status))
		if !isValidTransition(order.Status, nextStatus) {
			return nil, errors.Validation("invalid_status_transition", "الانتقال بين الحالات غير مسموح")
		}
		updated, err = s.repo.UpdateStatus(ctx, id, nextStatus, req.Notes)
		if err != nil {
			return nil, err
		}
	} else if req.Notes != nil {
		updated, err = s.repo.UpdateNotes(ctx, id, req.Notes)
		if err != nil {
			return nil, err
		}
	}

	if req.CodCollected != nil && *req.CodCollected {
		updated, err = s.repo.MarkCodCollected(ctx, id)
		if err != nil {
			return nil, err
		}
	}
	if req.HandedToCourier != nil && *req.HandedToCourier {
		updated, err = s.repo.UpdateStatus(ctx, id, OrderStatusReady, nil)
		if err != nil {
			return nil, err
		}
	}

	if updated == nil {
		updated = order
	}

	// Fire-and-forget: tell the customer their order moved (in-app + push).
	// Only for logged-in orders — guest orders have no user to notify.
	if s.notif != nil && req.Status != nil && order.UserID != "" {
		notifSvc := s.notif
		orderID := updated.ID
		userID := order.UserID
		newStatus := string(updated.Status)
		go func() {
			notifCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			if err := notifSvc.NotifyOrderStatusChanged(notifCtx, userID, orderID, orderID, newStatus); err != nil {
				logger.Global().Warn("notify order status changed failed", zap.Error(err))
			}
		}()
	}

	return updated, nil
}

// AssignCourier assigns a courier to an order.
func (s *Service) AssignCourier(ctx context.Context, id string, req AssignCourierRequest) (*Order, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	if req.CourierID == "" {
		return nil, errors.Validation("courierId_required", "courierId مطلوب")
	}
	order, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if order == nil {
		return nil, errors.NotFound("order", id)
	}
	ok, err := s.repo.IsUserCourier(ctx, req.CourierID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errors.Validation("invalid_courier", "المستخدم ليس مندوباً صالحاً")
	}
	return s.repo.AssignCourier(ctx, id, req.CourierID)
}

// UpdateCourierOrder allows a courier to update their assigned order.
func (s *Service) UpdateCourierOrder(ctx context.Context, id string, req CourierUpdateRequest, courierID string) (*Order, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	if courierID == "" {
		return nil, errors.Unauthorized("unauthenticated", "غير مصرح")
	}
	order, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if order == nil {
		return nil, errors.NotFound("order", id)
	}
	if order.CourierID == nil || *order.CourierID != courierID {
		return nil, errors.Forbidden("not_assigned_courier", "لست المندوب المخصص لهذا الطلب")
	}

	var status *OrderStatus
	if req.Status != nil {
		s := OrderStatus(strings.ToUpper(*req.Status))
		if s != OrderStatusDelivered && s != OrderStatusCancelled {
			return nil, errors.Validation("invalid_status", "حالة غير صالحة")
		}
		status = &s
	}

	updated, err := s.repo.CourierUpdate(ctx, id, status, req.CodCollected)
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func isValidTransition(current, next OrderStatus) bool {
	valid := map[OrderStatus][]OrderStatus{
		OrderStatusPending:   {OrderStatusConfirmed, OrderStatusCancelled},
		OrderStatusConfirmed: {OrderStatusPreparing, OrderStatusCancelled},
		OrderStatusPreparing: {OrderStatusReady, OrderStatusCancelled},
		OrderStatusReady:     {OrderStatusDelivered, OrderStatusCancelled},
		OrderStatusDelivered: {OrderStatusRefunded},
		OrderStatusCancelled: {},
		OrderStatusRefunded:  {},
	}
	for _, v := range valid[current] {
		if v == next {
			return true
		}
	}
	return false
}

func isAdmin(role string) bool {
	return strings.EqualFold(role, "ADMIN")
}

func normalizeOrderPaging(page, limit int) (normalizedPage, normalizedLimit, offset int) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if page < 1 {
		page = 1
	}
	offset = (page - 1) * limit
	return page, limit, offset
}

// parseOrderDate parses an optional date string.
func parseOrderDate(s string) *time.Time {
	if s == "" {
		return nil
	}
	// Try parsing ISO8601.
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return &t
	}
	// Try date only.
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return &t
	}
	return nil
}

// ParsePageLimit parses optional page/limit strings.
func ParsePageLimit(pageStr, limitStr string) (int, int) {
	page, _ := strconv.Atoi(pageStr)
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	return page, limit
}
