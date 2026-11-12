package search

import (
        "context"
        "database/sql"
        "fmt"
        "time"

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
                        p.id, p.name, COALESCE(p.description, ''), p.price, p.image_url, p.shop_id,
                        COALESCE(s.slug, '') as shop_slug, s.name as shop_name, p.category,
                        ts_rank_cd(to_tsvector('arabic', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('arabic', $1)) as score
                FROM products p
                LEFT JOIN shops s ON p.shop_id = s.id
                WHERE p.is_active = true AND p.app_active = true
                  AND (to_tsvector('arabic', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('arabic', $1)
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
        countQuery := "SELECT COUNT(*) FROM products p WHERE p.is_active = true AND p.app_active = true"
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
                var image sql.NullString
                err := rows.Scan(
                        &result.ID, &result.Name, &result.Description, &result.Price,
                        &image, &result.ShopID, &result.ShopSlug, &result.ShopName, &result.Category, &result.Score,
                )
                if err != nil {
                        continue
                }
                if image.Valid {
                        img := image.String
                        result.Image = &img
                        result.ImageURL = &img
                }
                results = append(results, result)
        }

        return results, total, nil
}

// SearchShops searches for shops
func (r *Repository) SearchShops(ctx context.Context, query string, category *string, limit, offset int) ([]ShopSearchResult, int64, error) {
        searchQuery := `
                SELECT
                        s.id, s.name, s.slug, COALESCE(s.description, ''), COALESCE(s.logo_url, ''),
                        s.city, COALESCE(s.activity, '') as activity, s.category, s.rating, s.status,
                        ts_rank_cd(to_tsvector('arabic', s.name || ' ' || COALESCE(s.description, '')), plainto_tsquery('arabic', $1)) as score
                FROM shops s
                WHERE s.is_active = true AND s.public_disabled = false AND s.status = 'APPROVED'
                  AND (to_tsvector('arabic', s.name || ' ' || COALESCE(s.description, '')) @@ plainto_tsquery('arabic', $1)
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
        countQuery := "SELECT COUNT(*) FROM shops s WHERE s.is_active = true AND s.public_disabled = false AND s.status = 'APPROVED'"
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
                var logo sql.NullString
                err := rows.Scan(
                        &result.ID, &result.Name, &result.Slug, &result.Description, &logo,
                        &result.City, &result.Activity, &result.Category, &result.Rating, &result.Status, &result.Score,
                )
                if err != nil {
                        continue
                }
                if logo.Valid && logo.String != "" {
                        l := logo.String
                        result.Logo = l
                        result.Image = &l
                }
                results = append(results, result)
        }

        return results, total, nil
}

// SearchOrders searches for orders.
// Note: the schema has no order_number column — the order id is returned as
// the tracking reference instead.
func (r *Repository) SearchOrders(ctx context.Context, query string, shopID *string, userID *string, limit, offset int) ([]OrderSearchResult, int64, error) {
        searchQuery := `
                SELECT
                        o.id, o.status, o.total, COALESCE(u.name, '') as customer_name, COALESCE(s.name, '') as shop_name, o.created_at
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                LEFT JOIN shops s ON o.shop_id = s.id
                WHERE o.id ILIKE '%' || $1 || '%'
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
                var createdAt interface{}
                err := rows.Scan(
                        &result.ID, &result.Status, &result.Total,
                        &result.CustomerName, &result.ShopName, &createdAt,
                )
                if err != nil {
                        continue
                }
                if t, ok := createdAt.(time.Time); ok {
                        result.CreatedAt = t.UTC().Format(time.RFC3339)
                }
                result.OrderNumber = result.ID
                results = append(results, result)
        }

        return results, total, nil
}
