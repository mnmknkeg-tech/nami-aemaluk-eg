package bookings

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/compression"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
)

// Service implements the Bookings domain business logic.
type Service struct {
	repo        *Repository
	compression *compression.Service
}

// NewService creates a new bookings service.
func NewService(repo *Repository, compressionSvc *compression.Service) *Service {
	return &Service{repo: repo, compression: compressionSvc}
}

// CreateForGuest creates a booking for a guest user.
func (s *Service) CreateForGuest(ctx context.Context, req CreateBookingRequest) (*BookingResponse, error) {
	return s.create(ctx, req, nil)
}

// CreateForUser creates a booking for an authenticated user.
func (s *Service) CreateForUser(ctx context.Context, req CreateBookingRequest, userID string) (*BookingResponse, error) {
	return s.create(ctx, req, &userID)
}

func (s *Service) create(ctx context.Context, req CreateBookingRequest, userID *string) (*BookingResponse, error) {
	shopID := strings.TrimSpace(req.ShopID)
	if shopID == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}

	// Reject unknown shops with a clean 404 — otherwise the insert dies later
	// on the booking_services FK with an opaque HTTP 500.
	shopExists, err := s.repo.ShopExists(ctx, shopID)
	if err != nil {
		return nil, err
	}
	if !shopExists {
		return nil, errors.NotFound("shop", shopID)
	}

	customerName := truncateRunes(strings.TrimSpace(req.CustomerName), 120)
	if customerName == "" {
		customerName = "زائر"
	}

	customerPhone := strings.TrimSpace(req.CustomerPhone)
	if customerPhone != "" && !isValidPhone(customerPhone) {
		return nil, errors.Validation("invalid_phone", "customerPhone غير صحيح")
	}

	itemPrice := req.ItemPrice
	if itemPrice < 0 {
		itemPrice = 0
	}
	participants := req.Participants
	if participants < 1 {
		participants = 1
	}
	if participants > 999 {
		participants = 999
	}

	settings, err := s.repo.GetShopBookingSettings(ctx, shopID)
	if err != nil {
		return nil, err
	}

	// Resolve the real bookable service behind this booking. A catalog product
	// (item id) provisioned a booking service with its own duration/price —
	// reuse it instead of minting a generic 30-minute “حجز عام” service.
	durationMinutes := 0
	var linkedProduct string
	if req.ServiceID == "" && req.ItemID != "" {
		if linked, lerr := s.repo.FindServiceIDByProduct(ctx, shopID, req.ItemID); lerr == nil && linked != "" {
			req.ServiceID = linked
			linkedProduct = req.ItemID
		} else {
			// First booking for this product — provision from the catalog row.
			if name, price, prodDur, _, perr := s.repo.GetProductBookingInfo(ctx, shopID, req.ItemID); perr == nil {
				linkedProduct = req.ItemID
				if req.ItemName == "" {
					req.ItemName = name
				}
				if itemPrice == 0 && price > 0 {
					itemPrice = price
				}
				durationMinutes = prodDur
			}
		}
	}

	// Ensure the booking service FIRST so the availability window below always
	// runs against the final service id (product-linked bookings used to skip
	// the conflict check entirely because ServiceID was still empty here).
	serviceID, err := s.repo.ensureBookingService(ctx, ensureServiceParams{
		ShopID: shopID, ServiceID: req.ServiceID, ItemID: linkedProduct,
		ItemName: req.ItemName, ItemPrice: itemPrice,
		DurationMinutes: durationMinutes,
	})
	if err != nil {
		return nil, err
	}
	req.ServiceID = serviceID

	// The service row is the single source of truth for duration and price —
	// the client-supplied itemPrice is only a provisioning hint. This stops
	// price tampering (guest sends itemPrice=1 for a 1000 EGP service).
	if svc, serr := s.repo.GetService(ctx, serviceID); serr == nil && svc != nil {
		if svc.DurationMinutes > 0 {
			durationMinutes = svc.DurationMinutes
		}
		if svc.Price > 0 {
			itemPrice = svc.Price
		}
	}
	if durationMinutes <= 0 {
		durationMinutes = settings.SlotDuration
	}
	if durationMinutes <= 0 {
		durationMinutes = 30
	}

	var startAt, endAt *time.Time
	if req.BookingDate != "" {
		timePart := req.BookingTime
		if timePart == "" {
			timePart = "00:00"
		}
		if t, perr := CairoWallClock(req.BookingDate, timePart); perr == nil {
			startAt = &t
			end := t.Add(time.Duration(durationMinutes) * time.Minute)
			endAt = &end
		}
	}

	// Time-window rules — previously only reschedule enforced them, so the
	// guest API happily booked yesterday 03:00 or times outside work hours.
	if startAt != nil {
		if startAt.Before(time.Now()) {
			return nil, errors.Validation("past_time", "لا يمكن الحجز في وقت في الماضي")
		}
		if ws, werr := CairoWallClock(req.BookingDate, settings.WorkStart); werr == nil && startAt.Before(ws) {
			return nil, errors.Validation("outside_work_hours", "الوقت قبل ساعة بدء استقبال المواعيد")
		}
		if endAt != nil {
			if we, werr := CairoWallClock(req.BookingDate, settings.WorkEnd); werr == nil && endAt.After(we) {
				return nil, errors.Validation("outside_work_hours", "الوقت بعد ساعة نهاية استقبال المواعيد")
			}
		}
		if settings.AdvanceDays > 0 && CairoDayStartOf(*startAt).After(CairoDayStartOf(time.Now()).AddDate(0, 0, settings.AdvanceDays)) {
			return nil, errors.Validation("beyond_advance_window", "التاريخ أبعد من نافذة الحجز المسبق")
		}
		if req.ResourceID != "" {
			endTimeStr := ""
			if endAt != nil {
				endTimeStr = FormatCairoClock(*endAt)
			}
			resAvailable, rerr := s.repo.CheckResourceAvailability(ctx, req.ResourceID, *startAt, FormatCairoClock(*startAt), endTimeStr, "")
			if rerr != nil {
				return nil, rerr
			}
			if !resAvailable {
				return nil, errors.Validation("resource_unavailable", "المورد غير متاح")
			}
		}
	}

	// Build metadata
	metadata := map[string]any{}
	if req.Metadata != nil {
		metadata = req.Metadata
	}
	metadata["itemId"] = req.ItemID
	metadata["itemName"] = req.ItemName
	itemImage := req.ItemImage
	// Compress item image for booking use
	if itemImage != "" && s.compression != nil {
		itemImage = s.compression.GetCompressedURL(req.ItemImage, compression.QualityMedium)
	}
	metadata["itemImage"] = itemImage
	if req.BookingActivityType != "" {
		metadata["bookingActivityType"] = req.BookingActivityType
	}
	if req.BookingActivityRoute != "" {
		metadata["bookingActivityRoute"] = req.BookingActivityRoute
	}
	if req.Addons != nil {
		metadata["addons"] = req.Addons
	}
	if req.VariantSelection != nil {
		metadata["variantSelection"] = req.VariantSelection
	}
	if linkedProduct != "" {
		metadata["productId"] = linkedProduct
	}
	if userID == nil {
		metadata["source"] = "guest"
	}

	var notes *string
	if strings.TrimSpace(req.Notes) != "" {
		n := truncateRunes(strings.TrimSpace(req.Notes), 2000)
		notes = &n
	}

	var phonePtr *string
	if customerPhone != "" {
		phonePtr = &customerPhone
	}

	status := "PENDING"
	if settings.AutoConfirm {
		status = "CONFIRMED"
	}
	booking := &Booking{
		BookingNumber: BuildBookingNumber(),
		ServiceID:     serviceID,
		ShopID:        shopID,
		UserID:        userID,
		CustomerName:  customerName,
		CustomerPhone: phonePtr,
		CustomerEmail: strings.TrimSpace(req.CustomerEmail),
		StartAt:       startAt,
		EndAt:         endAt,
		Participants:  participants,
		TotalAmount:   itemPrice * float64(participants),
		Currency:      "EGP",
		Status:        status,
		PaymentStatus: "PENDING",
		Notes:         notes,
	}

	// Store metadata as raw JSON
	metaBytes, _ := json.Marshal(metadata)
	booking.Metadata = metaBytes

	// Timed bookings go through the guarded insert: per-service advisory lock
	// + MaxPerSlot cap + duplicate guard + slot row, all in one transaction —
	// closing the check-then-insert double-booking race. QUOTE bookings (no
	// concrete window) have nothing to guard.
	var created *Booking
	if startAt != nil {
		created, err = s.repo.CreateGuarded(ctx, guardedCreateParams{
			Booking:           booking,
			ResourceID:        req.ResourceID,
			MaxPerSlot:        settings.MaxPerSlot,
			PreventDuplicates: settings.PreventDuplicates,
		})
	} else {
		created, err = s.repo.Create(ctx, booking)
	}
	if err != nil {
		return nil, err
	}

	resp := shapeBooking(*created)
	return &resp, nil
}

