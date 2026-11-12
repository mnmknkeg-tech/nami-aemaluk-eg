package bookings

import (
	"context"
	crand "crypto/rand"
	"database/sql"
	"encoding/binary"
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
        b.id, COALESCE(b.booking_number, ''), COALESCE(b.service_id, ''), b.slot_id, b.shop_id, b.user_id,
        b.customer_name, b.customer_phone, COALESCE(b.customer_email, ''),
        b.start_at, b.end_at, b.participants, b.total_amount, b.currency,
        b.status, b.payment_status, b.notes, b.metadata,
        b.confirmed_at, b.completed_at, b.cancelled_at,
        b.created_at, b.updated_at
`

const bookingJoinColumns = `
        s.name AS service_name, s.price AS service_price,
        slt.start_at::date::text AS slot_date, to_char(slt.start_at, 'HH24:MI') AS slot_start_time, to_char(slt.end_at, 'HH24:MI') AS slot_end_time,
        sh.name AS shop_name
`

// INSERT/UPDATE RETURNING has no table alias and no joined rows. Keep the same
// scan shape by returning unqualified columns plus typed NULL join placeholders.
var bookingReturningColumns = strings.ReplaceAll(bookingColumns, "b.", "")

const bookingReturningJoins = `, NULL::text, NULL::double precision, NULL::text, NULL::text, NULL::text, NULL::text`

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

// FindUserShopID resolves the shop linked to a user account: users.shop_id
// first, then the latest shop they own. The fallback matters because access
// tokens minted during signup carry no shopId claim — the shop only exists
// after the onboarding wizard runs — so booking creation must re-resolve it
// server-side instead of failing with a validator dump.
func (r *Repository) FindUserShopID(ctx context.Context, userID string) (string, error) {
	const query = `
		SELECT COALESCE(
			NULLIF((SELECT shop_id FROM users WHERE id = $1), ''),
			(SELECT id FROM shops WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 1),
			''
		)
	`
	var shopID string
	if err := r.pool.QueryRow(ctx, query, userID).Scan(&shopID); err != nil {
		return "", err
	}
	return shopID, nil
}

// ListByShop returns bookings for a shop, optionally narrowed by a Cairo
// date range (from/to inclusive), status and ordering.
func (r *Repository) ListByShop(ctx context.Context, shopID string, limit, offset int, filter *BookingListFilter) ([]Booking, error) {
	query := "SELECT " + bookingColumns + ", " + bookingJoinColumns + `
                FROM bookings b
                LEFT JOIN booking_services s ON s.id = b.service_id
                LEFT JOIN booking_slots slt ON slt.id = b.slot_id
                LEFT JOIN shops sh ON sh.id = b.shop_id
                WHERE b.shop_id = $1
        `
	args := []any{shopID}
	idx := 2
	if filter != nil {
		if filter.From != "" {
			if dayStart, err := CairoDayStart(filter.From); err == nil {
				query += fmt.Sprintf(" AND b.start_at >= $%d", idx)
				args = append(args, dayStart)
				idx++
			}
		}
		if filter.To != "" {
			if dayEnd, err := CairoDayStart(filter.To); err == nil {
				query += fmt.Sprintf(" AND b.start_at < $%d", idx)
				args = append(args, dayEnd.AddDate(0, 0, 1))
				idx++
			}
		}
		if status := normalizeBookingStatus(filter.Status); status != "" {
			query += fmt.Sprintf(" AND b.status = $%d", idx)
			args = append(args, status)
			idx++
		}
	}
	if filter != nil && filter.Order == "asc" {
		query += " ORDER BY b.start_at ASC NULLS LAST, b.created_at ASC"
	} else {
		query += " ORDER BY b.created_at DESC"
	}
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", idx, idx+1)
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
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
                ) RETURNING `+bookingReturningColumns+bookingReturningJoins,
		b.BookingNumber, b.ServiceID, b.SlotID, b.ShopID, b.UserID,
		b.CustomerName, b.CustomerPhone, b.CustomerEmail,
		b.StartAt, b.EndAt, b.Participants, b.TotalAmount, b.Currency,
		b.Status, b.PaymentStatus, b.Notes, metadataJSON,
	)
	return scanBooking(row)
}

