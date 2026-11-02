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

	customerName := strings.TrimSpace(req.CustomerName)
	if customerName == "" {
		customerName = "زائر"
	}
	if len(customerName) > 120 {
		customerName = customerName[:120]
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

	var startAt, endAt *time.Time
	if req.BookingDate != "" {
		timePart := req.BookingTime
		if timePart == "" {
			timePart = "00:00"
		}
		t, err := time.Parse("2006-01-02 15:04", req.BookingDate+" "+timePart)
		if err == nil {
			startAt = &t
			end := t.Add(30 * time.Minute)
			endAt = &end
		}
	}

	// Check slot availability if serviceId and startAt provided
	if req.ServiceID != "" && startAt != nil {
		startTimeStr := startAt.Format("15:04")
		endTimeStr := ""
		if endAt != nil {
			endTimeStr = endAt.Format("15:04")
		}
		available, err := s.repo.CheckSlotAvailability(ctx, req.ServiceID, *startAt, startTimeStr, endTimeStr, "")
		if err != nil {
			return nil, err
		}
		if !available {
			return nil, errors.Validation("slot_unavailable", "الفترة الزمنية غير متاحة")
		}
		if req.ResourceID != "" {
			resAvailable, err := s.repo.CheckResourceAvailability(ctx, req.ResourceID, *startAt, startTimeStr, endTimeStr, "")
			if err != nil {
				return nil, err
			}
			if !resAvailable {
				return nil, errors.Validation("resource_unavailable", "المورد غير متاح")
			}
		}
	}

	// Ensure booking service
	serviceID, err := s.repo.EnsureBookingService(ctx, shopID, req.ServiceID, req.ItemName, itemPrice)
	if err != nil {
		return nil, err
	}

	// Ensure booking slot
	var slotID *string
	if startAt != nil {
		dateStr := startAt.Format("2006-01-02")
		startTimeStr := startAt.Format("15:04")
		endTimeStr := "23:59"
		if endAt != nil {
			endTimeStr = endAt.Format("15:04")
		}
		sid, err := s.repo.EnsureBookingSlot(ctx, serviceID, shopID, req.ResourceID, dateStr, startTimeStr, endTimeStr, participants)
		if err != nil {
			return nil, err
		}
		slotID = &sid
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
	if userID == nil {
		metadata["source"] = "guest"
	}

	var notes *string
	if strings.TrimSpace(req.Notes) != "" {
		n := strings.TrimSpace(req.Notes)
		if len(n) > 2000 {
			n = n[:2000]
		}
		notes = &n
	}

	var phonePtr *string
	if customerPhone != "" {
		phonePtr = &customerPhone
	}

	booking := &Booking{
		BookingNumber: BuildBookingNumber(),
		ServiceID:     serviceID,
		SlotID:        slotID,
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
		Status:        "PENDING",
		PaymentStatus: "PENDING",
		Notes:         notes,
	}

	// Store metadata as raw JSON
	metaBytes, _ := json.Marshal(metadata)
	booking.Metadata = metaBytes

	created, err := s.repo.Create(ctx, booking)
	if err != nil {
		return nil, err
	}

	resp := shapeBooking(*created)
	return &resp, nil
}

// ListByShop returns bookings for a shop.
func (s *Service) ListByShop(ctx context.Context, shopID string, page, limit int) ([]BookingResponse, error) {
	l, o := normalizePaging(page, limit)
	bookings, err := s.repo.ListByShop(ctx, shopID, l, o)
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

// CheckSlotAvailability checks if a slot is available.
func (s *Service) CheckSlotAvailability(ctx context.Context, serviceID, dateStr, startTime, endTime, excludeBookingID string) (*SlotAvailabilityResponse, error) {
	if serviceID == "" {
		return nil, errors.Validation("serviceId_required", "serviceId مطلوب")
	}
	d, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, errors.Validation("invalid_date", "تاريخ غير صحيح")
	}
	available, err := s.repo.CheckSlotAvailability(ctx, serviceID, d, startTime, endTime, excludeBookingID)
	if err != nil {
		return nil, err
	}
	if available {
		return &SlotAvailabilityResponse{Available: true}, nil
	}
	return &SlotAvailabilityResponse{Available: false, Reason: "الفترة الزمنية ممتلئة"}, nil
}

// CheckResourceAvailability checks if a resource is available.
func (s *Service) CheckResourceAvailability(ctx context.Context, resourceID, dateStr, startTime, endTime, excludeBookingID string) (*SlotAvailabilityResponse, error) {
	if resourceID == "" {
		return &SlotAvailabilityResponse{Available: true}, nil
	}
	d, err := time.Parse("2006-01-02", dateStr)
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

// GetAvailableSlots returns available time slots.
func (s *Service) GetAvailableSlots(ctx context.Context, serviceID, dateStr string, duration int) ([]AvailableSlot, error) {
	if serviceID == "" {
		return nil, errors.Validation("serviceId_required", "serviceId مطلوب")
	}
	d, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, errors.Validation("invalid_date", "تاريخ غير صحيح")
	}
	return s.repo.GetAvailableSlots(ctx, serviceID, d, duration)
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
		resp.BookingDate = b.StartAt.Format("2006-01-02")
		resp.BookingTime = b.StartAt.Format("15:04")
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