// ListByShop returns bookings for a shop, optionally filtered by Cairo date
// range / status with explicit ordering (dashboard agenda source).
func (s *Service) ListByShop(ctx context.Context, shopID string, page, limit int, filter *BookingListFilter) ([]BookingResponse, error) {
	l, o := normalizePaging(page, limit)
	bookings, err := s.repo.ListByShop(ctx, shopID, l, o, filter)
	if err != nil {
		return nil, err
	}
	return shapeBookings(bookings), nil
}

// ListByUserID returns bookings for a user.
func (s *Service) ListByUserID(ctx context.Context, userID string, page, limit int) ([]BookingResponse, error) {
	l, o := normalizePaging(page, limit)
	bookings, err := s.repo.ListByUserID(ctx, userID, l, o)
	if err != nil {
		return nil, err
	}
	return shapeBookings(bookings), nil
}

// bookingTransitions defines the legal status lifecycle. Previously any status
// could jump to any other (CONFIRMED→PENDING, reviving CANCELLED bookings…),
// which corrupted merchant reporting. NO_SHOW can be undone (customer arrived
// late after all); COMPLETED and CANCELLED are terminal.
var bookingTransitions = map[string]map[string]bool{
	"PENDING":   {"CONFIRMED": true, "COMPLETED": true, "CANCELLED": true, "NO_SHOW": true},
	"CONFIRMED": {"COMPLETED": true, "CANCELLED": true, "NO_SHOW": true},
	"NO_SHOW":   {"CONFIRMED": true, "CANCELLED": true},
	"COMPLETED": {},
	"CANCELLED": {},
}

