package bookings

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the Bookings domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new bookings repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

const bookingColumns = `
	b.id, b.booking_number, b.service_id, b.slot_id, b.shop_id, b.user_id,
	b.customer_name, b.customer_phone, b.customer_email,
	b.start_at, b.end_at, b.participants, b.total_amount, b.currency,
	b.status, b.payment_status, b.notes, b.metadata,
	b.confirmed_at, b.completed_at, b.cancelled_at,
	b.created_at, b.updated_at
`

const bookingJoinColumns = `
	s.name AS service_name, s.price AS service_price,
	slt.date::text AS slot_date, slt.start_time AS slot_start_time, slt.end_time AS slot_end_time,
	sh.name AS shop_name
`

// FindByID returns a booking by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*Booking, error) {
	query := "SELECT " + bookingColumns + ", " + bookingJoinColumns + `
		FROM bookings b
		LEFT JOIN booking_services s ON s.id = b.service_id
		LEFT JOIN booking_slots slt ON slt.id = b.slot_id
		LEFT JOIN shops sh ON sh.id = b.shop_id
		WHERE b.id = $1 LIMIT 1
	`
	row := r.pool.QueryRow(ctx, query, id)
	return scanBooking(row)
}

// ListByShop returns bookings for a shop.
func (r *Repository) ListByShop(ctx context.Context, shopID string, limit, offset int) ([]Booking, error) {
	query := "SELECT " + bookingColumns + ", " + bookingJoinColumns + `
		FROM bookings b
		LEFT JOIN booking_services s ON s.id = b.service_id
		LEFT JOIN booking_slots slt ON slt.id = b.slot_id
		LEFT JOIN shops sh ON sh.id = b.shop_id
		WHERE b.shop_id = $1
		ORDER BY b.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, shopID, limit, offset)
	if err != nil {
		return nil, errors.Internal("list_bookings_failed", err)
	}
	defer rows.Close()
	return scanBookings(rows)
}

// ListByUserID returns bookings for a user.
func (r *Repository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]Booking, error) {
	query := "SELECT " + bookingColumns + ", " + bookingJoinColumns + `
		FROM bookings b
		LEFT JOIN booking_services s ON s.id = b.service_id
		LEFT JOIN booking_slots slt ON slt.id = b.slot_id
		LEFT JOIN shops sh ON sh.id = b.shop_id
		WHERE b.user_id = $1
		ORDER BY b.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, errors.Internal("list_user_bookings_failed", err)
	}
	defer rows.Close()
	return scanBookings(rows)
}

// Create inserts a new booking.
func (r *Repository) Create(ctx context.Context, b *Booking) (*Booking, error) {
	metadataJSON, _ := json.Marshal(b.Metadata)
	row := r.pool.QueryRow(ctx, `
		INSERT INTO bookings (
			booking_number, service_id, slot_id, shop_id, user_id,
			customer_name, customer_phone, customer_email,
			start_at, end_at, participants, total_amount, currency,
			status, payment_status, notes, metadata
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11, $12, $13,
			$14, $15, $16, $17
		) RETURNING `+bookingColumns,
		b.BookingNumber, b.ServiceID, b.SlotID, b.ShopID, b.UserID,
		b.CustomerName, b.CustomerPhone, b.CustomerEmail,
		b.StartAt, b.EndAt, b.Participants, b.TotalAmount, b.Currency,
		b.Status, b.PaymentStatus, b.Notes, metadataJSON,
	)
	return scanBooking(row)
}

// UpdateStatus updates booking status.
func (r *Repository) UpdateStatus(ctx context.Context, id, status string) (*Booking, error) {
	now := time.Now()
	var confirmedAt, completedAt, cancelledAt *time.Time
	switch status {
	case "CONFIRMED":
		confirmedAt = &now
	case "COMPLETED":
		completedAt = &now
	case "CANCELLED":
		cancelledAt = &now
	}
	row := r.pool.QueryRow(ctx, `
		UPDATE bookings SET
			status = $2,
			confirmed_at = COALESCE($3, confirmed_at),
			completed_at = COALESCE($4, completed_at),
			cancelled_at = COALESCE($5, cancelled_at),
			updated_at = NOW()
		WHERE id = $1 RETURNING `+bookingColumns, id, status, confirmedAt, completedAt, cancelledAt)
	return scanBooking(row)
}

