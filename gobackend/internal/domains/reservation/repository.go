package reservation

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for reservations
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new reservation repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// CreateReservation creates a new reservation
func (r *Repository) CreateReservation(ctx context.Context, data *CreateReservationDTO) (*Reservation, error) {
	id := uuid.New().String()
	now := time.Now().UTC()
	expiresAt := now.Add(24 * time.Hour) // 24 hour expiry

	// Calculate subtotal
	subtotal := data.ItemPrice
	for _, addon := range data.Addons {
		subtotal += addon.Price
	}
	if data.VariantSelection != nil && data.VariantSelection.Price > 0 {
		subtotal += data.VariantSelection.Price
	}

	// Serialize complex fields
	addonsJSON, _ := json.Marshal(data.Addons)
	variantJSON, _ := json.Marshal(data.VariantSelection)

	query := `
		INSERT INTO reservations (
			id, item_id, item_name, item_image, item_price, shop_id, shop_name,
			customer_name, customer_phone, customer_id, addons, variant_selection,
			status, subtotal, expires_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING id, item_id, item_name, item_image, item_price, shop_id, shop_name,
			customer_name, customer_phone, customer_id, addons, variant_selection,
			status, subtotal, expires_at, created_at, updated_at
	`

	var reservation Reservation
	var addonsJSONResult []byte
	var variantJSONResult []byte

	err := r.pool.QueryRow(ctx, query,
		id, data.ItemID, data.ItemName, data.ItemImage, data.ItemPrice,
		data.ShopID, data.ShopName, data.CustomerName, data.CustomerPhone,
		data.CustomerID, addonsJSON, variantJSON,
		ReservationStatusPending, subtotal, expiresAt, now, now,
	).Scan(
		&reservation.ID, &reservation.ItemID, &reservation.ItemName,
		&reservation.ItemImage, &reservation.ItemPrice, &reservation.ShopID,
		&reservation.ShopName, &reservation.CustomerName, &reservation.CustomerPhone,
		&reservation.CustomerID, &addonsJSONResult, &variantJSONResult,
		&reservation.Status, &reservation.Subtotal, &reservation.ExpiresAt,
		&reservation.CreatedAt, &reservation.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create reservation: %w", err)
	}

	json.Unmarshal(addonsJSONResult, &reservation.Addons)
	json.Unmarshal(variantJSONResult, &reservation.VariantSelection)

	reservation.CreatedAt = now.UTC().Format(time.RFC3339)
	reservation.UpdatedAt = now.UTC().Format(time.RFC3339)
	reservation.ExpiresAt = expiresAt.UTC().Format(time.RFC3339)

	return &reservation, nil
}

// GetReservationByID retrieves a reservation by ID
func (r *Repository) GetReservationByID(ctx context.Context, id string) (*Reservation, error) {
	query := `
		SELECT id, item_id, item_name, item_image, item_price, shop_id, shop_name,
			customer_name, customer_phone, customer_id, addons, variant_selection,
			status, subtotal, expires_at, created_at, updated_at
		FROM reservations
		WHERE id = $1
	`

	var reservation Reservation
	var addonsJSON []byte
	var variantJSON []byte

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&reservation.ID, &reservation.ItemID, &reservation.ItemName,
		&reservation.ItemImage, &reservation.ItemPrice, &reservation.ShopID,
		&reservation.ShopName, &reservation.CustomerName, &reservation.CustomerPhone,
		&reservation.CustomerID, &addonsJSON, &variantJSON,
		&reservation.Status, &reservation.Subtotal, &reservation.ExpiresAt,
		&reservation.CreatedAt, &reservation.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("reservation not found")
		}
		return nil, fmt.Errorf("failed to get reservation: %w", err)
	}

	json.Unmarshal(addonsJSON, &reservation.Addons)
	json.Unmarshal(variantJSON, &reservation.VariantSelection)

	return &reservation, nil
}

