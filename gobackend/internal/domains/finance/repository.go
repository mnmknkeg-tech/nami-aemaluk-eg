package finance

import (
	"context"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
)

// Repository contains the finance report queries. They aggregate directly from
// the orders/order_items/products tables; there are no finance-owned tables.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new finance repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// GetCashflowSummary returns 6-month cashflow. Outflows are reported as 0 until
// an expenses source table exists (the previous fin_expenses table never had a
// migration, so querying it silently failed on every request).
func (r *Repository) GetCashflowSummary(ctx context.Context, shopID string) (*CashflowSummary, error) {
	now := time.Now()
	sixMonthsAgo := now.AddDate(0, -5, 0)
	start := time.Date(sixMonthsAgo.Year(), sixMonthsAgo.Month(), 1, 0, 0, 0, 0, time.UTC)

	var inflows float64

	// Inflows from delivered orders
	_ = r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(total), 0) FROM orders
		 WHERE shop_id = $1 AND created_at >= $2
		   AND status IN ('CONFIRMED','PREPARING','READY','DELIVERED')`,
		shopID, start).Scan(&inflows)

	monthly := make([]CashflowMonthly, 0, 6)
	for i := 0; i < 6; i++ {
		mStart := start.AddDate(0, i, 0)
		mEnd := mStart.AddDate(0, 1, 0)
		var mIn float64
		_ = r.pool.QueryRow(ctx,
			`SELECT COALESCE(SUM(total), 0) FROM orders
			 WHERE shop_id = $1 AND created_at >= $2 AND created_at < $3
			   AND status IN ('CONFIRMED','PREPARING','READY','DELIVERED')`,
			shopID, mStart, mEnd).Scan(&mIn)
		monthly = append(monthly, CashflowMonthly{
			Month:  mStart.Format("Jan"),
			Inflow: round2(mIn),
		})
	}

	return &CashflowSummary{
		ShopID:      shopID,
		Inflows:     round2(inflows),
		Outflows:    0,
		NetCashflow: round2(inflows),
		Monthly:     monthly,
	}, nil
}

func (r *Repository) GetProfitSummary(ctx context.Context, shopID string) (*ProfitSummary, error) {
	var revenue float64
	var cogs float64

	_ = r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(total), 0) FROM orders
		 WHERE shop_id = $1 AND status IN ('CONFIRMED','PREPARING','READY','DELIVERED')`,
		shopID).Scan(&revenue)

	_ = r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(oi.quantity * COALESCE(p.cost, p.cost_price, 0)), 0)
		 FROM order_items oi
		 JOIN orders o ON oi.order_id = o.id
		 JOIN products p ON oi.product_id = p.id
		 WHERE o.shop_id = $1 AND o.status IN ('CONFIRMED','PREPARING','READY','DELIVERED')`,
		shopID).Scan(&cogs)

	grossProfit := revenue - cogs
	margin := 0.0
	if revenue > 0 {
		margin = (grossProfit / revenue) * 100
	}

	return &ProfitSummary{
		ShopID:      shopID,
		Revenue:     round2(revenue),
		COGS:        round2(cogs),
		GrossProfit: round2(grossProfit),
		Margin:      round2(margin),
	}, nil
}

func (r *Repository) GetRevenueSummary(ctx context.Context, shopID string) (*RevenueSummary, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local)

	var totalRevenue float64
	var todayRevenue float64
	var monthRevenue float64
	var orderCount int64

	_ = r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(total), 0), COUNT(*) FROM orders
		 WHERE shop_id = $1 AND status IN ('CONFIRMED','PREPARING','READY','DELIVERED')`,
		shopID).Scan(&totalRevenue, &orderCount)
	_ = r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(total), 0) FROM orders
		 WHERE shop_id = $1 AND created_at >= $2 AND status IN ('CONFIRMED','PREPARING','READY','DELIVERED')`,
		shopID, todayStart).Scan(&todayRevenue)
	_ = r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(total), 0) FROM orders
		 WHERE shop_id = $1 AND created_at >= $2 AND status IN ('CONFIRMED','PREPARING','READY','DELIVERED')`,
		shopID, monthStart).Scan(&monthRevenue)

	avgOrder := 0.0
	if orderCount > 0 {
		avgOrder = totalRevenue / float64(orderCount)
	}

	// Recent orders
	rows, err := r.pool.Query(ctx,
		`SELECT o.id, COALESCE(o.order_number, o.id::text), COALESCE(o.customer_name, ''), o.total
		 FROM orders o
		 WHERE o.shop_id = $1 AND o.status IN ('CONFIRMED','PREPARING','READY','DELIVERED')
		 ORDER BY o.created_at DESC LIMIT 10`, shopID)
	recent := make([]RevenueOrder, 0)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ro RevenueOrder
			if err := rows.Scan(&ro.ID, &ro.OrderNumber, &ro.CustomerName, &ro.Total); err != nil {
				continue
			}
			recent = append(recent, ro)
		}
	}

	return &RevenueSummary{
		ShopID:       shopID,
		TotalRevenue: round2(totalRevenue),
		TodayRevenue: round2(todayRevenue),
		MonthRevenue: round2(monthRevenue),
		AvgOrder:     round2(avgOrder),
		RecentOrders: recent,
	}, nil
}

// helpers

func round2(v float64) float64 {
	if v == 0 {
		return 0
	}
	return float64(int64(v*100+0.5)) / 100
}