// Reschedule moves a booking to a new absolute window (already computed in
// Cairo time by the service layer) and keeps its slot row in sync so the
// availability engine never double-books the moved appointment.
func (r *Repository) Reschedule(ctx context.Context, id string, newStart, newEnd time.Time) (*Booking, error) {
	dateStr := FormatCairoDate(newStart)
	startTime := FormatCairoClock(newStart)
	endTime := FormatCairoClock(newEnd)

	row := r.pool.QueryRow(ctx, `
                WITH updated_slot AS (
                        UPDATE booking_slots slt
                        SET start_at = $2, end_at = $3, date = $4, start_time = $5, end_time = $6, updated_at = NOW()
                        FROM bookings bk
                        WHERE bk.id = $1 AND slt.id = bk.slot_id
                        RETURNING slt.id
                ), upserted_slot AS (
                        INSERT INTO booking_slots (service_id, shop_id, date, start_time, end_time, start_at, end_at, status, max_capacity, current_bookings, updated_at)
                        SELECT b.service_id, b.shop_id, $4, $5, $6, $2, $3, 'BOOKED', b.participants, b.participants, NOW()
                        FROM bookings b
                        WHERE b.id = $1 AND NOT EXISTS (SELECT 1 FROM updated_slot)
                        RETURNING id
                )
                UPDATE bookings SET
                        start_at = $2,
                        end_at = $3,
                        slot_id = COALESCE((SELECT id FROM upserted_slot), slot_id),
                        updated_at = NOW()
                WHERE id = $1
                RETURNING `+bookingReturningColumns+bookingReturningJoins,
		id, newStart, newEnd, dateStr, startTime, endTime,
	)
	return scanBooking(row)
}

