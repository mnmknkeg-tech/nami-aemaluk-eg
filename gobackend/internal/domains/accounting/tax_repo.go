package accounting

import (
	"context"
	"fmt"
	"time"
)

// ---------------------------------------------------------------------------
// Phase 3: Tax rates
// ---------------------------------------------------------------------------

func (r *Repository) ListTaxRates(ctx context.Context, shopID string) ([]TaxRate, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, shop_id, name, rate, tax_type, is_default, status, created_at
		FROM acc_tax_rates WHERE shop_id = $1 ORDER BY tax_type, rate`, shopID)
	if err != nil {
		return nil, fmt.Errorf("list tax rates: %w", err)
	}
	defer rows.Close()
	out := []TaxRate{}
	for rows.Next() {
		var t TaxRate
		var createdAt time.Time
		if err := rows.Scan(&t.ID, &t.ShopID, &t.Name, &t.Rate, &t.TaxType, &t.IsDefault, &t.Status, &createdAt); err != nil {
			continue
		}
		t.CreatedAt = createdAt.Format(time.RFC3339)
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *Repository) CreateTaxRate(ctx context.Context, shopID string, dto *CreateTaxRateDTO) (*TaxRate, error) {
	if dto.IsDefault {
		_, _ = r.pool.Exec(ctx, `UPDATE acc_tax_rates SET is_default = FALSE WHERE shop_id = $1 AND tax_type = $2`, shopID, dto.TaxType)
	}
	var t TaxRate
	var createdAt time.Time
	err := r.pool.QueryRow(ctx, `
		INSERT INTO acc_tax_rates (shop_id, name, rate, tax_type, is_default)
		VALUES ($1,$2,$3,$4,$5)
		RETURNING id, shop_id, name, rate, tax_type, is_default, status, created_at`,
		shopID, dto.Name, dto.Rate, dto.TaxType, dto.IsDefault).
		Scan(&t.ID, &t.ShopID, &t.Name, &t.Rate, &t.TaxType, &t.IsDefault, &t.Status, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("create tax rate: %w", err)
	}
	t.CreatedAt = createdAt.Format(time.RFC3339)
	return &t, nil
}

func (r *Repository) UpdateTaxRate(ctx context.Context, id, shopID string, dto *UpdateTaxRateDTO) (*TaxRate, error) {
	query := `
		UPDATE acc_tax_rates SET
			name = COALESCE($2, name),
			rate = COALESCE($3, rate),
			status = COALESCE($4, status)
		WHERE id = $1`
	args := []any{id, dto.Name, dto.Rate, dto.Status}
	if shopID != "" {
		query += " AND shop_id = $5"
		args = append(args, shopID)
	}
	query += `
		RETURNING id, shop_id, name, rate, tax_type, is_default, status, created_at`
	var t TaxRate
	var createdAt time.Time
	err := r.pool.QueryRow(ctx, query, args...).
		Scan(&t.ID, &t.ShopID, &t.Name, &t.Rate, &t.TaxType, &t.IsDefault, &t.Status, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("update tax rate: %w", err)
	}
	t.CreatedAt = createdAt.Format(time.RFC3339)
	return &t, nil
}

func (r *Repository) DeleteTaxRate(ctx context.Context, id, shopID string) error {
	query := `DELETE FROM acc_tax_rates WHERE id = $1`
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	_, err := r.pool.Exec(ctx, query, args...)
	return err
}

// ---------------------------------------------------------------------------
// Phase 3: Tax returns (VAT)
// ---------------------------------------------------------------------------

// ComputeVATReturn aggregates output/input VAT from posted invoices in a month.
func (r *Repository) ComputeVATReturn(ctx context.Context, shopID string, year, month int) (*TaxReturn, error) {
	tr := &TaxReturn{ShopID: shopID, PeriodYear: year, PeriodMonth: month, Status: "draft"}
	err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN invoice_type = 'sale' THEN tax_total ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN invoice_type = 'purchase' THEN tax_total ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN invoice_type = 'sale' THEN subtotal ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN invoice_type = 'purchase' THEN subtotal ELSE 0 END), 0)
		FROM acc_invoices
		WHERE shop_id = $1 AND status = 'posted'
		  AND EXTRACT(YEAR FROM invoice_date) = $2 AND EXTRACT(MONTH FROM invoice_date) = $3`,
		shopID, year, month).
		Scan(&tr.OutputTax, &tr.InputTax, &tr.SalesTotal, &tr.PurchasesTotal)
	if err != nil {
		return nil, fmt.Errorf("compute vat: %w", err)
	}
	tr.NetTax = round2(tr.OutputTax - tr.InputTax)
	return tr, nil
}

func (r *Repository) UpsertTaxReturn(ctx context.Context, tr *TaxReturn) (*TaxReturn, error) {
	var id string
	var generatedAt time.Time
	err := r.pool.QueryRow(ctx, `
		INSERT INTO acc_tax_returns (shop_id, period_year, period_month, output_tax, input_tax, net_tax, sales_total, purchases_total, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')
		ON CONFLICT (shop_id, period_year, period_month) DO UPDATE SET
			output_tax = EXCLUDED.output_tax,
			input_tax = EXCLUDED.input_tax,
			net_tax = EXCLUDED.net_tax,
			sales_total = EXCLUDED.sales_total,
			purchases_total = EXCLUDED.purchases_total,
			generated_at = NOW()
		RETURNING id, generated_at`,
		tr.ShopID, tr.PeriodYear, tr.PeriodMonth, tr.OutputTax, tr.InputTax, tr.NetTax, tr.SalesTotal, tr.PurchasesTotal).
		Scan(&id, &generatedAt)
	if err != nil {
		return nil, fmt.Errorf("upsert tax return: %w", err)
	}
	tr.ID = id
	tr.GeneratedAt = generatedAt.Format(time.RFC3339)
	return tr, nil
}

func (r *Repository) ListTaxReturns(ctx context.Context, shopID string) ([]TaxReturn, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, shop_id, period_year, period_month, output_tax, input_tax, net_tax, sales_total, purchases_total, status, generated_at, COALESCE(submitted_at::text,'')
		FROM acc_tax_returns WHERE shop_id = $1 ORDER BY period_year DESC, period_month DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("list tax returns: %w", err)
	}
	defer rows.Close()
	out := []TaxReturn{}
	for rows.Next() {
		var t TaxReturn
		var generatedAt time.Time
		if err := rows.Scan(&t.ID, &t.ShopID, &t.PeriodYear, &t.PeriodMonth, &t.OutputTax, &t.InputTax, &t.NetTax, &t.SalesTotal, &t.PurchasesTotal, &t.Status, &generatedAt, &t.SubmittedAt); err != nil {
			continue
		}
		t.GeneratedAt = generatedAt.Format(time.RFC3339)
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *Repository) SubmitTaxReturn(ctx context.Context, id, shopID string) error {
	query := `
		UPDATE acc_tax_returns SET status = 'submitted', submitted_at = NOW()
		WHERE id = $1 AND status = 'draft'`
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	_, err := r.pool.Exec(ctx, query, args...)
	return err
}
