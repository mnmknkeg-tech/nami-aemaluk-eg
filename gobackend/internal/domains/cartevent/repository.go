package cartevent

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the CartEvent domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new cart event repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

const cartEventColumns = `
	id, shop_id, product_id, event, user_id, session_id,
	customer_name, customer_email, customer_phone,
	quantity, unit_price, currency, metadata,
	is_recovered, recovered_at, created_at
`

// Track inserts a cart event.
func (r *Repository) Track(ctx context.Context, e *CartEvent) (*CartEvent, error) {
	metadataJSON, _ := json.Marshal(e.Metadata)
	var userID, sessionID, customerName, customerEmail, customerPhone any
	if e.UserID != nil && *e.UserID != "" {
		userID = *e.UserID
	}
	if e.SessionID != nil && *e.SessionID != "" {
		sessionID = *e.SessionID
	}
	if e.CustomerName != nil && *e.CustomerName != "" {
		customerName = *e.CustomerName
	}
	if e.CustomerEmail != nil && *e.CustomerEmail != "" {
		customerEmail = *e.CustomerEmail
	}
	if e.CustomerPhone != nil && *e.CustomerPhone != "" {
		customerPhone = *e.CustomerPhone
	}

	row := r.pool.QueryRow(ctx, `
		INSERT INTO cart_events (
			shop_id, product_id, event, user_id, session_id,
			customer_name, customer_email, customer_phone,
			quantity, unit_price, currency, metadata
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING `+cartEventColumns,
		e.ShopID, e.ProductID, e.Event, userID, sessionID,
		customerName, customerEmail, customerPhone,
		e.Quantity, e.UnitPrice, e.Currency, metadataJSON,
	)
	return scanCartEvent(row)
}

// ListAbandoned returns abandoned cart events for a shop.
func (r *Repository) ListAbandoned(ctx context.Context, shopID string, from, to *time.Time, limit, offset int) ([]CartEvent, int, error) {
	filters := "shop_id = $1 AND event IN ('add_to_cart', 'abandoned')"
	args := []any{shopID}
	idx := 2

	if from != nil {
		filters += fmt.Sprintf(" AND created_at >= $%d", idx)
		args = append(args, *from)
		idx++
	}
	if to != nil {
		filters += fmt.Sprintf(" AND created_at <= $%d", idx)
		args = append(args, *to)
		idx++
	}

	// Count total
	var total int
	countArgs := make([]any, len(args))
	copy(countArgs, args)
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM cart_events WHERE "+filters, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, errors.Internal("count_cart_events_failed", err)
	}

	args = append(args, limit, offset)
	query := "SELECT " + cartEventColumns + " FROM cart_events WHERE " + filters +
		fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", idx, idx+1)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, errors.Internal("list_abandoned_failed", err)
	}
	defer rows.Close()
	events, err := scanCartEvents(rows)
	if err != nil {
		return nil, 0, err
	}
	return events, total, nil
}

// GetStats returns cart event statistics for a shop.
func (r *Repository) GetStats(ctx context.Context, shopID string, from, to *time.Time) (*CartStatsResponse, error) {
	baseWhere := "shop_id = $1"
	args := []any{shopID}
	idx := 2
	if from != nil {
		baseWhere += fmt.Sprintf(" AND created_at >= $%d", idx)
		args = append(args, *from)
		idx++
	}
	if to != nil {
		baseWhere += fmt.Sprintf(" AND created_at <= $%d", idx)
		args = append(args, *to)
		idx++
	}

	countEvent := func(event string) int {
		var count int
		r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM cart_events WHERE "+baseWhere+fmt.Sprintf(" AND event = $%d", idx), append(args, event)...).Scan(&count)
		return count
	}
	countRecovered := func() int {
		var count int
		r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM cart_events WHERE "+baseWhere+" AND is_recovered = true", args...).Scan(&count)
		return count
	}

	addedToCart := countEvent("add_to_cart")
	checkoutStarted := countEvent("checkout_started")
	paymentCompleted := countEvent("payment_completed")
	abandoned := countEvent("abandoned")
	recovered := countRecovered()

	var abandonmentRate, recoveryRate float64
	if addedToCart > 0 {
		abandonmentRate = float64(abandoned) / float64(addedToCart) * 100
	}
	if abandoned > 0 {
		recoveryRate = float64(recovered) / float64(abandoned) * 100
	}

	return &CartStatsResponse{
		AddedToCart:      addedToCart,
		CheckoutStarted:  checkoutStarted,
		PaymentCompleted: paymentCompleted,
		Abandoned:        abandoned,
		Recovered:        recovered,
		AbandonmentRate:  abandonmentRate,
		RecoveryRate:     recoveryRate,
	}, nil
}

// MarkRecovered marks a cart event as recovered.
func (r *Repository) MarkRecovered(ctx context.Context, id string) (*CartEvent, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE cart_events SET is_recovered = true, recovered_at = NOW(), updated_at = NOW()
		WHERE id = $1 RETURNING `+cartEventColumns, id)
	return scanCartEvent(row)
}

// FindByID returns a cart event by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*CartEvent, error) {
	row := r.pool.QueryRow(ctx, "SELECT "+cartEventColumns+" FROM cart_events WHERE id = $1", id)
	return scanCartEvent(row)
}

func scanCartEvent(row pgx.Row) (*CartEvent, error) {
	var e CartEvent
	var userID, sessionID, customerName, customerEmail, customerPhone sql.NullString
	var metadata []byte
	var recoveredAt sql.NullTime

	err := row.Scan(
		&e.ID, &e.ShopID, &e.ProductID, &e.Event, &userID, &sessionID,
		&customerName, &customerEmail, &customerPhone,
		&e.Quantity, &e.UnitPrice, &e.Currency, &metadata,
		&e.IsRecovered, &recoveredAt, &e.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_cart_event_failed", err)
	}

	e.UserID = nullStringPtr(userID)
	e.SessionID = nullStringPtr(sessionID)
	e.CustomerName = nullStringPtr(customerName)
	e.CustomerEmail = nullStringPtr(customerEmail)
	e.CustomerPhone = nullStringPtr(customerPhone)
	e.Metadata = metadata
	if recoveredAt.Valid {
		e.RecoveredAt = &recoveredAt.Time
	}
	return &e, nil
}

func scanCartEvents(rows pgx.Rows) ([]CartEvent, error) {
	var events []CartEvent
	for rows.Next() {
		e, err := scanCartEvent(rows)
		if err != nil {
			return nil, err
		}
		if e != nil {
			events = append(events, *e)
		}
	}
	return events, rows.Err()
}

func nullStringPtr(s sql.NullString) *string {
	if !s.Valid || s.String == "" {
		return nil
	}
	return &s.String
}
