package customers

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
)

// Repository handles database operations for customers
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new customers repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// ListCustomers retrieves all customers
func (r *Repository) ListCustomers(ctx context.Context, shopID *string, limit, offset int) ([]Customer, int64, error) {
	query := `
		SELECT u.id, u.name, u.email, u.phone, u.created_at, u.updated_at
		FROM users u
		WHERE u.role = 'CUSTOMER'
	`
	args := []interface{}{}
	argIndex := 1

	if shopID != nil {
		query += fmt.Sprintf(" AND u.shop_id = $%d", argIndex)
		args = append(args, *shopID)
		argIndex++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER'"
	countArgs := []interface{}{}
	countArgIndex := 1

	if shopID != nil {
		countQuery += fmt.Sprintf(" AND shop_id = $%d", countArgIndex)
		countArgs = append(countArgs, *shopID)
		countArgIndex++
	}

	var total int64
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count customers: %w", err)
	}

	// Get results
	query += fmt.Sprintf(" ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query customers: %w", err)
	}
	defer rows.Close()

	var customers []Customer
	for rows.Next() {
		var customer Customer

		err := rows.Scan(
			&customer.ID, &customer.Name, &customer.Email, &customer.Phone,
			&customer.CreatedAt, &customer.UpdatedAt,
		)
		if err != nil {
			continue
		}

		// Get customer stats
		stats, _ := r.GetCustomerStats(ctx, customer.ID)
		if stats != nil {
			customer.TotalOrders = stats.TotalOrders
			customer.TotalSpent = stats.TotalSpent
		}

		customers = append(customers, customer)
	}

	return customers, total, nil
}

// GetCustomerByID retrieves a customer by ID
func (r *Repository) GetCustomerByID(ctx context.Context, id string) (*Customer, error) {
	query := `
		SELECT u.id, u.name, u.email, u.phone, u.created_at, u.updated_at
		FROM users u
		WHERE u.id = $1 AND u.role = 'CUSTOMER'
	`

	var customer Customer

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&customer.ID, &customer.Name, &customer.Email, &customer.Phone,
		&customer.CreatedAt, &customer.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("customer not found")
		}
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}

	// Get customer stats
	stats, _ := r.GetCustomerStats(ctx, customer.ID)
	if stats != nil {
		customer.TotalOrders = stats.TotalOrders
		customer.TotalSpent = stats.TotalSpent
	}

	return &customer, nil
}

// GetCustomerStats retrieves customer statistics
func (r *Repository) GetCustomerStats(ctx context.Context, customerID string) (*CustomerStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_orders,
			COUNT(*) FILTER (WHERE status = 'DELIVERED') as completed_orders,
			COALESCE(SUM(total), 0) as total_spent,
			COALESCE(AVG(total), 0) as avg_order_value,
			MAX(created_at) as last_order_at
		FROM orders
		WHERE user_id = $1
	`

	var stats CustomerStats
	var lastOrderAt sql.NullString

	err := r.pool.QueryRow(ctx, query, customerID).Scan(
		&stats.TotalOrders, &stats.CompletedOrders, &stats.TotalSpent, &stats.AvgOrderValue, &lastOrderAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get customer stats: %w", err)
	}

	stats.CustomerID = customerID

	if lastOrderAt.Valid {
		stats.LastOrderAt = &lastOrderAt.String
	}

	return &stats, nil
}