// UpdateStatus updates booking status. NO_SHOW is tracked without a dedicated
// timestamp column (unlike CONFIRMED/COMPLETED/CANCELLED).
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
                WHERE id = $1 RETURNING `+bookingReturningColumns+bookingReturningJoins, id, status, confirmedAt, completedAt, cancelledAt)
	return scanBooking(row)
}

// CreateGuarded inserts a booking under a per-service advisory lock so two
// concurrent requests can never both pass the same availability check (the
// classic check-then-insert double-booking race). The overlap count is
// re-evaluated inside the transaction with the merchant's MaxPerSlot cap, the
// optional duplicate guard runs in the same transaction, and the booking slot
// row is created atomically with the booking so a rejected request leaves no
// orphan slot behind.
type guardedCreateParams struct {
	Booking           *Booking
	ResourceID        string
	MaxPerSlot        int
	PreventDuplicates bool
}

func (r *Repository) CreateGuarded(ctx context.Context, p guardedCreateParams) (*Booking, error) {
	b := p.Booking
	// Bookings without a concrete window (QUOTE requests) have nothing to
	// guard — plain insert.
	if b.ServiceID == "" || b.StartAt == nil || b.EndAt == nil {
		return r.Create(ctx, b)
	}

	maxPer := p.MaxPerSlot
	if maxPer < 1 {
		maxPer = 1
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, errors.Internal("begin_booking_tx_failed", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Serialize booking creation per service. hashtext(int4) + 0 keeps this
	// compatible with every PostgreSQL version in production.
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1), 0)", b.ServiceID); err != nil {
		return nil, errors.Internal("booking_lock_failed", err)
	}

	// Cap check inside the lock.
	count, err := countOverlapping(ctx, tx, b.ServiceID, *b.StartAt, *b.EndAt, "")
	if err != nil {
		return nil, err
	}
	if count >= maxPer {
		return nil, errors.Validation("slot_unavailable", "الفترة الزمنية غير متاحة — جرّب موعداً آخر")
	}

	// Duplicate guard inside the lock: same shop + phone + service on the same
	// Cairo day already has an active booking.
	if p.PreventDuplicates && b.CustomerPhone != nil {
		dayStart := CairoDayStartOf(*b.StartAt)
		var dups int
		if err := tx.QueryRow(ctx, `
                        SELECT COUNT(*) FROM bookings
                        WHERE shop_id = $1 AND customer_phone = $2 AND service_id = $3
                          AND status IN ('PENDING', 'CONFIRMED')
                          AND start_at >= $4 AND start_at < $5
                `, b.ShopID, *b.CustomerPhone, b.ServiceID, dayStart, dayStart.AddDate(0, 0, 1)).Scan(&dups); err != nil {
			return nil, errors.Internal("booking_dup_check_failed", err)
		}
		if dups > 0 {
			return nil, errors.Validation("duplicate_booking", "عندك حجز بنفس البيانات في هذا اليوم بالفعل")
		}
	}

	// Slot row is part of the same transaction.
	sid, err := insertBookingSlot(ctx, tx, b.ServiceID, b.ShopID, p.ResourceID, *b.StartAt, *b.EndAt, b.Participants)
	if err != nil {
		return nil, err
	}
	b.SlotID = &sid

	metadataJSON, _ := json.Marshal(b.Metadata)
	row := tx.QueryRow(ctx, bookingInsertSQL,
		b.BookingNumber, b.ServiceID, b.SlotID, b.ShopID, b.UserID,
		b.CustomerName, b.CustomerPhone, b.CustomerEmail,
		b.StartAt, b.EndAt, b.Participants, b.TotalAmount, b.Currency,
		b.Status, b.PaymentStatus, b.Notes, metadataJSON,
	)
	created, err := scanBooking(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, errors.Internal("commit_booking_failed", err)
	}
	return created, nil
}

// bookingInsertSQL is the shared INSERT for Create and CreateGuarded.
var bookingInsertSQL = `
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
        ) RETURNING ` + bookingReturningColumns + bookingReturningJoins

// countOverlapping counts active bookings overlapping a window, on any
// Querier (pool or transaction).
func countOverlapping(ctx context.Context, q interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}, serviceID string, startAt, endAt time.Time, excludeBookingID string) (int, error) {
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
	if err := q.QueryRow(ctx, query, args...).Scan(&count); err != nil {
		return 0, errors.Internal("count_overlapping_bookings_failed", err)
	}
	return count, nil
}

// CountOverlappingBookings counts active bookings overlapping a window for a
// service — used to enforce the merchant's bookings-per-slot cap.
func (r *Repository) CountOverlappingBookings(ctx context.Context, serviceID string, startAt, endAt time.Time, excludeBookingID string) (int, error) {
	return countOverlapping(ctx, r.pool, serviceID, startAt, endAt, excludeBookingID)
}

// ShopExists reports whether the shop id actually exists — guest bookings
// otherwise surface FK violations (HTTP 500) instead of a clean 404.
func (r *Repository) ShopExists(ctx context.Context, shopID string) (bool, error) {
	var one int
	err := r.pool.QueryRow(ctx, "SELECT 1 FROM shops WHERE id = $1 LIMIT 1", shopID).Scan(&one)
	if err == nil {
		return true, nil
	}
	if err == pgx.ErrNoRows {
		return false, nil
	}
	return false, errors.Internal("shop_exists_check_failed", err)
}

// CheckResourceAvailability checks if a resource is available.
func (r *Repository) CheckResourceAvailability(ctx context.Context, resourceID string, date time.Time, startTime, endTime, excludeBookingID string) (bool, error) {
	if resourceID == "" {
		return true, nil
	}
	dateStr := FormatCairoDate(date)
	startAt, _ := CairoWallClock(dateStr, startTime)
	endAt, _ := CairoWallClock(dateStr, endTime)

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
// Work hours, slot length and advance window come from the shop's booking
// settings (shops.page_design) and are interpreted in Cairo wall-clock time.
func (r *Repository) GetAvailableSlots(ctx context.Context, serviceID string, date time.Time, durationMinutes int, settings *ShopBookingSettings) ([]AvailableSlot, error) {
	if settings == nil {
		settings = DefaultShopBookingSettings()
	}
	if durationMinutes <= 0 {
		durationMinutes = settings.SlotDuration
	}
	if durationMinutes <= 0 {
		durationMinutes = 30
	}
	dateStr := FormatCairoDate(date)
	dayStart, err := CairoWallClock(dateStr, settings.WorkStart)
	if err != nil {
		dayStart, _ = CairoWallClock(dateStr, "09:00")
	}
	dayEnd, err := CairoWallClock(dateStr, settings.WorkEnd)
	if err != nil {
		dayEnd, _ = CairoWallClock(dateStr, "21:00")
	}
	if !dayEnd.After(dayStart) {
		return []AvailableSlot{}, nil
	}

	// Reject past dates and dates beyond the merchant's advance window.
	todayStart := CairoDayStartOf(time.Now())
	if dayStart.Before(todayStart) {
		return []AvailableSlot{}, nil
	}
	if settings.AdvanceDays > 0 && dayStart.After(todayStart.AddDate(0, 0, settings.AdvanceDays-1).Add(23*time.Hour+59*time.Minute+59*time.Second)) {
		return []AvailableSlot{}, nil
	}

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

	maxPer := settings.MaxPerSlot
	if maxPer < 1 {
		maxPer = 1
	}

	var slots []AvailableSlot
	for t := dayStart; !t.Add(time.Duration(durationMinutes) * time.Minute).After(dayEnd); t = t.Add(time.Duration(durationMinutes) * time.Minute) {
		slotEnd := t.Add(time.Duration(durationMinutes) * time.Minute)
		// Slots that already started (or started before "now") are not bookable.
		if t.Before(time.Now()) {
			continue
		}
		overlapping := 0
		for _, b := range booked {
			if t.Before(b.end) && slotEnd.After(b.start) {
				overlapping++
			}
		}
		slots = append(slots, AvailableSlot{
			StartTime: FormatCairoClock(t),
			EndTime:   FormatCairoClock(slotEnd),
			Available: overlapping < maxPer,
		})
	}
	return slots, nil
}

// CairoDayStartOf returns Cairo midnight of the day containing t.
func CairoDayStartOf(t time.Time) time.Time {
	loc := CairoLocation()
	y, m, d := t.In(loc).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, loc)
}

// EnsureBookingService finds or creates a booking service.
func (r *Repository) EnsureBookingService(ctx context.Context, shopID, serviceID, itemName string, itemPrice float64) (string, error) {
	return r.ensureBookingService(ctx, ensureServiceParams{
		ShopID: shopID, ServiceID: serviceID, ItemName: itemName, ItemPrice: itemPrice,
	})
}

// EnsureServiceParams extends service provisioning with the product linkage
// and the real duration/capacity declared on the bookable product.
type ensureServiceParams struct {
	ShopID          string
	ServiceID       string
	ItemID          string // catalog product id that backs this bookable service
	ItemName        string
	ItemPrice       float64
	DurationMinutes int
	Capacity        int
}

// FindServiceIDByProduct returns the booking service previously provisioned
// for a catalog product (linked via metadata->>'productId'), if any.
func (r *Repository) FindServiceIDByProduct(ctx context.Context, shopID, productID string) (string, error) {
	if productID == "" {
		return "", nil
	}
	var id string
	err := r.pool.QueryRow(ctx, `
                SELECT id FROM booking_services
                WHERE shop_id = $1 AND metadata->>'productId' = $2
                LIMIT 1
        `, shopID, productID).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", errors.Internal("find_service_by_product_failed", err)
	}
	return id, nil
}

// GetProductBookingInfo fetches the minimal product fields needed to provision
// a bookable service from a catalog product (name, price, extra booking config).
func (r *Repository) GetProductBookingInfo(ctx context.Context, shopID, productID string) (name string, price float64, duration int, capacity int, err error) {
	err = r.pool.QueryRow(ctx, `
                SELECT COALESCE(NULLIF(name, ''), 'حجز'),
                       price,
                       COALESCE((extra_data->'booking'->>'durationMinutes')::int, 0),
                       COALESCE((extra_data->'booking'->>'capacity')::int, 0)
                FROM products WHERE id = $1 AND shop_id = $2 LIMIT 1
        `, productID, shopID).Scan(&name, &price, &duration, &capacity)
	return
}

// GetBookableProductForService resolves a catalog product as a bookable
// offering. A product qualifies when its unit is 'booking' or it carries a
// booking configuration (extra_data.booking / bookingDetails).
func (r *Repository) GetBookableProductForService(ctx context.Context, shopID, productID string) (name string, price float64, duration int, capacity int, bookable bool, err error) {
	err = r.pool.QueryRow(ctx, `
                SELECT COALESCE(NULLIF(name, ''), 'حجز'),
                       price,
                       COALESCE((extra_data->'booking'->>'durationMinutes')::int, 0),
                       COALESCE((extra_data->'booking'->>'capacity')::int, 0),
                       (unit = 'booking' OR extra_data ? 'booking' OR extra_data ? 'bookingDetails')
                FROM products WHERE id = $1 AND shop_id = $2 LIMIT 1
        `, productID, shopID).Scan(&name, &price, &duration, &capacity, &bookable)
	return
}

// ensureBookingService provisions (or reuses) the booking_services row for an
// incoming booking. When the booking carries a catalog product id, the service
// is linked to that product via metadata->>'productId' and inherits its real
// duration/price/capacity instead of the generic 30-minute default.
func (r *Repository) ensureBookingService(ctx context.Context, p ensureServiceParams) (string, error) {
	// 1. Explicit service id must exist for this shop.
	if p.ServiceID != "" {
		var id string
		err := r.pool.QueryRow(ctx, "SELECT id FROM booking_services WHERE id = $1 AND shop_id = $2", p.ServiceID, p.ShopID).Scan(&id)
		if err == nil {
			return id, nil
		}
	}

	// 2. Reuse the service provisioned earlier for the same product.
	if p.ItemID != "" {
		if linked, err := r.FindServiceIDByProduct(ctx, p.ShopID, p.ItemID); err == nil && linked != "" {
			return linked, nil
		}
	}

	name := strings.TrimSpace(p.ItemName)
	if name == "" {
		name = "حجز عام"
	}
	name = truncateRunes(name, 160)

	var existingID string
	err := r.pool.QueryRow(ctx, "SELECT id FROM booking_services WHERE shop_id = $1 AND name = $2 LIMIT 1", p.ShopID, name).Scan(&existingID)
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
                `, p.ShopID).Scan(&categoryID)
		if err != nil {
			return "", errors.Internal("ensure_booking_category_failed", err)
		}
	}

	duration := p.DurationMinutes
	if duration <= 0 {
		duration = 30
	}
	capacity := p.Capacity
	if capacity <= 0 {
		capacity = 1
	}
	var productID any
	if p.ItemID != "" {
		productID = p.ItemID
	}
	err = r.pool.QueryRow(ctx, `
                INSERT INTO booking_services (shop_id, category_id, name, name_ar, description, duration_minutes, price, currency, capacity, metadata, updated_at)
                VALUES ($1, $2, $3, $3, 'تم إنشاؤها تلقائياً من لوحة الحجوزات', $4, $5, 'EGP', $6,
                        CASE WHEN $7::text IS NOT NULL THEN jsonb_build_object('productId', $7::text) ELSE NULL END, NOW())
                RETURNING id
        `, p.ShopID, categoryID, name, duration, p.ItemPrice, capacity, productID).Scan(&existingID)
	if err != nil {
		return "", errors.Internal("create_booking_service_failed", err)
	}
	return existingID, nil
}

