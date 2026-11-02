package analytics

import (
	"context"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
)

// Repository handles database operations for analytics
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new analytics repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// GetSystemAnalytics retrieves overall system analytics
func (r *Repository) GetSystemAnalytics(ctx context.Context, filter *MetricsFilter) (*SystemAnalytics, error) {
	// Get time range
	start, end, err := r.parseTimeRange(filter.TimeRange, filter.StartDate, filter.EndDate)
	if err != nil {
		return nil, err
	}

	// Query counts and aggregations
	var totalUsers, totalShops, totalOrders int64
	var totalRevenue, totalVisits float64

	// Get total users
	err = r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&totalUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	// Get total shops
	err = r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM shops").Scan(&totalShops)
	if err != nil {
		return nil, fmt.Errorf("failed to count shops: %w", err)
	}

	// Get total orders in time range
	err = r.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM orders WHERE created_at >= $1 AND created_at <= $2 AND status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERED')",
		start, end).Scan(&totalOrders)
	if err != nil {
		return nil, fmt.Errorf("failed to count orders: %w", err)
	}

	// Get total revenue in time range
	err = r.pool.QueryRow(ctx,
		"SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at >= $1 AND created_at <= $2 AND status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERED')",
		start, end).Scan(&totalRevenue)
	if err != nil {
		return nil, fmt.Errorf("failed to sum revenue: %w", err)
	}

	// Get total visits (sum of shop visitors)
	err = r.pool.QueryRow(ctx, "SELECT COALESCE(SUM(visitors), 0) FROM shops").Scan(&totalVisits)
	if err != nil {
		return nil, fmt.Errorf("failed to sum visitors: %w", err)
	}

	return &SystemAnalytics{
		TotalRevenue:   totalRevenue,
		TotalOrders:    totalOrders,
		TotalUsers:     totalUsers,
		TotalShops:     totalShops,
		TotalVisits:    int64(totalVisits),
		RevenueGrowth:  0, // Calculate based on previous period
		OrderGrowth:    0, // Calculate based on previous period
		CustomerGrowth: 0, // Calculate based on previous period
	}, nil
}

// GetTimeseriesData retrieves time-series data for metrics
func (r *Repository) GetTimeseriesData(ctx context.Context, filter *MetricsFilter) ([]TimeseriesData, error) {
	days := 7
	if filter.TimeRange == TimeRangeLast30Days {
		days = 30
	} else if filter.TimeRange == TimeRangeLast90Days {
		days = 90
	}

	start, end, err := r.parseTimeRange(filter.TimeRange, filter.StartDate, filter.EndDate)
	if err != nil {
		return nil, err
	}

	// Create date buckets
	data := make([]TimeseriesData, 0, days)
	for i := 0; i < days; i++ {
		date := start.AddDate(0, 0, i)
		data = append(data, TimeseriesData{
			Date:    date.Format("2006-01-02"),
			Revenue: 0,
			Orders:  0,
		})
	}

	// Query orders by date
	query := `
		SELECT 
			DATE(created_at) as date,
			COUNT(*) as orders,
			COALESCE(SUM(total), 0) as revenue
		FROM orders
		WHERE created_at >= $1 AND created_at <= $2 
			AND status IN ('CONFIRMED', 'PREPARING', 'READY', 'DELIVERED')
		GROUP BY DATE(created_at)
		ORDER BY date
	`

	rows, err := r.pool.Query(ctx, query, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to query timeseries data: %w", err)
	}
	defer rows.Close()

	dateMap := make(map[string]TimeseriesData)
	for rows.Next() {
		var date time.Time
		var orders int64
		var revenue float64

		err := rows.Scan(&date, &orders, &revenue)
		if err != nil {
			return nil, fmt.Errorf("failed to scan timeseries row: %w", err)
		}

		dateMap[date.Format("2006-01-02")] = TimeseriesData{
			Date:    date.Format("2006-01-02"),
			Revenue: revenue,
			Orders:  orders,
		}
	}

	// Merge with buckets
	for i := range data {
		if entry, exists := dateMap[data[i].Date]; exists {
			data[i] = entry
		}
	}

	return data, nil
}