// UpdateStatus updates a booking's status.
func (s *Service) UpdateStatus(ctx context.Context, id, status, actorRole, actorShopID string) (*BookingResponse, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	normalized := normalizeBookingStatus(status)
	if normalized == "" {
		return nil, errors.Validation("invalid_status", "حالة غير مدعومة")
	}

	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, errors.NotFound("booking", id)
	}

	if !isAdmin(actorRole) && actorShopID != existing.ShopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}

	// Enforce the status lifecycle (legacy rows with unknown statuses skip
	// the check). A no-op same-status update is also rejected.
	if allowed, known := bookingTransitions[existing.Status]; known {
		if !allowed[normalized] {
			return nil, errors.Validation("invalid_status_transition",
				"لا يمكن نقل الحجز من حالة "+existing.Status+" إلى "+normalized)
		}
	}

	updated, err := s.repo.UpdateStatus(ctx, id, normalized)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, errors.NotFound("booking", id)
	}
	resp := shapeBooking(*updated)
	return &resp, nil
}

// Reschedule moves a booking to a new Cairo wall-clock time. Merchants only:
// the new slot must sit inside the shop's work hours and stay conflict-free.
func (s *Service) Reschedule(ctx context.Context, id, bookingDate, bookingTime, actorRole, actorShopID string) (*BookingResponse, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	if bookingDate == "" || bookingTime == "" {
		return nil, errors.Validation("date_time_required", "التاريخ والوقت مطلوبان")
	}
	newStart, err := CairoWallClock(bookingDate, bookingTime)
	if err != nil {
		return nil, errors.Validation("invalid_date_time", "تاريخ أو وقت غير صحيح")
	}
	if newStart.Before(time.Now()) {
		return nil, errors.Validation("past_time", "لا يمكن نقل الموعد إلى وقت في الماضي")
	}

	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, errors.NotFound("booking", id)
	}
	if !isAdmin(actorRole) && actorShopID != existing.ShopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	if existing.Status == "CANCELLED" {
		return nil, errors.Validation("cancelled_booking", "لا يمكن تعديل حجز ملغي")
	}

	settings, err := s.repo.GetShopBookingSettings(ctx, existing.ShopID)
	if err != nil {
		return nil, err
	}

	// Duration: keep the original window length when present, otherwise the
	// service/settings duration.
	duration := settings.SlotDuration
	if existing.StartAt != nil && existing.EndAt != nil {
		duration = int(existing.EndAt.Sub(*existing.StartAt).Minutes())
		if duration <= 0 {
			duration = settings.SlotDuration
		}
	}
	if duration <= 0 {
		duration = 30
	}
	newEnd := newStart.Add(time.Duration(duration) * time.Minute)

	// Work-hours window check (Cairo wall clock).
	if ws, err := CairoWallClock(bookingDate, settings.WorkStart); err == nil && newStart.Before(ws) {
		return nil, errors.Validation("outside_work_hours", "الوقت قبل ساعة بدء استقبال المواعيد")
	}
	if we, err := CairoWallClock(bookingDate, settings.WorkEnd); err == nil && newEnd.After(we) {
		return nil, errors.Validation("outside_work_hours", "الوقت بعد ساعة نهاية استقبال المواعيد")
	}
	// Advance-window check.
	todayStart := CairoDayStartOf(time.Now())
	if settings.AdvanceDays > 0 && CairoDayStartOf(newStart).After(todayStart.AddDate(0, 0, settings.AdvanceDays)) {
		return nil, errors.Validation("beyond_advance_window", "التاريخ أبعد من نافذة الحجز المسبق")
	}
	// Conflict check against other bookings on the same service.
	count, err := s.repo.CountOverlappingBookings(ctx, existing.ServiceID, newStart, newEnd, id)
	if err != nil {
		return nil, err
	}
	maxPer := settings.MaxPerSlot
	if maxPer < 1 {
		maxPer = 1
	}
	if count >= maxPer {
		return nil, errors.Validation("slot_unavailable", "الفترة الزمنية غير متاحة")
	}

	updated, err := s.repo.Reschedule(ctx, id, newStart, newEnd)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, errors.NotFound("booking", id)
	}
	resp := shapeBooking(*updated)
	return &resp, nil
}