// EnsureBookingSlot finds or creates a booking slot.
func (r *Repository) EnsureBookingSlot(ctx context.Context, serviceID, shopID, resourceID, dateStr, startTime, endTime string, participants int) (string, error) {
	startAt, err := CairoWallClock(dateStr, startTime)
	if err != nil {
		return "", errors.Validation("invalid_slot_time", "وقت الفترة غير صحيح")
	}
	endAt, err := CairoWallClock(dateStr, endTime)
	if err != nil {
		return "", errors.Validation("invalid_slot_time", "وقت نهاية الفترة غير صحيح")
	}
	return insertBookingSlot(ctx, r.pool, serviceID, shopID, resourceID, startAt, endAt, participants)
}

// insertBookingSlot writes the booking_slots row. start_at/end_at are absolute
// instants built via CairoWallClock so the slot row and the booking row always
// carry the same time semantics (the date/start_time/end_time TEXT columns
// keep the Cairo wall-clock digits for display).
func insertBookingSlot(ctx context.Context, q interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}, serviceID, shopID, resourceID string, startAt, endAt time.Time, participants int) (string, error) {
	var slotID string
	err := q.QueryRow(ctx, `
                INSERT INTO booking_slots (service_id, shop_id, resource_id, date, start_time, end_time, start_at, end_at, status, max_capacity, current_bookings, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'BOOKED', $9, $9, NOW())
                RETURNING id
        `, serviceID, nullableStr(shopID), nullableStr(resourceID), FormatCairoDate(startAt), FormatCairoClock(startAt), FormatCairoClock(endAt), startAt, endAt, participants).Scan(&slotID)
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

// BuildBookingNumber generates a unique booking number. The suffix comes from
// crypto/rand (6 digits ≈ 10^6 per timestamp) — the old time.Nanosecond()%10000
// suffix was weakly random and made guest lookup enumeration feasible.
func BuildBookingNumber() string {
	stamp := time.Now().UTC().Format("20060102150405")
	var rnd [4]byte
	if _, err := crand.Read(rnd[:]); err != nil {
		// crypto/rand never fails on Linux; fall back to nanoseconds regardless.
		binary.BigEndian.PutUint32(rnd[:], uint32(time.Now().Nanosecond()))
	}
	suffix := binary.BigEndian.Uint32(rnd[:]) % 1000000
	return fmt.Sprintf("BK-%s-%06d", stamp, suffix)
}

// truncateRunes cuts a string to max runes WITHOUT splitting multi-byte UTF-8
// characters — byte slicing (s[:max]) corrupts Arabic text mid-rune.
func truncateRunes(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max])
}

