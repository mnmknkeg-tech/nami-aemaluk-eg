package invoice

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for invoice
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new invoice repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// CreateInvoice creates a new invoice
func (r *Repository) CreateInvoice(ctx context.Context, orderID, shopID string, dueDate string) (*Invoice, error) {
	id := uuid.New().String()
	now := time.Now().UTC()
	invoiceNumber := fmt.Sprintf("INV-%s", strings.ToUpper(id[:8]))

	// Get order details
	var amount float64
	var customerID string
	err := r.pool.QueryRow(ctx,
		"SELECT total, user_id FROM orders WHERE id = $1",
		orderID,
	).Scan(&amount, &customerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get order details: %w", err)
	}

	query := `
		INSERT INTO invoices (id, order_id, shop_id, customer_id, number, amount, status, due_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, order_id, shop_id, customer_id, number, amount, status, due_date, paid_at, created_at, updated_at
	`

	var invoice Invoice
	var paidAt sql.NullString

	err = r.pool.QueryRow(ctx, query,
		id, orderID, shopID, customerID, invoiceNumber, amount, InvoiceStatusPending, dueDate, now, now,
	).Scan(
		&invoice.ID, &invoice.OrderID, &invoice.ShopID, &invoice.CustomerID, &invoice.Number,
		&invoice.Amount, &invoice.Status, &invoice.DueDate, &paidAt, &invoice.CreatedAt, &invoice.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create invoice: %w", err)
	}

	if paidAt.Valid {
		invoice.PaidAt = &paidAt.String
	}

	invoice.CreatedAt = now.UTC().Format(time.RFC3339)
	invoice.UpdatedAt = now.UTC().Format(time.RFC3339)

	return &invoice, nil
}

// GetInvoiceByID retrieves an invoice by ID
func (r *Repository) GetInvoiceByID(ctx context.Context, id string) (*Invoice, error) {
	query := `
		SELECT id, order_id, shop_id, customer_id, number, amount, status, due_date, paid_at, created_at, updated_at
		FROM invoices
		WHERE id = $1
	`

	var invoice Invoice
	var paidAt sql.NullString

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&invoice.ID, &invoice.OrderID, &invoice.ShopID, &invoice.CustomerID, &invoice.Number,
		&invoice.Amount, &invoice.Status, &invoice.DueDate, &paidAt, &invoice.CreatedAt, &invoice.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invoice not found")
		}
		return nil, fmt.Errorf("failed to get invoice: %w", err)
	}

	if paidAt.Valid {
		invoice.PaidAt = &paidAt.String
	}

	return &invoice, nil
}

// ListInvoices retrieves invoices with filters
func (r *Repository) ListInvoices(ctx context.Context, shopID, customerID *string, status *InvoiceStatus, limit, offset int) ([]Invoice, int64, error) {
	query := `
		SELECT id, order_id, shop_id, customer_id, number, amount, status, due_date, paid_at, created_at, updated_at
		FROM invoices
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if shopID != nil {
		query += fmt.Sprintf(" AND shop_id = $%d", argIndex)
		args = append(args, *shopID)
		argIndex++
	}

	if customerID != nil {
		query += fmt.Sprintf(" AND customer_id = $%d", argIndex)
		args = append(args, *customerID)
		argIndex++
	}

	if status != nil {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, *status)
		argIndex++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM invoices WHERE 1=1"
	countArgs := []interface{}{}
	countArgIndex := 1

	if shopID != nil {
		countQuery += fmt.Sprintf(" AND shop_id = $%d", countArgIndex)
		countArgs = append(countArgs, *shopID)
		countArgIndex++
	}

	if customerID != nil {
		countQuery += fmt.Sprintf(" AND customer_id = $%d", countArgIndex)
		countArgs = append(countArgs, *customerID)
		countArgIndex++
	}

	if status != nil {
		countQuery += fmt.Sprintf(" AND status = $%d", countArgIndex)
		countArgs = append(countArgs, *status)
		countArgIndex++
	}

	var total int64
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count invoices: %w", err)
	}

	// Get results
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query invoices: %w", err)
	}
	defer rows.Close()

	var invoices []Invoice
	for rows.Next() {
		var invoice Invoice
		var paidAt sql.NullString

		err := rows.Scan(
			&invoice.ID, &invoice.OrderID, &invoice.ShopID, &invoice.CustomerID, &invoice.Number,
			&invoice.Amount, &invoice.Status, &invoice.DueDate, &paidAt, &invoice.CreatedAt, &invoice.UpdatedAt,
		)
		if err != nil {
			continue
		}

		if paidAt.Valid {
			invoice.PaidAt = &paidAt.String
		}

		invoices = append(invoices, invoice)
	}

	return invoices, total, nil
}

// UpdateInvoiceStatus updates the status of an invoice
func (r *Repository) UpdateInvoiceStatus(ctx context.Context, id string, status InvoiceStatus) error {
	query := `UPDATE invoices SET status = $1, updated_at = NOW()`
	if status == InvoiceStatusPaid {
		query += `, paid_at = NOW()`
	}
	query += ` WHERE id = $2`

	_, err := r.pool.Exec(ctx, query, status, id)
	return err
}