// ---------------------------------------------------------------------------
// Public (no-auth) storefront APIs — services, slots and lookup by number.
// ---------------------------------------------------------------------------

// PublicListServicesBySlug exposes the published shop's active bookable
// services plus its booking settings — the public booking page data source.
// When productID is given, the result narrows to that product's linked
// service; a bookable product with no service yet gets one provisioned on
// the fly so marketplace modals always see real availability data.
func (s *Service) PublicListServicesBySlug(ctx context.Context, slug, productID string) (map[string]any, error) {
	shopID, shopName, services, err := s.repo.ListPublicServicesByShopSlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if productID != "" {
		services = s.servicesForProduct(ctx, shopID, productID, services)
	}
	settings, err := s.repo.GetShopBookingSettings(ctx, shopID)
	if err != nil {
		return nil, err
	}
	out := make([]PublicBookingServiceResponse, 0, len(services))
	for _, svc := range services {
		desc := ""
		if svc.Description != nil {
			desc = *svc.Description
		}
		out = append(out, PublicBookingServiceResponse{
			ID: svc.ID, Name: svc.Name, Description: desc,
			DurationMinutes: svc.DurationMinutes, Price: svc.Price,
			Currency: svc.Currency, Capacity: svc.Capacity, ProductID: svc.ProductID,
		})
	}
	return map[string]any{
		"shopId":   shopID,
		"shopName": shopName,
		"services": out,
		"settings": map[string]any{
			"workStart":         settings.WorkStart,
			"workEnd":           settings.WorkEnd,
			"slotDuration":      settings.SlotDuration,
			"advanceDays":       settings.AdvanceDays,
			"maxPerSlot":        settings.MaxPerSlot,
			"bookingShowPrices": true,
		},
	}, nil
}

