package ai

import (
        "context"
        "fmt"

        "github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
)

// Repository gathers the raw shop numbers used by the AI rules engine.
// All data is real: orders, order_items, products, customers, page_visits.
type Repository struct {
        pool *db.Pool
}

// NewRepository creates a new AI repository.
func NewRepository(pool *db.Pool) *Repository {
        return &Repository{pool: pool}
}

// LoadSnapshot collects everything the engine needs for one shop.
// Current period = last 30 days; previous = the 30 days before that.
func (r *Repository) LoadSnapshot(ctx context.Context, shopID string) (*shopSnapshot, error) {
        s := &shopSnapshot{}

        // Revenue + order count for both periods (cancelled/refunded excluded).
        err := r.pool.QueryRow(ctx, `
                SELECT
                        COALESCE(SUM(total) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0),
                        COALESCE(SUM(total) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'), 0),
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')
                FROM orders
                WHERE shop_id = $1
                  AND (status IS NULL OR status::text NOT IN ('CANCELLED','REFUNDED','RETURNED'))
        `, shopID).Scan(&s.Revenue, &s.PrevRevenue, &s.Orders, &s.PrevOrders)
        if err != nil {
                return nil, fmt.Errorf("failed to load order stats: %w", err)
        }

        // Units sold in both periods.
        err = r.pool.QueryRow(ctx, `
                SELECT
                        COALESCE(SUM(oi.quantity) FILTER (WHERE o.created_at >= NOW() - INTERVAL '30 days'), 0),
                        COALESCE(SUM(oi.quantity) FILTER (WHERE o.created_at >= NOW() - INTERVAL '60 days' AND o.created_at < NOW() - INTERVAL '30 days'), 0)
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.shop_id = $1
                  AND (o.status IS NULL OR o.status::text NOT IN ('CANCELLED','REFUNDED','RETURNED'))
        `, shopID).Scan(&s.UnitsSold, &s.PrevUnitsSold)
        if err != nil {
                return nil, fmt.Errorf("failed to load units sold: %w", err)
        }

        // New customers in both periods.
        err = r.pool.QueryRow(ctx, `
                SELECT
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')
                FROM customers WHERE shop_id = $1
        `, shopID).Scan(&s.NewCustomers, &s.PrevNewCustomers)
        if err != nil {
                return nil, fmt.Errorf("failed to load customer stats: %w", err)
        }

        // Shop page visits in both periods.
        err = r.pool.QueryRow(ctx, `
                SELECT
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')
                FROM page_visits WHERE shop_id = $1
        `, shopID).Scan(&s.Visits, &s.PrevVisits)
        if err != nil {
                // page_visits is analytics-only; never fail the whole snapshot for it.
                s.Visits, s.PrevVisits = 0, 0
        }

        // Product health.
        err = r.pool.QueryRow(ctx, `
                SELECT
                        COUNT(*),
                        COUNT(*) FILTER (WHERE is_active = TRUE),
                        COUNT(*) FILTER (WHERE stock <= 5),
                        COUNT(*) FILTER (WHERE COALESCE(description, '') = ''),
                        COUNT(*) FILTER (WHERE COALESCE(image_url, '') = '')
                FROM products WHERE shop_id = $1
        `, shopID).Scan(&s.TotalProducts, &s.ActiveProducts, &s.LowStock, &s.NoDescProducts, &s.NoImageProducts)
        if err != nil {
                return nil, fmt.Errorf("failed to load product stats: %w", err)
        }

        // Shop profile for SEO audit.
        var logoURL, bannerURL, phone, description, slug = "", "", "", "", ""
        var publishedAt *string
        err = r.pool.QueryRow(ctx, `
                SELECT name, slug, COALESCE(description, ''), COALESCE(logo_url, ''),
                       COALESCE(banner_url, ''), COALESCE(phone, ''),
                       builder_published_at::text
                FROM shops WHERE id = $1
        `, shopID).Scan(&s.ShopName, &slug, &description, &logoURL, &bannerURL, &phone, &publishedAt)
        if err != nil {
                return nil, fmt.Errorf("failed to load shop profile: %w", err)
        }
        s.Slug, s.Description, s.LogoURL, s.BannerURL, s.Phone, s.PublishedAt =
                slug, description, logoURL, bannerURL, phone, publishedAt

        // Products list for SEO audit (up to 100 newest).
        rows, err := r.pool.Query(ctx, `
                SELECT id, name, COALESCE(description, ''), COALESCE(image_url, ''),
                       COALESCE(category, ''), price, updated_at::text
                FROM products WHERE shop_id = $1
                ORDER BY created_at DESC LIMIT 100
        `, shopID)
        if err != nil {
                return nil, fmt.Errorf("failed to load products for seo: %w", err)
        }
        defer rows.Close()
        s.ProductRows = []productSEORow{}
        for rows.Next() {
                var p productSEORow
                if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.ImageURL, &p.Category, &p.Price, &p.UpdatedAt); err != nil {
                        continue
                }
                s.ProductRows = append(s.ProductRows, p)
        }

        return s, nil
}
