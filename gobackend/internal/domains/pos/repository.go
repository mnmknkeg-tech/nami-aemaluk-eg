package pos

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for POS shifts.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new shifts repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

var errNotFound = errors.New("shift not found")

const shiftCols = `id, shop_id, opened_by_id, status, opening_amount, closing_amount,
	expected_amount, difference, total_sales, orders_count, note, opened_at, closed_at`

func scanShift(scanner interface{ Scan(dest ...any) error }) (*Shift, error) {
	var (
		s              Shift
		openingByID    *string
		note           *string
		closingAmount  *float64
		expected       *float64
		difference     *float64
	)
	if err := scanner.Scan(&s.ID, &s.ShopID, &openingByID, &s.Status, &s.OpeningAmount,
		&closingAmount, &expected, &difference, &s.TotalSales, &s.OrdersCount,
		&note, &s.OpenedAt, &s.ClosedAt); err != nil {
		return nil, err
	}
	s.OpenedByID = openingByID
	s.Note = note
	s.ClosingAmount = closingAmount
	s.ExpectedAmount = expected
	s.Difference = difference
	return &s, nil
}

// refreshMetrics recomputes total_sales/orders_count from POS orders inside
// the shift window.
//
// Strategy (in priority order):
//  1. Direct join via pos_shift_id column (set by the syncer on push).
//     This is exact and immune to clock-skew.
//  2. Time-window fallback with a 10-minute grace buffer before the shift
//     start. This handles orders that arrived on the server before the shift
//     record was created (cashier desktop pushes orders whose local
//     created_at is a few seconds before the server-side opened_at).
func (r *Repository) refreshMetrics(ctx context.Context, shiftID string) error {
	shift, err := r.GetByIDRaw(ctx, shiftID)
	if err != nil || shift == nil {
		return err
	}

	end := time.Now().UTC()
	if shift.ClosedAt != nil {
		end = *shift.ClosedAt
	}

	// 10-minute grace buffer absorbs clock-skew between the cashier device
	// and the server (desktop records orders locally before the server shift
	// is created, so those orders arrive with created_at slightly before
	// pos_shifts.opened_at).
	windowStart := shift.OpenedAt.Add(-10 * time.Minute)

	var sales float64
	var count int

	err = r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total), 0), COUNT(*)
		FROM orders
		WHERE shop_id = $1
		  AND LOWER(COALESCE(source, '')) = 'pos'
		  AND (status IS NULL OR status::text NOT IN ('CANCELLED', 'REFUNDED', 'RETURNED'))
		  AND (
		        pos_shift_id = $4
		        OR (
		             (pos_shift_id IS NULL OR pos_shift_id = '')
		             AND created_at >= $2
		             AND created_at <= $3
		           )
		      )`,
		shift.ShopID, windowStart, end, shiftID,
	).Scan(&sales, &count)
	if err != nil {
		return err
	}

	_, err = r.pool.Exec(ctx,
		`UPDATE pos_shifts SET total_sales = $1, orders_count = $2 WHERE id = $3`,
		sales, count, shiftID,
	)
	return err
}

// GetByIDRaw loads a shift without scoping to a shop.
func (r *Repository) GetByIDRaw(ctx context.Context, id string) (*Shift, error) {
	row := r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM pos_shifts WHERE id = $1`, shiftCols),
		id,
	)
	s, err := scanShift(row)
	if err != nil {
		return nil, nil
	}
	return s, nil
}