// servicesForProduct narrows the public service list to the service linked to
// a catalog product, provisioning one on demand when the product is bookable
// but was never booked before (product.extraData → booking_services).
func (s *Service) servicesForProduct(ctx context.Context, shopID, productID string, services []BookingService) []BookingService {
	matched := make([]BookingService, 0, 1)
	for _, svc := range services {
		if svc.ProductID == productID {
			matched = append(matched, svc)
		}
	}
	if len(matched) > 0 {
		return matched
	}
	name, price, duration, capacity, bookable, err := s.repo.GetBookableProductForService(ctx, shopID, productID)
	if err != nil || !bookable {
		return nil
	}
	serviceID, err := s.repo.ensureBookingService(ctx, ensureServiceParams{
		ShopID: shopID, ItemID: productID,
		ItemName: name, ItemPrice: price,
		DurationMinutes: duration, Capacity: capacity,
	})
	if err != nil {
		return nil
	}
	svc, err := s.repo.GetService(ctx, serviceID)
	if err != nil || svc == nil {
		return nil
	}
	return []BookingService{*svc}
}

// PublicAvailableSlots returns the bookable slots for one service on a date
// (Cairo wall clock). No auth: visitors must see real availability up front.
func (s *Service) PublicAvailableSlots(ctx context.Context, serviceID, dateStr string, duration int) ([]AvailableSlot, error) {
	if serviceID == "" {
		return nil, errors.Validation("serviceId_required", "serviceId مطلوب")
	}
	svc, err := s.repo.GetService(ctx, serviceID)
	if err != nil {
		return nil, err
	}
	if svc == nil || !svc.IsActive {
		return nil, errors.NotFound("service", serviceID)
	}
	date, err := CairoDayStart(dateStr)
	if err != nil {
		return nil, errors.Validation("invalid_date", "تاريخ غير صحيح")
	}
	settings, err := s.repo.GetShopBookingSettings(ctx, svc.ShopID)
	if err != nil {
		return nil, err
	}
	if duration <= 0 && svc.DurationMinutes > 0 {
		duration = svc.DurationMinutes
	}
	return s.repo.GetAvailableSlots(ctx, serviceID, date, duration, settings)
}

// PublicLookup finds one booking by its public number (BK-…), optionally
// verifying the customer phone. It returns a limited guest-safe projection.
func (s *Service) PublicLookup(ctx context.Context, number, phone string) (*PublicBookingLookupResponse, error) {
	number = strings.TrimSpace(number)
	if number == "" {
		return nil, errors.Validation("number_required", "رقم الحجز مطلوب")
	}
	booking, err := s.repo.FindBookingByNumber(ctx, number)
	if err != nil {
		return nil, err
	}
	if booking == nil {
		return nil, errors.NotFound("booking", number)
	}
	if phone = strings.TrimSpace(phone); phone != "" {
		if booking.CustomerPhone == nil || !phonesMatch(phone, *booking.CustomerPhone) {
			return nil, errors.Forbidden("phone_mismatch", "رقم الهاتف لا يطابق الحجز")
		}
	}
	resp := &PublicBookingLookupResponse{
		BookingNumber: booking.BookingNumber,
		Status:        booking.Status,
		ServiceName:   booking.ServiceName,
		ShopName:      booking.ShopName,
		CreatedAt:     booking.CreatedAt,
	}
	if booking.StartAt != nil {
		resp.BookingDate = FormatCairoDate(*booking.StartAt)
		resp.BookingTime = FormatCairoClock(*booking.StartAt)
	}
	return resp, nil
}

// phonesMatch compares two phone numbers by their digit tails so "+201234…",
// "01234…" and "201234…" all match the same customer.
func phonesMatch(a, b string) bool {
	digits := func(s string) string {
		var sb strings.Builder
		for _, c := range s {
			if c >= '0' && c <= '9' {
				sb.WriteRune(c)
			}
		}
		return sb.String()
	}
	da, db := digits(a), digits(b)
	if len(da) == 0 || len(db) == 0 {
		return false
	}
	// Compare the last 9 digits (Egyptian national number length).
	cut := 9
	if len(da) < cut {
		cut = len(da)
	}
	if len(db) < cut {
		cut = len(db)
	}
	return da[len(da)-cut:] == db[len(db)-cut:]
}