// ---------------------------------------------------------------------------
// Shop booking settings (shops.page_design) — written by the dashboard
// BookingSettingsTab via PATCH /shops/me, read by the booking engine.
// ---------------------------------------------------------------------------

// DefaultShopBookingSettings mirrors the dashboard defaults so behavior is
// identical whether or not the merchant ever opened the settings tab.
func DefaultShopBookingSettings() *ShopBookingSettings {
	return &ShopBookingSettings{
		WorkStart:         "09:00",
		WorkEnd:           "21:00",
		SlotDuration:      30,
		AdvanceDays:       14,
		AutoConfirm:       false,
		MaxPerSlot:        1,
		PreventDuplicates: true,
	}
}

// GetShopBookingSettings reads the merchant's booking rules from
// shops.page_design (JSONB). Missing keys fall back to the dashboard defaults.
func (r *Repository) GetShopBookingSettings(ctx context.Context, shopID string) (*ShopBookingSettings, error) {
	var raw []byte
	err := r.pool.QueryRow(ctx, "SELECT page_design FROM shops WHERE id = $1", shopID).Scan(&raw)
	if err != nil {
		if err == pgx.ErrNoRows {
			return DefaultShopBookingSettings(), nil
		}
		return nil, errors.Internal("get_shop_booking_settings_failed", err)
	}
	return parseShopBookingSettings(raw), nil
}