// GetSystemActivity retrieves recent system activity
func (r *Repository) GetSystemActivity(ctx context.Context, limit int) ([]ActivityEvent, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	events := make([]ActivityEvent, 0)

	// Get recent orders
	orderQuery := `
		SELECT id, total, status, created_at 
		FROM orders 
		ORDER BY created_at DESC 
		LIMIT $1
	`

	rows, err := r.pool.Query(ctx, orderQuery, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query recent orders: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var total float64
		var status string
		var createdAt time.Time

		err := rows.Scan(&id, &total, &status, &createdAt)
		if err != nil {
			continue
		}

		statusLabel := r.getOrderStatusLabel(status)
		events = append(events, ActivityEvent{
			ID:        "order:" + id,
			Type:      "order",
			Title:     fmt.Sprintf("طلب %s • %.2f", statusLabel, total),
			CreatedAt: createdAt.Format(time.RFC3339),
			Color:     "#10b981",
		})
	}

	// Get recent shops
	shopQuery := `
		SELECT id, name, status, created_at 
		FROM shops 
		ORDER BY created_at DESC 
		LIMIT $1
	`

	rows, err = r.pool.Query(ctx, shopQuery, limit)
	if err != nil {
		return events, nil // Return what we have
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var name string
		var status string
		var createdAt time.Time

		err := rows.Scan(&id, &name, &status, &createdAt)
		if err != nil {
			continue
		}

		statusLabel := r.getShopStatusLabel(status)
		events = append(events, ActivityEvent{
			ID:        "shop:" + id,
			Type:      "shop",
			Title:     fmt.Sprintf("متجر: %s (%s)", name, statusLabel),
			CreatedAt: createdAt.Format(time.RFC3339),
			Color:     "#f59e0b",
		})
	}

	// Get recent users
	userQuery := `
		SELECT id, name, role, created_at 
		FROM users 
		ORDER BY created_at DESC 
		LIMIT $1
	`

	rows, err = r.pool.Query(ctx, userQuery, limit)
	if err != nil {
		return events, nil // Return what we have
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var name string
		var role string
		var createdAt time.Time

		err := rows.Scan(&id, &name, &role, &createdAt)
		if err != nil {
			continue
		}

		roleLabel := r.getUserRoleLabel(role)
		events = append(events, ActivityEvent{
			ID:        "user:" + id,
			Type:      "user",
			Title:     fmt.Sprintf("تسجيل %s جديد: %s", roleLabel, name),
			CreatedAt: createdAt.Format(time.RFC3339),
			Color:     "#00E5FF",
		})
	}

	// Sort by created date descending
	// (In production, you'd want to do this in the query or with proper sorting)
	return events, nil
}

// GetShopAnalytics retrieves analytics for a specific shop
func (r *Repository) GetShopAnalytics(ctx context.Context, shopID string, filter *MetricsFilter) (*ShopAnalytics, error) {
	start, end, err := r.parseTimeRange(filter.TimeRange, filter.StartDate, filter.EndDate)
	if err != nil {
		return nil, err
	}

	var totalOrders int64
	var totalRevenue float64
	var totalVisitors int64

	// Get shop orders
	err = r.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM orders WHERE shop_id = $1 AND created_at >= $2 AND created_at <= $3",
		shopID, start, end).Scan(&totalOrders)
	if err != nil {
		return nil, fmt.Errorf("failed to count shop orders: %w", err)
	}

	// Get shop revenue
	err = r.pool.QueryRow(ctx,
		"SELECT COALESCE(SUM(total), 0) FROM orders WHERE shop_id = $1 AND created_at >= $2 AND created_at <= $3",
		shopID, start, end).Scan(&totalRevenue)
	if err != nil {
		return nil, fmt.Errorf("failed to sum shop revenue: %w", err)
	}

	// Get shop visitors
	err = r.pool.QueryRow(ctx, "SELECT COALESCE(visitors, 0) FROM shops WHERE id = $1", shopID).Scan(&totalVisitors)
	if err != nil {
		return nil, fmt.Errorf("failed to get shop visitors: %w", err)
	}

	// Calculate average order value
	averageOrder := 0.0
	if totalOrders > 0 {
		averageOrder = totalRevenue / float64(totalOrders)
	}

	// Calculate conversion rate (simplified)
	conversionRate := 0.0
	if totalVisitors > 0 {
		conversionRate = (float64(totalOrders) / float64(totalVisitors)) * 100
	}

	return &ShopAnalytics{
		ShopID:         shopID,
		TotalRevenue:   totalRevenue,
		TotalOrders:    totalOrders,
		TotalVisitors:  int64(totalVisitors),
		AverageOrder:   averageOrder,
		ConversionRate: conversionRate,
		TopProducts:    []ProductPerformance{},
		RecentActivity: []ActivityEvent{},
	}, nil
}