// ListReservations retrieves reservations with filters
func (r *Repository) ListReservations(ctx context.Context, shopID, userID *string, status *ReservationStatus, limit, offset int) ([]Reservation, int64, error) {
	query := `
		SELECT id, item_id, item_name, item_image, item_price, shop_id, shop_name,
			customer_name, customer_phone, customer_id, addons, variant_selection,
			status, subtotal, expires_at, created_at, updated_at
		FROM reservations
		WHERE 1=1
	`
	countQuery := `SELECT COUNT(*) FROM reservations WHERE 1=1`
	args := []interface{}{}
	argIndex := 1

	if shopID != nil {
		query += fmt.Sprintf(" AND shop_id = $%d", argIndex)
		countQuery += fmt.Sprintf(" AND shop_id = $%d", argIndex)
		args = append(args, *shopID)
		argIndex++
	}

	if userID != nil {
		query += fmt.Sprintf(" AND customer_id = $%d", argIndex)
		countQuery += fmt.Sprintf(" AND customer_id = $%d", argIndex)
		args = append(args, *userID)
		argIndex++
	}

	if status != nil {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		countQuery += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, *status)
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	// Get total count
	var total int64
	countArgs := args[:len(args)-2] // Exclude limit and offset
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count reservations: %w", err)
	}

	// Get reservations
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query reservations: %w", err)
	}
	defer rows.Close()

	var reservations []Reservation
	for rows.Next() {
		var reservation Reservation
		var addonsJSON []byte
		var variantJSON []byte

		err := rows.Scan(
			&reservation.ID, &reservation.ItemID, &reservation.ItemName,
			&reservation.ItemImage, &reservation.ItemPrice, &reservation.ShopID,
			&reservation.ShopName, &reservation.CustomerName, &reservation.CustomerPhone,
			&reservation.CustomerID, &addonsJSON, &variantJSON,
			&reservation.Status, &reservation.Subtotal, &reservation.ExpiresAt,
			&reservation.CreatedAt, &reservation.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan reservation: %w", err)
		}

		json.Unmarshal(addonsJSON, &reservation.Addons)
		json.Unmarshal(variantJSON, &reservation.VariantSelection)

		reservations = append(reservations, reservation)
	}

	return reservations, total, nil
}

// UpdateReservationStatus updates the status of a reservation
func (r *Repository) UpdateReservationStatus(ctx context.Context, id string, status ReservationStatus) error {
	query := `
		UPDATE reservations
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`

	_, err := r.pool.Exec(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update reservation status: %w", err)
	}

	return nil
}

// ExpireStaleReservations marks pending/confirmed reservations as expired if past expiry time
func (r *Repository) ExpireStaleReservations(ctx context.Context) error {
	query := `
		UPDATE reservations
		SET status = 'EXPIRED', updated_at = NOW()
		WHERE status IN ('PENDING', 'CONFIRMED')
		AND expires_at < NOW()
	`

	_, err := r.pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to expire stale reservations: %w", err)
	}

	return nil
}

// GetReservationAnalytics retrieves analytics for reservations
func (r *Repository) GetReservationAnalytics(ctx context.Context, shopID *string) (*ReservationAnalytics, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
			COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
			COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
			COALESCE(SUM(subtotal), 0) as revenue
		FROM reservations
		WHERE 1=1
	`

	args := []interface{}{}
	argIndex := 1

	if shopID != nil {
		query += fmt.Sprintf(" AND shop_id = $%d", argIndex)
		args = append(args, *shopID)
		argIndex++
	}

	var analytics ReservationAnalytics
	var total, completed, pending, cancelled int64
	var revenue float64

	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&total, &completed, &pending, &cancelled, &revenue,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get reservation analytics: %w", err)
	}

	analytics.TotalReservations = total
	analytics.CompletedCount = completed
	analytics.PendingCount = pending
	analytics.CancelledCount = cancelled
	analytics.TotalRevenue = revenue

	// Calculate average value
	if total > 0 {
		analytics.AverageValue = revenue / float64(total)
	}

	return &analytics, nil
}