func parseShopBookingSettings(raw []byte) *ShopBookingSettings {
	s := DefaultShopBookingSettings()
	if len(raw) == 0 {
		return s
	}
	var pd map[string]any
	if json.Unmarshal(raw, &pd) != nil {
		return s
	}
	if v, ok := pd["bookingWorkStart"].(string); ok && v != "" {
		s.WorkStart = v
	}
	if v, ok := pd["bookingWorkEnd"].(string); ok && v != "" {
		s.WorkEnd = v
	}
	if v, ok := pd["bookingSlotDuration"].(float64); ok && v > 0 {
		s.SlotDuration = int(v)
	}
	if v, ok := pd["bookingAdvanceDays"].(float64); ok && v > 0 {
		s.AdvanceDays = int(v)
	}
	if v, ok := pd["bookingAutoConfirm"].(bool); ok {
		s.AutoConfirm = v
	}
	if v, ok := pd["bookingMaxPerSlot"].(float64); ok && v > 0 {
		s.MaxPerSlot = int(v)
	}
	if v, ok := pd["bookingPreventDuplicates"].(bool); ok {
		s.PreventDuplicates = v
	}
	// Sanity: a closing time not after the opening time falls back to defaults.
	day := "2026-01-01"
	ws, err1 := time.Parse("15:04", s.WorkStart)
	we, err2 := time.Parse("15:04", s.WorkEnd)
	if err1 != nil || err2 != nil || !we.After(ws) {
		s.WorkStart, s.WorkEnd = "09:00", "21:00"
	}
	_ = day
	return s
}

