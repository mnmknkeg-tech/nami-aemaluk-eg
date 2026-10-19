package search

import (
	"context"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
)

// Repository handles database operations for search
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new search repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// SearchProducts searches for products
func (r *Repository) SearchProducts(ctx context.Context, query string, shopID *string, category *string, minPrice, maxPrice *float64, limit, offset int) ([]ProductSearchResult, int64, error) {
	searchQuery := `
		SELECT 
			p.id, p.name, p.description, p.price, p.image, p.shop_id, s.name as shop_name, p.category,
			ts_rank_cd(to_tsvector('arabic', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('arabic', $1)) as score
		FROM products p
		LEFT JOIN shops s ON p.shop_id = s.id
		WHERE (to_tsvector('arabic', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('arabic', $1)
			OR p.name ILIKE '%' || $1 || '%'
			OR p.description ILIKE '%' || $1 || '%')
	`
	args := []interface{}{query}
	argIndex := 2

	if shopID != nil {
		searchQuery += fmt.Sprintf(" AND p.shop_id = $%d", argIndex)
		args = append(args, *shopID)
		argIndex++
	}

	if category != nil {
		searchQuery += fmt.Sprintf(" AND p.category = $%d", argIndex)
		args = append(args, *category)
		argIndex++
	}

	if minPrice != nil {
		searchQuery += fmt.Sprintf(" AND p.price >= $%d", argIndex)
		args = append(args, *minPrice)
		argIndex++
	}

	if maxPrice != nil {
		searchQuery += fmt.Sprintf(" AND p.price <= $%d", argIndex)
		args = append(args, *maxPrice)
		argIndex++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM products p WHERE 1=1"
	countArgs := []interface{}{}
	countArgIndex := 1

	if shopID != nil {
		countQuery += fmt.Sprintf(" AND p.shop_id = $%d", countArgIndex)
		countArgs = append(countArgs, *shopID)
		countArgIndex++
	}

	if category != nil {
		countQuery += fmt.Sprintf(" AND p.category = $%d", countArgIndex)
		countArgs = append(countArgs, *category)
		countArgIndex++
	}

	if minPrice != nil {
		countQuery += fmt.Sprintf(" AND p.price >= $%d", countArgIndex)
		countArgs = append(countArgs, *minPrice)
		countArgIndex++
	}

	if maxPrice != nil {
		countQuery += fmt.Sprintf(" AND p.price <= $%d", countArgIndex)
		countArgs = append(countArgs, *maxPrice)
		countArgIndex++
	}

	var total int64
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count products: %w", err)
	}

	// Get results
	searchQuery += fmt.Sprintf(" ORDER BY score DESC, p.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, searchQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search products: %w", err)
	}
	defer rows.Close()

	var results []ProductSearchResult
	for rows.Next() {
		var result ProductSearchResult
		err := rows.Scan(
			&result.ID, &result.Name, &result.Description, &result.Price,
			&result.Image, &result.ShopID, &result.ShopName, &result.Category, &result.Score,
		)
		if err != nil {
			continue
		}
		results = append(results, result)
	}

	return results, total, nil
}

// SearchShops searches for shops
func (r *Repository) SearchShops(ctx context.Context, query string, category *string, limit, offset int) ([]ShopSearchResult, int64, error) {
	searchQuery := `
		SELECT 
			s.id, s.name, s.description, s.image, s.category, s.rating, s.status,
			ts_rank_cd(to_tsvector('arabic', s.name || ' ' || COALESCE(s.description, '')), plainto_tsquery('arabic', $1)) as score
		FROM shops s
		WHERE (to_tsvector('arabic', s.name || ' ' || COALESCE(s.description, '')) @@ plainto_tsquery('arabic', $1)
			OR s.name ILIKE '%' || $1 || '%'
			OR s.description ILIKE '%' || $1 || '%')
	`
	args := []interface{}{query}
	argIndex := 2

	if category != nil {
		searchQuery += fmt.Sprintf(" AND s.category = $%d", argIndex)
		args = append(args, *category)
		argIndex++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM shops s WHERE 1=1"
	countArgs := []interface{}{}
	countArgIndex := 1

	if category != nil {
		countQuery += fmt.Sprintf(" AND s.category = $%d", countArgIndex)
		countArgs = append(countArgs, *category)
		countArgIndex++
	}

	var total int64
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count shops: %w", err)
	}

	// Get results
	searchQuery += fmt.Sprintf(" ORDER BY score DESC, s.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, searchQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search shops: %w", err)
	}
	defer rows.Close()

	var results []ShopSearchResult
	for rows.Next() {
		var result ShopSearchResult
		err := rows.Scan(
			&result.ID, &result.Name, &result.Description, &result.Image,
			&result.Category, &result.Rating, &result.Status, &result.Score,
		)
		if err != nil {
			continue
		}
		results = append(results, result)
	}

	return results, total, nil
}

// SearchOrders searches for orders
func (r *Repository) SearchOrders(ctx context.Context, query string, shopID *string, userID *string, limit, offset int) ([]OrderSearchResult, int64, error) {
	searchQuery := `
		SELECT 
			o.id, o.order_number, o.status, o.total, u.name as customer_name, s.name as shop_name, o.created_at
		FROM orders o
		LEFT JOIN users u ON o.user_id = u.id
		LEFT JOIN shops s ON o.shop_id = s.id
		WHERE o.order_number ILIKE '%' || $1 || '%'
		OR u.name ILIKE '%' || $1 || '%'
		OR s.name ILIKE '%' || $1 || '%'
	`
	args := []interface{}{query}
	argIndex := 2

	if shopID != nil {
		searchQuery += fmt.Sprintf(" AND o.shop_id = $%d", argIndex)
		args = append(args, *shopID)
		argIndex++
	}

	if userID != nil {
		searchQuery += fmt.Sprintf(" AND o.user_id = $%d", argIndex)
		args = append(args, *userID)
		argIndex++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM orders o WHERE 1=1"
	countArgs := []interface{}{}
	countArgIndex := 1

	if shopID != nil {
		countQuery += fmt.Sprintf(" AND o.shop_id = $%d", countArgIndex)
		countArgs = append(countArgs, *shopID)
		countArgIndex++
	}

	if userID != nil {
		countQuery += fmt.Sprintf(" AND o.user_id = $%d", countArgIndex)
		countArgs = append(countArgs, *userID)
		countArgIndex++
	}

	var total int64
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count orders: %w", err)
	}

	// Get results
	searchQuery += fmt.Sprintf(" ORDER BY o.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, searchQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search orders: %w", err)
	}
	defer rows.Close()

	var results []OrderSearchResult
	for rows.Next() {
		var result OrderSearchResult
		err := rows.Scan(
			&result.ID, &result.OrderNumber, &result.Status, &result.Total,
			&result.CustomerName, &result.ShopName, &result.CreatedAt,
		)
		if err != nil {
			continue
		}
		results = append(results, result)
	}

	return results, total, nil
}