// Active returns the currently open shift of a shop or nil.
func (r *Repository) Active(ctx context.Context, shopID string) (*Shift, error) {
	row := r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM pos_shifts WHERE shop_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1`, shiftCols),
		shopID,
	)
	shift, err := scanShift(row)
	if err != nil {
		return nil, nil // no active shift is not an error
	}
	_ = r.refreshMetrics(ctx, shift.ID)
	return r.GetByID(ctx, shopID, shift.ID)
}

// List returns the latest shifts of a shop.
// take is clamped to [1,200] and bound as a query parameter — no Sprintf —
// so a tampered limit can never alter the query shape.
func (r *Repository) List(ctx context.Context, shopID string, take int) ([]*Shift, error) {
	if take <= 0 || take > 200 {
		take = 20
	}
	rows, err := r.pool.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM pos_shifts WHERE shop_id = $1 ORDER BY opened_at DESC LIMIT $2`, shiftCols),
		shopID, take,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*Shift{}
	for rows.Next() {
		s, err := scanShift(rows)
		if err != nil {
			return nil, err
		}
		// Refresh metrics for open shifts so the list always shows live numbers.
		if s.Status == "open" {
			_ = r.refreshMetrics(ctx, s.ID)
			if fresh, err := r.GetByID(ctx, shopID, s.ID); err == nil && fresh != nil {
				s = fresh
			}
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// GetByID loads a single shift of a shop.
func (r *Repository) GetByID(ctx context.Context, shopID, id string) (*Shift, error) {
	row := r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM pos_shifts WHERE id = $1 AND shop_id = $2`, shiftCols),
		id, shopID,
	)
	return scanShift(row)
}

// Open creates a new open shift for a shop; only one may be active at a time.
func (r *Repository) Open(ctx context.Context, shopID, userID string, openingAmount float64) (*Shift, error) {
	var existing string
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM pos_shifts WHERE shop_id = $1 AND status = 'open' LIMIT 1`, shopID,
	).Scan(&existing)
	if err == nil {
		return nil, errors.New("a shift is already open")
	}

	id := uuid.NewString()
	now := time.Now().UTC()
	var openedBy *string
	if userID != "" {
		openedBy = &userID
	}
	_, err = r.pool.Exec(ctx,
		`INSERT INTO pos_shifts (id, shop_id, opened_by_id, status, opening_amount, opened_at)
		 VALUES ($1,$2,$3,'open',$4,$5)`,
		id, shopID, openedBy, openingAmount, now,
	)
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, shopID, id)
}

// Close closes an open shift with the counted cash amount.
func (r *Repository) Close(ctx context.Context, shopID, shiftID string, closingAmount float64, note *string) (*Shift, error) {
	current, err := r.GetByID(ctx, shopID, shiftID)
	if err != nil {
		return nil, errNotFound
	}
	if current.Status != "open" {
		return nil, errors.New("shift already closed")
	}
	_ = r.refreshMetrics(ctx, shiftID)

	now := time.Now().UTC()
	_, err = r.pool.Exec(ctx, `
		UPDATE pos_shifts SET
			status = 'closed',
			closing_amount = $1,
			expected_amount = opening_amount + total_sales,
			difference = $1 - (opening_amount + total_sales),
			note = $2,
			closed_at = $3
		WHERE id = $4 AND shop_id = $5`,
		closingAmount, note, now, shiftID, shopID,
	)
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, shopID, shiftID)
}

// Summary aggregates shifts between two dates (inclusive).
func (r *Repository) Summary(ctx context.Context, shopID string, from, to time.Time) (*Summary, error) {
	to = to.Add(24*time.Hour - time.Second)

	var sum Summary
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(total_sales),0), COALESCE(SUM(orders_count),0),
		       COALESCE(SUM(opening_amount),0), COALESCE(SUM(closing_amount),0)
		FROM pos_shifts WHERE shop_id = $1 AND opened_at >= $2 AND opened_at <= $3`,
		shopID, from, to,
	).Scan(&sum.Shifts, &sum.TotalSales, &sum.OrdersCount, &sum.OpeningTotal, &sum.ClosingTotal); err != nil {
		return nil, err
	}
	sum.NetCash = sum.ClosingTotal - sum.OpeningTotal

	rows, err := r.pool.Query(ctx, `
		SELECT DATE(opened_at)::text, COALESCE(SUM(total_sales),0), COALESCE(SUM(orders_count),0), COUNT(*)
		FROM pos_shifts WHERE shop_id = $1 AND opened_at >= $2 AND opened_at <= $3
		GROUP BY DATE(opened_at) ORDER BY DATE(opened_at)`,
		shopID, from, to,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sum.Days = []SummaryDayStat{}
	for rows.Next() {
		var d SummaryDayStat
		if err := rows.Scan(&d.Day, &d.Sales, &d.Orders, &d.ShiftsCount); err != nil {
			return nil, err
		}
		sum.Days = append(sum.Days, d)
	}
	return &sum, rows.Err()
}