// CheckSlotAvailability checks if a slot is available.
func (r *Repository) CheckSlotAvailability(ctx context.Context, serviceID string, date time.Time, startTime, endTime, excludeBookingID string) (bool, error) {
	dateStr := date.Format("2006-01-02")
	startAt, _ := time.Parse("2006-01-02 15:04", dateStr+" "+startTime)
	endAt, _ := time.Parse("2006-01-02 15:04", dateStr+" "+endTime)

	query := `
		SELECT COUNT(*) FROM bookings
		WHERE service_id = $1
		  AND status IN ('PENDING', 'CONFIRMED')
		  AND start_at < $3 AND end_at > $2
	`
	args := []any{serviceID, startAt, endAt}
	if excludeBookingID != "" {
		query += " AND id != $4"
		args = append(args, excludeBookingID)
	}
	var count int
	err := r.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return false, errors.Internal("check_slot_availability_failed", err)
	}
	return count == 0, nil
}

// CheckResourceAvailability checks if a resource is available.
func (r *Repository) CheckResourceAvailability(ctx context.Context, resourceID string, date time.Time, startTime, endTime, excludeBookingID string) (bool, error) {
	if resourceID == "" {
		return true, nil
	}
	dateStr := date.Format("2006-01-02")
	startAt, _ := time.Parse("2006-01-02 15:04", dateStr+" "+startTime)
	endAt, _ := time.Parse("2006-01-02 15:04", dateStr+" "+endTime)

	query := `
		SELECT COUNT(*) FROM bookings b
		JOIN booking_slots slt ON slt.id = b.slot_id
		WHERE slt.resource_id = $1
		  AND b.status IN ('PENDING', 'CONFIRMED')
		  AND b.start_at < $3 AND b.end_at > $2
	`
	args := []any{resourceID, startAt, endAt}
	if excludeBookingID != "" {
		query += " AND b.id != $4"
		args = append(args, excludeBookingID)
	}
	var count int
	err := r.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return false, errors.Internal("check_resource_availability_failed", err)
	}
	return count == 0, nil
}

// GetAvailableSlots returns available time slots for a service on a date.
func (r *Repository) GetAvailableSlots(ctx context.Context, serviceID string, date time.Time, durationMinutes int) ([]AvailableSlot, error) {
	if durationMinutes <= 0 {
		durationMinutes = 60
	}
	dateStr := date.Format("2006-01-02")
	dayStart, _ := time.Parse("2006-01-02 15:04", dateStr+" 09:00")
	dayEnd, _ := time.Parse("2006-01-02 15:04", dateStr+" 21:00")

	rows, err := r.pool.Query(ctx, `
		SELECT start_at, end_at FROM bookings
		WHERE service_id = $1 AND status IN ('PENDING', 'CONFIRMED')
		  AND start_at >= $2 AND start_at <= $3
		ORDER BY start_at ASC
	`, serviceID, dayStart, dayEnd)
	if err != nil {
		return nil, errors.Internal("get_available_slots_failed", err)
	}
	defer rows.Close()

	type bookedRange struct{ start, end time.Time }
	var booked []bookedRange
	for rows.Next() {
		var s, e time.Time
		if err := rows.Scan(&s, &e); err != nil {
			continue
		}
		booked = append(booked, bookedRange{s, e})
	}

	var slots []AvailableSlot
	for t := dayStart; t.Add(time.Duration(durationMinutes) * time.Minute).Before(dayEnd) || t.Add(time.Duration(durationMinutes)*time.Minute).Equal(dayEnd); t = t.Add(time.Duration(durationMinutes) * time.Minute) {
		slotEnd := t.Add(time.Duration(durationMinutes) * time.Minute)
		if slotEnd.After(dayEnd) {
			break
		}
		available := true
		for _, b := range booked {
			if t.Before(b.end) && slotEnd.After(b.start) {
				available = false
				break
			}
		}
		slots = append(slots, AvailableSlot{
			StartTime: t.Format("15:04"),
			EndTime:   slotEnd.Format("15:04"),
			Available: available,
		})
	}
	return slots, nil
}