// ---------------------------------------------------------------------------
// Booking services CRUD — merchant-managed bookable offerings.
// ---------------------------------------------------------------------------

const bookingServiceColumns = `
        id, shop_id, COALESCE(name, ''), name_ar, activity_type, description,
        COALESCE(duration_minutes, 30), COALESCE(price, 0), COALESCE(currency, 'EGP'),
        COALESCE(capacity, 1), COALESCE(is_active, true), COALESCE(metadata->>'productId', ''),
        COALESCE(metadata, '{}'::jsonb), created_at, updated_at
`

func scanBookingService(row pgx.Row) (*BookingService, error) {
	var svc BookingService
	var nameAr, activityType, description sql.NullString
	err := row.Scan(
		&svc.ID, &svc.ShopID, &svc.Name, &nameAr, &activityType, &description,
		&svc.DurationMinutes, &svc.Price, &svc.Currency,
		&svc.Capacity, &svc.IsActive, &svc.ProductID,
		&svc.Metadata, &svc.CreatedAt, &svc.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_booking_service_failed", err)
	}
	svc.NameAr = nullStringPtr(nameAr)
	svc.ActivityType = nullStringPtr(activityType)
	svc.Description = nullStringPtr(description)
	return &svc, nil
}

// GetService fetches one booking service by id (any shop) — callers must
// enforce ownership before mutating.
func (r *Repository) GetService(ctx context.Context, id string) (*BookingService, error) {
	row := r.pool.QueryRow(ctx, "SELECT "+bookingServiceColumns+" FROM booking_services WHERE id = $1", id)
	return scanBookingService(row)
}

// ListServicesByShop lists a shop's bookable services (newest first).
// includeInactive=false returns only active services (the public view).
func (r *Repository) ListServicesByShop(ctx context.Context, shopID string, includeInactive bool) ([]BookingService, error) {
	query := "SELECT " + bookingServiceColumns + " FROM booking_services WHERE shop_id = $1"
	if !includeInactive {
		query += " AND is_active = true"
	}
	query += " ORDER BY created_at DESC"
	rows, err := r.pool.Query(ctx, query, shopID)
	if err != nil {
		return nil, errors.Internal("list_booking_services_failed", err)
	}
	defer rows.Close()
	var out []BookingService
	for rows.Next() {
		svc, err := scanBookingService(rows)
		if err != nil {
			return nil, err
		}
		if svc != nil {
			out = append(out, *svc)
		}
	}
	return out, rows.Err()
}

