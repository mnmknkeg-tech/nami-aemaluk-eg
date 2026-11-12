package orders

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/coupons"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/customers"
	"math"
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
	cfg        *config.Config
	repo       *Repository
	notif      *notification.Service
	couponRepo *coupons.Repository
}

// NewService creates a new orders service. notifSvc is optional and used to
// push real-time notifications to the shop when a new order arrives.
func NewService(cfg *config.Config, repo *Repository, notifSvc *notification.Service) *Service {
	return &Service{cfg: cfg, repo: repo, notif: notifSvc}
}

// SetCouponRepository wires coupon validation without changing existing constructors.
func (s *Service) SetCouponRepository(repo *coupons.Repository) { s.couponRepo = repo }

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
		} else if raw == "website" {
			// Authenticated Builder preview checkouts are real website orders,
			// not POS sales. Guests are still forced to "guest" below.
			if strings.EqualFold(actorRole, "MERCHANT") || strings.EqualFold(actorRole, "ADMIN") {
				source = "website"
			}
		}
	}

	if allowGuest && source == "customer" {
		source = "guest"
	}

	customerPhone := ""
	if req.CustomerPhone != nil {
		// Normalize (Arabic-Indic digits, +20/0020 prefixes, spacing) so
		// customer linking by phone does not split one customer into many.
		customerPhone = normalizeEgyptianPhone(strings.TrimSpace(*req.CustomerPhone))
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
	// Online orders must carry a plausible Egyptian phone number. POS stays
	// lenient — cashiers type whatever the customer dictates.
	if customerPhone != "" && source != "pos" && !isValidEgyptianPhone(customerPhone) {
		return nil, errors.Validation("customer_phone_invalid", "رقم الهاتف غير صحيح — اكتب رقم موبايل مصري مثل 010xxxxxxxx")
	}
	if (req.DeliveryLat == nil) != (req.DeliveryLng == nil) {
		return nil, errors.Validation("delivery_coordinates_invalid", "يجب إرسال خط العرض وخط الطول معاً")
	}
	if req.DeliveryLat != nil && (*req.DeliveryLat < -90 || *req.DeliveryLat > 90) {
		return nil, errors.Validation("delivery_coordinates_invalid", "خط العرض غير صحيح")
	}
	if req.DeliveryLng != nil && (*req.DeliveryLng < -180 || *req.DeliveryLng > 180) {
		return nil, errors.Validation("delivery_coordinates_invalid", "خط الطول غير صحيح")
	}

	if len(req.Items) == 0 {
		return nil, errors.Validation("items_required", "items مطلوبة")
	}

	// Only POS-capable actors (the shop's own merchant or an admin) may choose
	// the initial status and payment status; guests and customers always start
	// at PENDING/unpaid so a public checkout call cannot forge a DELIVERED/PAID
	// order.
	trustedActor := strings.EqualFold(actorRole, "MERCHANT") || strings.EqualFold(actorRole, "ADMIN")

	paymentMethod, err := normalizePaymentMethod(req.PaymentMethod, allowGuest)
	if err != nil {
		return nil, err
	}
	var normalizedPhone, normalizedAddress *string
	if customerPhone != "" {
		normalizedPhone = &customerPhone
	}
	if manual != "" {
		normalizedAddress = &manual
	}
	var resolvedCustomerName *string
	if req.CustomerName != nil && strings.TrimSpace(*req.CustomerName) != "" {
		trimmed := strings.TrimSpace(*req.CustomerName)
		resolvedCustomerName = &trimmed
	} else if req.Customer != nil && strings.TrimSpace(req.Customer.Name) != "" {
		trimmed := strings.TrimSpace(req.Customer.Name)
		resolvedCustomerName = &trimmed
	}
	order := &Order{
		Status:                OrderStatusPending,
		UserID:                userID,
		ShopID:                shopID,
		Source:                source,
		PaymentMethod:         paymentMethod,
		Notes:                 req.Notes,
		CustomerName:          resolvedCustomerName,
		CustomerPhone:         normalizedPhone,
		DeliveryAddressManual: normalizedAddress,
		DeliveryLat:           req.DeliveryLat,
		DeliveryLng:           req.DeliveryLng,
		DeliveryNote:          req.DeliveryNote,
		CustomerNote:          req.CustomerNote,
		PosShiftID:            req.PosShiftID,
	}
	if req.IdempotencyKey != "" {
		fingerprintRequest := req
		fingerprintRequest.ShopID = shopID
		fingerprintRequest.Items = append([]CreateOrderItem(nil), req.Items...)
		for i := range fingerprintRequest.Items {
			fingerprintRequest.Items[i].ProductID = strings.TrimSpace(fingerprintRequest.Items[i].ProductID)
		}
		if !(trustedActor && source == "pos") {
			fingerprintRequest.Total = nil
		}
		if !trustedActor {
			fingerprintRequest.PaymentStatus = nil
			fingerprintRequest.Status = nil
			fingerprintRequest.PosShiftID = nil
		}
		fingerprintPayload := struct {
			UserID    string
			ActorRole string
			Source    string
			Request   CreateOrderRequest
		}{
			UserID:    userID,
			ActorRole: strings.ToUpper(strings.TrimSpace(actorRole)),
			Source:    source,
			Request:   fingerprintRequest,
		}
		encoded, err := json.Marshal(fingerprintPayload)
		if err != nil {
			return nil, errors.Internal("order_fingerprint_failed", err)
		}
		digest := sha256.Sum256(encoded)
		requestHash := hex.EncodeToString(digest[:])
		idempotencyKey := req.IdempotencyKey
		order.IdempotencyKey = &idempotencyKey
		order.RequestHash = &requestHash
		existing, err := s.repo.FindIdempotent(ctx, shopID, idempotencyKey, requestHash)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return existing, nil
		}
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
	for _, it := range req.Items {
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
		if p == nil || !productAvailableOnChannel(*p, req.Source) {
			return nil, errors.Validation("product_unavailable", "بعض المنتجات غير متاحة")
		}
		if p.TrackStock && it.Quantity > p.Stock {
			return nil, errors.Validation("insufficient_stock", "الكمية غير متوفرة في المخزون")
		}
		// Server-verified unit price (size variant + addons). Previously
		// only the bare product price was charged while the storefront
		// displayed and promised base + size + addons — every COD order
		// with a paid size/addon was collected below the agreed amount.
		unitPrice := resolveUnitPrice(*p, it)
		order.Items = append(order.Items, OrderItem{
			ProductID:        pid,
			ProductName:      p.Name,
			Quantity:         it.Quantity,
			Price:            unitPrice,
			Addons:           it.Addons,
			VariantSelection: it.VariantSelection,
			TrackStock:       p.TrackStock,
		})
		total += unitPrice * float64(it.Quantity)
	}

	// The total is always computed server-side for customer and website flows.
	// Only POS may provide a final total because it is an authenticated cashier
	// flow with its own permission-checked discount rules.
	if trustedActor && source == "pos" && req.Total != nil && *req.Total > 0 {
		order.Total = *req.Total
	} else {
		order.Total = total
	}
	var appliedCouponID string
	if req.CouponCode != nil && strings.TrimSpace(*req.CouponCode) != "" {
		if s.couponRepo == nil {
			return nil, errors.Validation("coupon_unavailable", "نظام الكوبونات غير متاح")
		}
		coupon, err := s.couponRepo.Find(ctx, shopID, *req.CouponCode)
		if err != nil {
			return nil, errors.Validation("coupon_invalid", "الكوبون غير صالح أو منتهي")
		}
		appliedCouponID = coupon.ID
		discount, err := coupons.Validate(*coupon, total, time.Now())
		if err != nil {
			return nil, err
		}
		order.Discount = discount
		order.CouponCode = req.CouponCode
		order.Total = total - discount
	}

	created, duplicate, err := s.repo.CreateOrder(ctx, order, appliedCouponID)
	if err != nil {
		if _, ok := errors.IsAppError(err); ok {
			return nil, err
		}
		logger.Global().Error("create order failed", zap.Error(err))
		return nil, errors.Internal("create_order_failed", err)
	}
	if duplicate {
		return created, nil
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

func productAvailableOnChannel(product OrderProduct, channel *string) bool {
	if channel != nil && strings.EqualFold(strings.TrimSpace(*channel), "marketplace") {
		return product.AppActive
	}
	return product.IsActive
}

// resolveUnitPrice computes the authoritative per-unit price for an order line.
// The storefront configurator displays unit = variant size price (replacing the
// product base price) + selected addon prices, but this endpoint previously
// charged the bare product price — every order with a paid size or addons was
// stored (and collected on delivery) below what the customer agreed to pay.
// Prices are resolved against the product's own menu_variants / addons JSONB
// (server-side source of truth): a client-forged price that does not match the
// stored definitions contributes nothing, and negative values are clamped.
func resolveUnitPrice(p OrderProduct, it CreateOrderItem) float64 {
	base := p.Price
	if math.IsNaN(base) || math.IsInf(base, 0) || base < 0 {
		base = 0
	}

	// 1) Size variant: match by label against the product's menu_variants.
	if vs, ok := it.VariantSelection.(map[string]any); ok {
		label := firstNonEmptyString(
			stringFromAny(vs["sizeLabel"]),
			stringFromAny(vs["size"]),
		)
		if label != "" {
			if sizePrice := lookupMenuVariantPrice(p.MenuVariants, label); sizePrice > 0 {
				base = sizePrice
			}
		}
	}

	// 2) Addons: match each requested addon by name against the product's
	// addons JSONB; unknown or unpriced addons contribute nothing.
	total := base
	if len(it.Addons) > 0 {
		total += lookupAddonsTotal(p.AddonsJSON, it.Addons)
	}
	if math.IsNaN(total) || math.IsInf(total, 0) || total < 0 {
		return base
	}
	return total
}

// lookupMenuVariantPrice finds a size by label/name in the product's
// menu_variants JSONB and returns its stored price. Returns 0 when no match
// exists (the caller then keeps the product base price, mirroring the
// storefront's "size without a price falls back to the base price" rule).
func lookupMenuVariantPrice(menuVariants any, label string) float64 {
	groups, ok := menuVariants.([]any)
	if !ok {
		return 0
	}
	want := strings.ToLower(strings.TrimSpace(label))
	for _, g := range groups {
		gm, ok := g.(map[string]any)
		if !ok {
			continue
		}
		sizes, ok := gm["sizes"].([]any)
		if !ok {
			continue
		}
		for _, s := range sizes {
			sm, ok := s.(map[string]any)
			if !ok {
				continue
			}
			name := firstNonEmptyString(stringFromAny(sm["label"]), stringFromAny(sm["name"]))
			if name == "" || strings.ToLower(strings.TrimSpace(name)) != want {
				continue
			}
			price := numberFromAny(sm["price"])
			if math.IsNaN(price) || math.IsInf(price, 0) || price <= 0 {
				return 0
			}
			if price > 1000000 {
				return 1000000
			}
			return price
		}
	}
	return 0
}

// lookupAddonsTotal prices each requested addon against the product's addons
// JSONB. An addon is matched by (case-insensitive) name; when the merchant
// defined variants for the addon, the requested variant label picks the price.
// Unmatched addons price as zero and every price is clamped to >= 0.
func lookupAddonsTotal(addonsJSON any, requested []any) float64 {
	if len(requested) == 0 {
		return 0
	}
	type addonDef struct {
		price    float64
		variants map[string]float64
	}
	catalog := map[string]addonDef{}
	appendDef := func(name string, price float64, variants []any) {
		name = strings.ToLower(strings.TrimSpace(name))
		if name == "" {
			return
		}
		def := addonDef{price: clampMoney(price), variants: map[string]float64{}}
		for _, v := range variants {
			vm, ok := v.(map[string]any)
			if !ok {
				continue
			}
			label := stringFromAny(vm["label"])
			if label == "" {
				continue
			}
			def.variants[strings.ToLower(strings.TrimSpace(label))] = clampMoney(numberFromAny(vm["price"]))
		}
		catalog[name] = def
	}
	if rows, ok := addonsJSON.([]any); ok {
		for _, row := range rows {
			rm, ok := row.(map[string]any)
			if !ok {
				continue
			}
			if opts, ok := rm["options"].([]any); ok {
				// Grouped addon: {name, options: [{name, price, variants}]}
				for _, o := range opts {
					om, ok := o.(map[string]any)
					if !ok {
						continue
					}
					appendDef(stringFromAny(om["name"]), numberFromAny(om["price"]), toSliceAny(om["variants"]))
				}
			} else {
				// Direct addon: {name, price, variants}
				appendDef(stringFromAny(rm["name"]), numberFromAny(rm["price"]), toSliceAny(rm["variants"]))
			}
		}
	}

	const maxAddonsPerItem = 100
	const maxAddonPrice = 100000.0
	sum := 0.0
	for i, raw := range requested {
		if i >= maxAddonsPerItem {
			break
		}
		am, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		name := strings.ToLower(strings.TrimSpace(stringFromAny(am["name"])))
		if name == "" {
			continue
		}
		def, ok := catalog[name]
		if !ok {
			continue
		}
		if variant := stringFromAny(am["variant"]); variant != "" {
			if vp, ok := def.variants[strings.ToLower(strings.TrimSpace(variant))]; ok {
				sum += math.Min(vp, maxAddonPrice)
				continue
			}
		}
		sum += math.Min(def.price, maxAddonPrice)
	}
	return sum
}

func clampMoney(v float64) float64 {
	if math.IsNaN(v) || math.IsInf(v, 0) || v < 0 {
		return 0
	}
	if v > 1000000 {
		return 1000000
	}
	return v
}

func numberFromAny(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case float32:
		return float64(n)
	case int:
		return float64(n)
	case int64:
		return float64(n)
	case json.Number:
		f, _ := n.Float64()
		return f
	case string:
		f, _ := strconv.ParseFloat(strings.TrimSpace(n), 64)
		return f
	}
	return 0
}

func stringFromAny(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func toSliceAny(v any) []any {
	if s, ok := v.([]any); ok {
		return s
	}
	return nil
}

func firstNonEmptyString(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// normalizeEgyptianPhone converts common Egyptian phone input variants to a
// canonical string: Arabic-Indic digits (٠-٩ / ۰-۹), spacing/punctuation,
// +20 / 0020 country prefixes and the dropped leading zero are all
// normalized so customer linking by phone does not split one customer into
// many near-duplicates. Returns "" when nothing usable remains.
func normalizeEgyptianPhone(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '+':
			b.WriteRune(r)
		case r >= 0x0660 && r <= 0x0669: // Arabic-Indic ٠-٩
			b.WriteRune(r - 0x0660 + '0')
		case r >= 0x06F0 && r <= 0x06F9: // Eastern Arabic ۰-۹
			b.WriteRune(r - 0x06F0 + '0')
		default:
			// spaces, dashes, dots, parens, RTL marks, etc. are dropped
		}
	}
	s = b.String()
	s = strings.TrimPrefix(s, "+")
	if strings.HasPrefix(s, "0020") {
		s = "0" + strings.TrimPrefix(s, "0020")
	} else if strings.HasPrefix(s, "20") && (len(s) == 13 || len(s) == 12) {
		s = "0" + strings.TrimPrefix(s, "20")
	}
	if len(s) == 10 && strings.HasPrefix(s, "1") {
		s = "0" + s // mobile typed without the leading zero
	}
	return s
}

// isValidEgyptianPhone validates the canonical form produced by
// normalizeEgyptianPhone: an 11-digit mobile (01[0125]xxxxxxxx) or a
// 10-digit landline. Landlines never start with "01" (mobile prefixes), so a
// 10-digit "01..." number is a mistyped mobile and must be rejected.
func isValidEgyptianPhone(p string) bool {
	if len(p) == 11 && strings.HasPrefix(p, "01") &&
		(p[2] == '0' || p[2] == '1' || p[2] == '2' || p[2] == '5') {
		return true
	}
	if len(p) == 10 && strings.HasPrefix(p, "0") && !strings.HasPrefix(p, "01") {
		return true
	}
	return false
}

func normalizePaymentMethod(value *string, required bool) (*string, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		if required {
			defaultMethod := "COD"
			return &defaultMethod, nil
		}
		return nil, nil
	}
	method := strings.ToUpper(strings.TrimSpace(*value))
	switch method {
	case "COD", "CASH", "CARD", "WALLET", "CREDIT", "SPLIT":
		return &method, nil
	default:
		return nil, errors.Validation("payment_method_invalid", "طريقة الدفع غير مدعومة")
	}
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

// GetPublic returns the limited, PII-free order view used by the public
// tracking page on published storefronts. The order UUID is the unguessable
// tracking token; no ownership check is required beyond knowing it.
func (s *Service) GetPublic(ctx context.Context, id string) (*PublicOrderResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	order, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if order == nil {
		return nil, errors.NotFound("order", id)
	}

	items := make([]PublicOrderItem, 0, len(order.Items))
	for _, it := range order.Items {
		name := it.Name
		if name == "" {
			name = it.ProductName
		}
		if name == "" {
			name = it.Title
		}
		items = append(items, PublicOrderItem{
			ProductID: it.ProductID,
			Name:      name,
			Price:     it.Price,
			Quantity:  it.Quantity,
		})
	}

	shop, err := s.repo.FindPublicShopInfo(ctx, order.ShopID)
	if err != nil {
		return nil, err
	}

	return &PublicOrderResponse{
		ID:            order.ID,
		Status:        order.Status,
		Total:         order.Total,
		CreatedAt:     order.CreatedAt,
		UpdatedAt:     order.UpdatedAt,
		PaymentMethod: order.PaymentMethod,
		Items:         items,
		Shop:          shop,
	}, nil
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
		if !isValidOrderStatus(nextStatus) {
			return nil, errors.Validation("status_invalid", "حالة الطلب غير صحيحة")
		}
		if !isValidTransition(order.Status, nextStatus) {
			return nil, errors.Validation("invalid_status_transition", "الانتقال بين الحالات غير مسموح")
		}
		// The expected-current-status guard closes the read-then-write race
		// where two concurrent transitions both validate against the stale
		// status and the last write silently won.
		updated, err = s.repo.UpdateStatus(ctx, id, nextStatus, req.Notes, &order.Status)
		if err != nil {
			return nil, err
		}
		if updated == nil {
			return nil, errors.Conflict("order_state_changed", "حالة الطلب تغيّرت للتو، حدّث الصفحة وأعد المحاولة")
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
		// READY must remain a legal transition — previously this flag
		// flipped ANY state (even DELIVERED) back to READY.
		if !isValidTransition(order.Status, OrderStatusReady) {
			return nil, errors.Conflict("order_state_changed", "حالة الطلب لا تسمح بتسليمه للمندوب")
		}
		updated, err = s.repo.UpdateStatus(ctx, id, OrderStatusReady, nil, &order.Status)
		if err != nil {
			return nil, err
		}
		if updated == nil {
			return nil, errors.Conflict("order_state_changed", "حالة الطلب تغيّرت للتو، حدّث الصفحة وأعد المحاولة")
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
		// The courier may only complete (DELIVERED) or cancel an order that
		// is still in flight — terminal states (DELIVERED / CANCELLED /
		// REFUNDED / RETURNED) can no longer be rewritten. Previously a
		// courier could CANCEL an already-DELIVERED order to dodge COD
		// liability.
		switch order.Status {
		case OrderStatusPending, OrderStatusConfirmed, OrderStatusPreparing, OrderStatusReady:
		default:
			return nil, errors.Conflict("order_state_changed", "لا يمكن تعديل طلب في هذه الحالة")
		}
		status = &s
	}

	updated, err := s.repo.CourierUpdate(ctx, id, status, req.CodCollected, &order.Status)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, errors.Conflict("order_state_changed", "حالة الطلب تغيّرت للتو، حدّث الصفحة وأعد المحاولة")
	}
	return updated, nil
}

func isValidTransition(current, next OrderStatus) bool {
	valid := map[OrderStatus][]OrderStatus{
		OrderStatusPending:   {OrderStatusConfirmed, OrderStatusCancelled, OrderStatusReturned},
		OrderStatusConfirmed: {OrderStatusPreparing, OrderStatusCancelled, OrderStatusReturned},
		OrderStatusPreparing: {OrderStatusReady, OrderStatusCancelled, OrderStatusReturned},
		OrderStatusReady:     {OrderStatusDelivered, OrderStatusCancelled, OrderStatusReturned},
		OrderStatusDelivered: {OrderStatusRefunded, OrderStatusReturned},
		OrderStatusCancelled: {},
		OrderStatusRefunded:  {},
		OrderStatusReturned:  {},
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