// ---------------------------------------------------------------------------
// Booking services — merchant CRUD façade over the repository.
// ---------------------------------------------------------------------------

// ListServices returns a shop's bookable services.
func (s *Service) ListServices(ctx context.Context, shopID string, includeInactive bool) ([]BookingService, error) {
	return s.repo.ListServicesByShop(ctx, shopID, includeInactive)
}

// CreateService adds a bookable service to the merchant's shop.
func (s *Service) CreateService(ctx context.Context, shopID string, req CreateBookingServiceRequest) (*BookingService, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.Validation("name_required", "اسم الخدمة مطلوب")
	}
	return s.repo.CreateService(ctx, shopID, req)
}

// UpdateService edits a bookable service after verifying ownership.
func (s *Service) UpdateService(ctx context.Context, id string, req UpdateBookingServiceRequest, actorRole, actorShopID string) (*BookingService, error) {
	svc, err := s.repo.GetService(ctx, id)
	if err != nil {
		return nil, err
	}
	if svc == nil {
		return nil, errors.NotFound("service", id)
	}
	if !isAdmin(actorRole) && actorShopID != svc.ShopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	return s.repo.UpdateService(ctx, id, req)
}

// DeactivateService soft-deletes a bookable service after verifying ownership.
func (s *Service) DeactivateService(ctx context.Context, id string, actorRole, actorShopID string) (*BookingService, error) {
	svc, err := s.repo.GetService(ctx, id)
	if err != nil {
		return nil, err
	}
	if svc == nil {
		return nil, errors.NotFound("service", id)
	}
	if !isAdmin(actorRole) && actorShopID != svc.ShopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	return s.repo.DeactivateService(ctx, id)
}

// CheckResourceAvailability checks if a resource is available.
func (s *Service) CheckResourceAvailability(ctx context.Context, resourceID, dateStr, startTime, endTime, excludeBookingID string) (*SlotAvailabilityResponse, error) {
	if resourceID == "" {
		return &SlotAvailabilityResponse{Available: true}, nil
	}
	d, err := CairoDayStart(dateStr)
	if err != nil {
		return nil, errors.Validation("invalid_date", "تاريخ غير صحيح")
	}
	available, err := s.repo.CheckResourceAvailability(ctx, resourceID, d, startTime, endTime, excludeBookingID)
	if err != nil {
		return nil, err
	}
	if available {
		return &SlotAvailabilityResponse{Available: true}, nil
	}
	return &SlotAvailabilityResponse{Available: false, Reason: "المورد غير متاح في هذا الوقت"}, nil
}

// CheckSlotAvailability checks if a single slot is available. Honors the
// merchant's MaxPerSlot cap (it previously hard-required an empty slot, so
// the public page offered slots the create endpoint then rejected) and
// validates inputs instead of silently parsing empty times into zero dates.
func (s *Service) CheckSlotAvailability(ctx context.Context, serviceID, dateStr, startTime, endTime, excludeBookingID string) (*SlotAvailabilityResponse, error) {
	if serviceID == "" {
		return nil, errors.Validation("serviceId_required", "serviceId مطلوب")
	}
	if strings.TrimSpace(startTime) == "" || strings.TrimSpace(endTime) == "" {
		return nil, errors.Validation("start_time_end_time_required", "startTime و endTime مطلوبان")
	}
	if _, err := CairoDayStart(dateStr); err != nil {
		return nil, errors.Validation("invalid_date", "تاريخ غير صحيح")
	}
	svc, err := s.repo.GetService(ctx, serviceID)
	if err != nil {
		return nil, err
	}
	if svc == nil {
		return nil, errors.NotFound("service", serviceID)
	}
	settings, err := s.repo.GetShopBookingSettings(ctx, svc.ShopID)
	if err != nil {
		return nil, err
	}
	startAt, err := CairoWallClock(dateStr, startTime)
	if err != nil {
		return nil, errors.Validation("invalid_time", "وقت غير صحيح")
	}
	endAt, err := CairoWallClock(dateStr, endTime)
	if err != nil {
		return nil, errors.Validation("invalid_time", "وقت غير صحيح")
	}
	count, err := s.repo.CountOverlappingBookings(ctx, serviceID, startAt, endAt, excludeBookingID)
	if err != nil {
		return nil, err
	}
	maxPer := settings.MaxPerSlot
	if maxPer < 1 {
		maxPer = 1
	}
	if count < maxPer {
		return &SlotAvailabilityResponse{Available: true}, nil
	}
	return &SlotAvailabilityResponse{Available: false, Reason: "الفترة الزمنية ممتلئة"}, nil
}