// ListPublicServicesByShopSlug resolves a published shop by slug and returns
// its active bookable services — the data source of the public booking page.
func (r *Repository) ListPublicServicesByShopSlug(ctx context.Context, slug string) (shopID string, shopName string, services []BookingService, err error) {
	err = r.pool.QueryRow(ctx, `
                SELECT id, name FROM shops
                WHERE slug = $1 AND status = 'APPROVED' AND is_active = true AND public_disabled = false
                LIMIT 1
        `, slug).Scan(&shopID, &shopName)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", nil, errors.NotFound("shop", slug)
		}
		return "", "", nil, errors.Internal("public_shop_lookup_failed", err)
	}
	services, err = r.ListServicesByShop(ctx, shopID, false)
	if err != nil {
		return "", "", nil, err
	}
	return shopID, shopName, services, nil
}

// CreateService inserts a merchant-defined bookable service.
func (r *Repository) CreateService(ctx context.Context, shopID string, req CreateBookingServiceRequest) (*BookingService, error) {
	name := truncateRunes(strings.TrimSpace(req.Name), 160)
	nameAr := nullableStr(strings.TrimSpace(req.NameAr))
	activity := nullableStr(strings.TrimSpace(req.ActivityType))
	desc := nullableStr(strings.TrimSpace(req.Description))
	duration := req.DurationMinutes
	if duration <= 0 {
		duration = 30
	}
	capacity := req.Capacity
	if capacity <= 0 {
		capacity = 1
	}
	isActive := req.IsActive == nil || *req.IsActive

	row := r.pool.QueryRow(ctx, `
                INSERT INTO booking_services (shop_id, name, name_ar, activity_type, description, duration_minutes, price, currency, capacity, is_active, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'EGP', $8, $9, NOW())
                RETURNING `+bookingServiceColumns,
		shopID, name, nameAr, activity, desc, duration, req.Price, capacity, isActive,
	)
	return scanBookingService(row)
}

// UpdateService applies a partial update to a bookable service.
func (r *Repository) UpdateService(ctx context.Context, id string, req UpdateBookingServiceRequest) (*BookingService, error) {
	row := r.pool.QueryRow(ctx, `
                UPDATE booking_services SET
                        name             = COALESCE($2, name),
                        name_ar          = COALESCE($3, name_ar),
                        activity_type    = COALESCE($4, activity_type),
                        description      = COALESCE($5, description),
                        duration_minutes = COALESCE($6, duration_minutes),
                        price            = COALESCE($7, price),
                        capacity         = COALESCE($8, capacity),
                        is_active        = COALESCE($9, is_active),
                        updated_at       = NOW()
                WHERE id = $1
                RETURNING `+bookingServiceColumns,
		id,
		nullableStr(strings.TrimSpace(derefStr(req.Name))),
		nullableStr(strings.TrimSpace(derefStr(req.NameAr))),
		nullableStr(strings.TrimSpace(derefStr(req.ActivityType))),
		nullableStr(strings.TrimSpace(derefStr(req.Description))),
		derefInt(req.DurationMinutes),
		derefFloat(req.Price),
		derefInt(req.Capacity),
		req.IsActive,
	)
	return scanBookingService(row)
}

// DeactivateService soft-deletes a bookable service (history keeps working).
func (r *Repository) DeactivateService(ctx context.Context, id string) (*BookingService, error) {
	row := r.pool.QueryRow(ctx, `
                UPDATE booking_services SET is_active = false, updated_at = NOW()
                WHERE id = $1
                RETURNING `+bookingServiceColumns, id)
	return scanBookingService(row)
}

// FindBookingByNumber fetches a booking by its public booking number (BK-…).
func (r *Repository) FindBookingByNumber(ctx context.Context, number string) (*Booking, error) {
	query := "SELECT " + bookingColumns + ", " + bookingJoinColumns + `
                FROM bookings b
                LEFT JOIN booking_services s ON s.id = b.service_id
                LEFT JOIN booking_slots slt ON slt.id = b.slot_id
                LEFT JOIN shops sh ON sh.id = b.shop_id
                WHERE UPPER(b.booking_number) = UPPER($1) LIMIT 1
        `
	row := r.pool.QueryRow(ctx, query, number)
	return scanBooking(row)
}

func derefStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func derefInt(p *int) any {
	if p == nil {
		return nil
	}
	return *p
}

func derefFloat(p *float64) any {
	if p == nil {
		return nil
	}
	return *p
}