// EnsureBookingService finds or creates a booking service.
func (r *Repository) EnsureBookingService(ctx context.Context, shopID, serviceID, itemName string, itemPrice float64) (string, error) {
	if serviceID != "" {
		var id string
		err := r.pool.QueryRow(ctx, "SELECT id FROM booking_services WHERE id = $1 AND shop_id = $2", serviceID, shopID).Scan(&id)
		if err == nil {
			return id, nil
		}
	}
	name := strings.TrimSpace(itemName)
	if name == "" {
		name = "حجز عام"
	}
	if len(name) > 160 {
		name = name[:160]
	}

	var existingID string
	err := r.pool.QueryRow(ctx, "SELECT id FROM booking_services WHERE shop_id = $1 AND name = $2 LIMIT 1", shopID, name).Scan(&existingID)
	if err == nil {
		return existingID, nil
	}

	// Ensure default category
	var categoryID string
	err = r.pool.QueryRow(ctx, "SELECT id FROM booking_categories WHERE type = 'OTHER' AND is_active = true LIMIT 1").Scan(&categoryID)
	if err != nil {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO booking_categories (shop_id, name, name_ar, type, description, icon)
			VALUES ($1, 'General Bookings', 'حجوزات عامة', 'OTHER', 'تصنيف تلقائي', 'CalendarCheck')
			RETURNING id
		`, shopID).Scan(&categoryID)
		if err != nil {
			return "", errors.Internal("ensure_booking_category_failed", err)
		}
	}

	err = r.pool.QueryRow(ctx, `
		INSERT INTO booking_services (shop_id, category_id, name, name_ar, description, duration_minutes, price, currency, capacity)
		VALUES ($1, $2, $3, $3, 'تم إنشاؤها تلقائياً من لوحة الحجوزات', 30, $4, 'EGP', 1)
		RETURNING id
	`, shopID, categoryID, name, itemPrice).Scan(&existingID)
	if err != nil {
		return "", errors.Internal("create_booking_service_failed", err)
	}
	return existingID, nil
}

// EnsureBookingSlot finds or creates a booking slot.
func (r *Repository) EnsureBookingSlot(ctx context.Context, serviceID, shopID, resourceID, dateStr, startTime, endTime string, participants int) (string, error) {
	startAt, _ := time.Parse("2006-01-02 15:04", dateStr+" "+startTime)
	endAt, _ := time.Parse("2006-01-02 15:04", dateStr+" "+endTime)

	var slotID string
	err := r.pool.QueryRow(ctx, `
		INSERT INTO booking_slots (service_id, shop_id, resource_id, date, start_time, end_time, start_at, end_at, status, max_capacity, current_bookings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'BOOKED', $9, $9)
		RETURNING id
	`, serviceID, nullableStr(shopID), nullableStr(resourceID), dateStr, startTime, endTime, startAt, endAt, participants).Scan(&slotID)
	if err != nil {
		return "", errors.Internal("create_booking_slot_failed", err)
	}
	return slotID, nil
}

func scanBooking(row pgx.Row) (*Booking, error) {
	var b Booking
	var slotID, userID, customerPhone, notes sql.NullString
	var startAt, endAt, confirmedAt, completedAt, cancelledAt sql.NullTime
	var metadata []byte
	var serviceName, shopName sql.NullString
	var servicePrice sql.NullFloat64
	var slotDate, slotStartTime, slotEndTime sql.NullString

	err := row.Scan(
		&b.ID, &b.BookingNumber, &b.ServiceID, &slotID, &b.ShopID, &userID,
		&b.CustomerName, &customerPhone, &b.CustomerEmail,
		&startAt, &endAt, &b.Participants, &b.TotalAmount, &b.Currency,
		&b.Status, &b.PaymentStatus, &notes, &metadata,
		&confirmedAt, &completedAt, &cancelledAt,
		&b.CreatedAt, &b.UpdatedAt,
		&serviceName, &servicePrice, &slotDate, &slotStartTime, &slotEndTime, &shopName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_booking_failed", err)
	}

	b.SlotID = nullStringPtr(slotID)
	b.UserID = nullStringPtr(userID)
	b.CustomerPhone = nullStringPtr(customerPhone)
	b.Notes = nullStringPtr(notes)
	b.Metadata = metadata
	b.StartAt = nullTimePtr(startAt)
	b.EndAt = nullTimePtr(endAt)
	b.ConfirmedAt = nullTimePtr(confirmedAt)
	b.CompletedAt = nullTimePtr(completedAt)
	b.CancelledAt = nullTimePtr(cancelledAt)
	b.ServiceName = serviceName.String
	b.ServicePrice = servicePrice.Float64
	b.ShopName = shopName.String
	if slotDate.Valid {
		b.SlotDate = &slotDate.String
	}
	if slotStartTime.Valid {
		b.SlotStartTime = &slotStartTime.String
	}
	if slotEndTime.Valid {
		b.SlotEndTime = &slotEndTime.String
	}
	return &b, nil
}

func scanBookings(rows pgx.Rows) ([]Booking, error) {
	var bookings []Booking
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			return nil, err
		}
		if b != nil {
			bookings = append(bookings, *b)
		}
	}
	return bookings, rows.Err()
}

func nullStringPtr(s sql.NullString) *string {
	if !s.Valid || s.String == "" {
		return nil
	}
	return &s.String
}

func nullTimePtr(t sql.NullTime) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

func nullableStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// BuildBookingNumber generates a unique booking number.
func BuildBookingNumber() string {
	stamp := time.Now().UTC().Format("20060102150405")
	return fmt.Sprintf("BK-%s-%04d", stamp, time.Now().Nanosecond()%10000)
}