// GetAvailableSlots returns available time slots — dashboard availability view.
// Interpreted in Cairo wall clock with the shop's work-hour settings applied.
func (s *Service) GetAvailableSlots(ctx context.Context, serviceID, dateStr string, duration int) ([]AvailableSlot, error) {
	if serviceID == "" {
		return nil, errors.Validation("serviceId_required", "serviceId مطلوب")
	}
	svc, err := s.repo.GetService(ctx, serviceID)
	if err != nil {
		return nil, err
	}
	if svc == nil {
		return nil, errors.NotFound("service", serviceID)
	}
	d, err := CairoDayStart(dateStr)
	if err != nil {
		return nil, errors.Validation("invalid_date", "تاريخ غير صحيح")
	}
	settings, err := s.repo.GetShopBookingSettings(ctx, svc.ShopID)
	if err != nil {
		return nil, err
	}
	if duration <= 0 && svc.DurationMinutes > 0 {
		duration = svc.DurationMinutes
	}
	return s.repo.GetAvailableSlots(ctx, serviceID, d, duration, settings)
}

func normalizePaging(page, limit int) (int, int) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}
	return limit, (page - 1) * limit
}

func isAdmin(role string) bool {
	return strings.EqualFold(role, "ADMIN")
}

func isValidPhone(phone string) bool {
	cleaned := strings.ReplaceAll(phone, " ", "")
	if len(cleaned) < 6 || len(cleaned) > 32 {
		return false
	}
	if !strings.HasPrefix(cleaned, "+") {
		cleaned = "+" + cleaned
	}
	for i, c := range cleaned[1:] {
		_ = i
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func shapeBookings(bookings []Booking) []BookingResponse {
	out := make([]BookingResponse, len(bookings))
	for i, b := range bookings {
		out[i] = shapeBooking(b)
	}
	return out
}

func shapeBooking(b Booking) BookingResponse {
	resp := BookingResponse{
		ID:            b.ID,
		BookingNumber: b.BookingNumber,
		ShopID:        b.ShopID,
		ItemID:        b.ServiceID,
		ItemName:      b.ServiceName,
		ItemPrice:     b.ServicePrice,
		CustomerName:  b.CustomerName,
		CustomerEmail: b.CustomerEmail,
		Participants:  b.Participants,
		TotalAmount:   b.TotalAmount,
		Currency:      b.Currency,
		Status:        b.Status,
		CreatedAt:     b.CreatedAt,
	}
	if b.CustomerPhone != nil {
		resp.CustomerPhone = *b.CustomerPhone
	}
	if b.Notes != nil {
		resp.Notes = *b.Notes
	}
	if b.StartAt != nil {
		resp.BookingDate = FormatCairoDate(*b.StartAt)
		resp.BookingTime = FormatCairoClock(*b.StartAt)
		st := b.StartAt.Format(time.RFC3339)
		resp.StartTime = &st
	}
	if b.EndAt != nil {
		et := b.EndAt.Format(time.RFC3339)
		resp.EndTime = &et
	}

	// Extract metadata fields
	if len(b.Metadata) > 0 {
		var meta map[string]any
		if json.Unmarshal(b.Metadata, &meta) == nil {
			if v, ok := meta["itemId"].(string); ok {
				resp.ItemID = v
			}
			if v, ok := meta["itemName"].(string); ok && v != "" {
				resp.ItemName = v
			}
			if v, ok := meta["itemImage"].(string); ok {
				resp.ItemImage = v
			}
			if v, ok := meta["bookingActivityType"].(string); ok {
				resp.BookingActivityType = &v
			}
			if v, ok := meta["bookingActivityRoute"].(string); ok {
				resp.BookingActivityRoute = &v
			}
		}
	}
	if resp.ItemName == "" {
		resp.ItemName = "حجز"
	}
	return resp
}