// GetUserAnalytics retrieves analytics for a specific user
func (r *Repository) GetUserAnalytics(ctx context.Context, userID string, filter *MetricsFilter) (*UserAnalytics, error) {
	start, end, err := r.parseTimeRange(filter.TimeRange, filter.StartDate, filter.EndDate)
	if err != nil {
		return nil, err
	}

	var totalOrders int64
	var totalSpent float64

	// Get user orders
	err = r.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM orders WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3",
		userID, start, end).Scan(&totalOrders)
	if err != nil {
		return nil, fmt.Errorf("failed to count user orders: %w", err)
	}

	// Get user spending
	err = r.pool.QueryRow(ctx,
		"SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3",
		userID, start, end).Scan(&totalSpent)
	if err != nil {
		return nil, fmt.Errorf("failed to sum user spending: %w", err)
	}

	return &UserAnalytics{
		UserID:         userID,
		TotalOrders:    totalOrders,
		TotalSpent:     totalSpent,
		FavoriteShops:  []string{},
		RecentActivity: []ActivityEvent{},
	}, nil
}

// GetProductPerformance retrieves performance metrics for products
func (r *Repository) GetProductPerformance(ctx context.Context, shopID string, filter *MetricsFilter) ([]ProductPerformance, error) {
	start, end, err := r.parseTimeRange(filter.TimeRange, filter.StartDate, filter.EndDate)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT 
			p.id,
			p.name,
			COALESCE(SUM(oi.quantity), 0) as orders,
			COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
		FROM products p
		LEFT JOIN order_items oi ON p.id = oi.product_id
		LEFT JOIN orders o ON oi.order_id = o.id
		WHERE p.shop_id = $1 
			AND (o.created_at >= $2 OR o.created_at IS NULL)
			AND (o.created_at <= $3 OR o.created_at IS NULL)
		GROUP BY p.id, p.name
		ORDER BY revenue DESC
		LIMIT 10
	`

	rows, err := r.pool.Query(ctx, query, shopID, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to query product performance: %w", err)
	}
	defer rows.Close()

	products := make([]ProductPerformance, 0)
	for rows.Next() {
		var p ProductPerformance
		var productID, productName string
		var orders int64
		var revenue float64

		err := rows.Scan(&productID, &productName, &orders, &revenue)
		if err != nil {
			continue
		}

		p = ProductPerformance{
			ProductID:   productID,
			ProductName: productName,
			Revenue:     revenue,
			Orders:      orders,
			Views:       0, // Would need separate tracking
		}

		products = append(products, p)
	}

	return products, nil
}

// Helper functions for labels
func (r *Repository) getOrderStatusLabel(status string) string {
	switch status {
	case "DELIVERED":
		return "تم التوصيل"
	case "CANCELLED":
		return "ملغي"
	case "CONFIRMED":
		return "مؤكد"
	case "READY":
		return "جاهز"
	case "PREPARING":
		return "قيد التجهيز"
	default:
		return "طلب جديد"
	}
}

func (r *Repository) getShopStatusLabel(status string) string {
	switch status {
	case "APPROVED":
		return "تمت الموافقة"
	case "PENDING":
		return "طلب جديد"
	case "REJECTED":
		return "مرفوض"
	default:
		return "تحديث"
	}
}

func (r *Repository) getUserRoleLabel(role string) string {
	switch role {
	case "MERCHANT":
		return "تاجر"
	case "COURIER":
		return "مندوب"
	case "ADMIN":
		return "آدمن"
	default:
		return "مستخدم"
	}
}

// parseTimeRange parses a time range and returns start/end dates
func (r *Repository) parseTimeRange(timeRange TimeRange, startDate, endDate *string) (time.Time, time.Time, error) {
	now := time.Now().UTC()

	switch timeRange {
	case TimeRangeToday:
		start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		return start, now, nil
	case TimeRangeYesterday:
		yesterday := now.AddDate(0, 0, -1)
		start := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, time.UTC)
		end := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 0, time.UTC)
		return start, end, nil
	case TimeRangeLast7Days:
		start := now.AddDate(0, 0, -7)
		return start, now, nil
	case TimeRangeLast30Days:
		start := now.AddDate(0, 0, -30)
		return start, now, nil
	case TimeRangeLast90Days:
		start := now.AddDate(0, 0, -90)
		return start, now, nil
	case TimeRangeThisMonth:
		start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		return start, now, nil
	case TimeRangeLastMonth:
		lastMonth := now.AddDate(0, -1, 0)
		start := time.Date(lastMonth.Year(), lastMonth.Month(), 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).Add(-time.Second)
		return start, end, nil
	case TimeRangeThisYear:
		start := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
		return start, now, nil
	case TimeRangeCustom:
		if startDate == nil || endDate == nil {
			return time.Time{}, time.Time{}, fmt.Errorf("start_date and end_date required for custom range")
		}
		start, err := time.Parse("2006-01-02", *startDate)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid start_date format: %w", err)
		}
		end, err := time.Parse("2006-01-02", *endDate)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid end_date format: %w", err)
		}
		return start.UTC(), end.UTC(), nil
	default:
		// Default to last 7 days
		start := now.AddDate(0, 0, -7)
		return start, now, nil
	}
}
