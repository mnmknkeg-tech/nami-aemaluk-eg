package accounting

import (
	"context"
	"fmt"
	"time"
)

// ---------------------------------------------------------------------------
// Phase 3: Fiscal periods
// ---------------------------------------------------------------------------

func (r *Repository) ListFiscalPeriods(ctx context.Context, shopID string) ([]FiscalPeriod, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, shop_id, name, start_date, end_date, status, COALESCE(closed_by::text,''), COALESCE(closed_at::text,''), created_at
		FROM acc_fiscal_periods WHERE shop_id = $1 ORDER BY start_date DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("list periods: %w", err)
	}
	defer rows.Close()
	out := []FiscalPeriod{}
	for rows.Next() {
		var p FiscalPeriod
		var startDate, endDate, createdAt time.Time
		if err := rows.Scan(&p.ID, &p.ShopID, &p.Name, &startDate, &endDate, &p.Status, &p.ClosedBy, &p.ClosedAt, &createdAt); err != nil {
			continue
		}
		p.StartDate = startDate.Format("2006-01-02")
		p.EndDate = endDate.Format("2006-01-02")
		p.CreatedAt = createdAt.Format(time.RFC3339)
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repository) CreateFiscalPeriod(ctx context.Context, shopID string, year, month int) (*FiscalPeriod, error) {
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, -1)
	name := fmt.Sprintf("%d-%02d", year, month)
	var p FiscalPeriod
	var startDate, endDate, createdAt time.Time
	err := r.pool.QueryRow(ctx, `
		INSERT INTO acc_fiscal_periods (shop_id, name, start_date, end_date)
		VALUES ($1,$2,$3,$4)
		RETURNING id, shop_id, name, start_date, end_date, status, COALESCE(closed_by::text,''), COALESCE(closed_at::text,''), created_at`,
		shopID, name, start, end).
		Scan(&p.ID, &p.ShopID, &p.Name, &startDate, &endDate, &p.Status, &p.ClosedBy, &p.ClosedAt, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("create period: %w", err)
	}
	p.StartDate = startDate.Format("2006-01-02")
	p.EndDate = endDate.Format("2006-01-02")
	p.CreatedAt = createdAt.Format(time.RFC3339)
	return &p, nil
}

func (r *Repository) CloseFiscalPeriod(ctx context.Context, id, shopID, userID string) error {
	query := `UPDATE acc_fiscal_periods SET status = 'closed', closed_by = $2, closed_at = NOW() WHERE id = $1 AND status = 'open'`
	args := []any{id, userID}
	if shopID != "" {
		query += " AND shop_id = $3"
		args = append(args, shopID)
	}
	_, err := r.pool.Exec(ctx, query, args...)
	return err
}

func (r *Repository) GetFiscalPeriod(ctx context.Context, id, shopID string) (*FiscalPeriod, error) {
	query := `SELECT id, shop_id, name, start_date, end_date, status, COALESCE(closed_by::text,''), COALESCE(closed_at::text,''), created_at
		FROM acc_fiscal_periods WHERE id = $1`
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	var p FiscalPeriod
	var startDate, endDate, createdAt time.Time
	err := r.pool.QueryRow(ctx, query, args...).
		Scan(&p.ID, &p.ShopID, &p.Name, &startDate, &endDate, &p.Status, &p.ClosedBy, &p.ClosedAt, &createdAt)
	if err != nil {
		return nil, err
	}
	p.StartDate = startDate.Format("2006-01-02")
	p.EndDate = endDate.Format("2006-01-02")
	p.CreatedAt = createdAt.Format(time.RFC3339)
	return &p, nil
}

func (r *Repository) ReopenFiscalPeriod(ctx context.Context, id, shopID string) error {
	query := `UPDATE acc_fiscal_periods SET status = 'open', closed_by = NULL, closed_at = NULL WHERE id = $1 AND status = 'closed'`
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	_, err := r.pool.Exec(ctx, query, args...)
	return err
}

// IsPeriodClosed returns true if the given date falls inside a closed period.
func (r *Repository) IsPeriodClosed(ctx context.Context, shopID, date string) (bool, string, error) {
	var name string
	var closed bool
	err := r.pool.QueryRow(ctx, `
		SELECT name, status = 'closed' FROM acc_fiscal_periods
		WHERE shop_id = $1 AND $2::date BETWEEN start_date AND end_date`, shopID, date).Scan(&name, &closed)
	if err != nil {
		return false, "", nil // no period defined → open
	}
	return closed, name, nil
}

// ---------------------------------------------------------------------------
// Phase 3: Audit log
// ---------------------------------------------------------------------------

func (r *Repository) LogAudit(ctx context.Context, shopID, userID, userName, action, entityType, entityID, summary string) {
	_, _ = r.pool.Exec(ctx, `
		INSERT INTO acc_audit_log (shop_id, user_id, user_name, action, entity_type, entity_id, summary)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		shopID, userID, userName, action, entityType, entityID, summary)
}

func (r *Repository) ListAuditLog(ctx context.Context, shopID, entityType, action string, limit int) ([]AuditLogEntry, error) {
	query := `SELECT id, shop_id, COALESCE(user_id,''), COALESCE(user_name,''), action, entity_type, COALESCE(entity_id,''), COALESCE(summary,''), created_at
		FROM acc_audit_log WHERE shop_id = $1`
	args := []any{shopID}
	if entityType != "" {
		args = append(args, entityType)
		query += fmt.Sprintf(" AND entity_type = $%d", len(args))
	}
	if action != "" {
		args = append(args, action)
		query += fmt.Sprintf(" AND action = $%d", len(args))
	}
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	args = append(args, limit)
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", len(args))
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list audit: %w", err)
	}
	defer rows.Close()
	out := []AuditLogEntry{}
	for rows.Next() {
		var a AuditLogEntry
		var createdAt time.Time
		if err := rows.Scan(&a.ID, &a.ShopID, &a.UserID, &a.UserName, &a.Action, &a.EntityType, &a.EntityID, &a.Summary, &createdAt); err != nil {
			continue
		}
		a.CreatedAt = createdAt.Format(time.RFC3339)
		out = append(out, a)
	}
	return out, rows.Err()
}
