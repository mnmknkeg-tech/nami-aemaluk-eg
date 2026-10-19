package dashboard

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

const revenueOrderFilter = `AND o.status NOT IN ('CANCELLED', 'REFUNDED')`

// Revenue handles GET /revenue/shop/:shopId — daily revenue derived from orders.
func (h *Handler) Revenue(c *fiber.Ctx) error {
	_, shopID, ok := h.resolveShop(c, "")
	if !ok {
		return nil
	}
	rows, err := h.pool.Query(c.Context(), `
		WITH days AS (
			SELECT generate_series(
				CURRENT_DATE - INTERVAL '29 days',
				CURRENT_DATE,
				INTERVAL '1 day'
			)::date AS d
		),
		totals AS (
			SELECT DATE(o.created_at) AS d,
			       COALESCE(SUM(o.total), 0) AS revenue,
			       COUNT(*) AS orders
			FROM orders o
			WHERE o.shop_id = $1 `+revenueOrderFilter+`
			GROUP BY DATE(o.created_at)
		)
		SELECT days.d::text,
		       COALESCE(t.revenue, 0), COALESCE(t.orders, 0),
		       CASE WHEN COALESCE(t.orders, 0) > 0 THEN t.revenue / t.orders ELSE 0 END,
		       COALESCE(LAG(t.revenue) OVER (ORDER BY days.d), 0)
		FROM days LEFT JOIN totals t ON t.d = days.d
		ORDER BY days.d`,
		shopID,
	)
	if err != nil {
		return handleErr(c, err)
	}
	defer rows.Close()

	out := []map[string]any{}
	i := 0
	for rows.Next() {
		var (
			day      string
			revenue  float64
			orders   int64
			aov      float64
			prev     float64
		)
		if err := rows.Scan(&day, &revenue, &orders, &aov, &prev); err != nil {
			return handleErr(c, err)
		}
		growth := 0.0
		if i > 0 && prev > 0 {
			growth = (revenue - prev) / prev * 100
		}
		start, _ := time.Parse("2006-01-02", day)
		out = append(out, map[string]any{
			"id":               fmt.Sprintf("rev-%s", day),
			"period":           "daily",
			"startDate":        start.Format(time.RFC3339),
			"endDate":          start.Add(24*time.Hour - time.Second).Format(time.RFC3339),
			"totalRevenue":     revenue,
			"totalOrders":      orders,
			"averageOrderValue": aov,
			"growth":           growth,
			"category":         "all",
		})
		i++
	}
	return c.JSON(fiber.Map{"success": true, "data": out})
}

// Cashflow handles GET /cashflow/shop/:shopId — inflow (orders) + outflow (expenses).
func (h *Handler) Cashflow(c *fiber.Ctx) error {
	_, shopID, ok := h.resolveShop(c, "")
	if !ok {
		return nil
	}
	rows, err := h.pool.Query(c.Context(), `
		SELECT id, occurred_at, direction, category, description, amount FROM (
			SELECT 'in-' || o.id AS id, o.created_at AS occurred_at, 'inflow' AS direction,
			       'sales' AS category, 'طلب #' || LEFT(o.id, 8) AS description, o.total AS amount
			FROM orders o
			WHERE o.shop_id = $1 `+revenueOrderFilter+`
			UNION ALL
			SELECT 'out-' || e.id, e.created_at, 'outflow',
			       COALESCE(e.data->>'category', 'general'),
			       COALESCE(e.data->>'description', 'مصروف'),
			       COALESCE((e.data->>'amount')::float8, 0)
			FROM dashboard_entities e
			WHERE e.kind = 'expense' AND e.shop_id = $1
		) cf
		ORDER BY cf.occurred_at ASC
		LIMIT 500`,
		shopID,
	)
	if err != nil {
		return handleErr(c, err)
	}
	defer rows.Close()

	out := []map[string]any{}
	balance := 0.0
	for rows.Next() {
		var (
			id          string
			occurredAt  time.Time
			direction   string
			category    string
			description string
			amount      float64
		)
		if err := rows.Scan(&id, &occurredAt, &direction, &category, &description, &amount); err != nil {
			return handleErr(c, err)
		}
		if direction == "outflow" {
			balance -= amount
		} else {
			balance += amount
		}
		out = append(out, map[string]any{
			"id":          id,
			"date":        occurredAt.UTC().Format(time.RFC3339),
			"type":        direction,
			"category":    category,
			"description": description,
			"amount":      amount,
			"balance":     balance,
			"reference":   strings.ToUpper(id[:10]),
			"createdAt":   occurredAt.UTC().Format(time.RFC3339),
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": out})
}

// Profits handles GET /finance/profits/shop/:shopId?period&from&to.
func (h *Handler) Profits(c *fiber.Ctx) error {
	_, shopID, ok := h.resolveShop(c, "")
	if !ok {
		return nil
	}
	from := c.Query("from")
	to := c.Query("to")
	if from == "" {
		from = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}

	var totalRevenue, totalExpenses float64
	var topProducts []map[string]any

	err := h.pool.QueryRow(c.Context(), `
		SELECT
		  COALESCE((SELECT SUM(total) FROM orders WHERE shop_id = $1 AND created_at >= $2 AND created_at <= $3::date + INTERVAL '1 day' AND status NOT IN ('CANCELLED', 'REFUNDED')), 0),
		  COALESCE((SELECT SUM(COALESCE((data->>'amount')::float8, 0)) FROM dashboard_entities WHERE kind = 'expense' AND shop_id = $1 AND created_at >= $2 AND created_at <= $3::date + INTERVAL '1 day'), 0)
		`, shopID, from, to,
	).Scan(&totalRevenue, &totalExpenses)
	if err != nil {
		return handleErr(c, err)
	}

	productRows, err := h.pool.Query(c.Context(), `
		SELECT COALESCE(p.name, 'منتج محذوف'),
		       COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		LEFT JOIN products p ON p.id = oi.product_id
		WHERE o.shop_id = $1 AND o.created_at >= $2 AND o.created_at <= $3::date + INTERVAL '1 day' `+revenueOrderFilter+`
		GROUP BY p.name
		ORDER BY revenue DESC
		LIMIT 5`,
		shopID, from, to,
	)
	if err == nil {
		defer productRows.Close()
		for productRows.Next() {
			var name string
			var rev float64
			if err := productRows.Scan(&name, &rev); err == nil {
				topProducts = append(topProducts, map[string]any{
					"name": name, "revenue": rev, "cost": rev * 0.6,
					"profit": rev * 0.4, "margin": 40.0,
				})
			}
		}
	}
	if topProducts == nil {
		topProducts = []map[string]any{}
	}

	grossProfit := totalRevenue - totalExpenses*0.3 // assume ~30% of expenses are COGS
	netProfit := grossProfit - totalExpenses*0.7
	margin := 0.0
	if totalRevenue > 0 {
		margin = netProfit / totalRevenue * 100
	}

	monthlyData := []map[string]any{}
	mRows, err := h.pool.Query(c.Context(), `
		WITH months AS (
			SELECT generate_series(DATE_TRUNC('month', $2::date), DATE_TRUNC('month', $3::date), INTERVAL '1 month') AS m
		),
		rev AS (
			SELECT DATE_TRUNC('month', created_at) AS m, SUM(total) AS r
			FROM orders WHERE shop_id = $1 AND created_at >= $2 AND created_at <= $3::date + INTERVAL '1 day' AND status NOT IN ('CANCELLED', 'REFUNDED')
			GROUP BY 1
		),
		exp AS (
			SELECT DATE_TRUNC('month', created_at) AS m, SUM(COALESCE((data->>'amount')::float8, 0)) AS e
			FROM dashboard_entities WHERE kind = 'expense' AND shop_id = $1 AND created_at >= $2 AND created_at <= $3::date + INTERVAL '1 day'
			GROUP BY 1
		)
		SELECT TO_CHAR(months.m, 'YYYY-MM'),
		       COALESCE(rev.r, 0), COALESCE(exp.e, 0),
		       COALESCE(rev.r, 0) - COALESCE(exp.e, 0)
		FROM months LEFT JOIN rev ON rev.m = months.m LEFT JOIN exp ON exp.m = months.m
		ORDER BY months.m`,
		shopID, from, to,
	)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var month string
			var rev, exps, profit float64
			if err := mRows.Scan(&month, &rev, &exps, &profit); err == nil {
				monthlyData = append(monthlyData, map[string]any{
					"month": month, "revenue": rev, "expenses": exps, "profit": profit,
				})
			}
		}
	}
	if monthlyData == nil {
		monthlyData = []map[string]any{}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"totalRevenue":  totalRevenue,
			"totalCost":     totalRevenue * 0.6,
			"grossProfit":   grossProfit,
			"totalExpenses": totalExpenses,
			"netProfit":     netProfit,
			"profitMargin":  margin,
			"topProducts":   topProducts,
			"monthlyData":   monthlyData,
		},
	})
}

// FinancialReports handles GET /finance/reports/shop/:shopId?type&from&to.
func (h *Handler) FinancialReports(c *fiber.Ctx) error {
	_, shopID, ok := h.resolveShop(c, "")
	if !ok {
		return nil
	}
	reportType := c.Query("type")
	if reportType == "" {
		reportType = "income_statement"
	}
	from := c.Query("from")
	to := c.Query("to")
	if from == "" {
		from = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}

	line := func(label string, amount float64) map[string]any {
		return map[string]any{"label": label, "amount": amount}
	}

	result := fiber.Map{}

	switch reportType {
	case "income_statement":
		var revenue, expenses float64
		_ = h.pool.QueryRow(c.Context(), `
			SELECT COALESCE((SELECT SUM(total) FROM orders WHERE shop_id = $1 AND created_at >= $2 AND created_at <= $3::date + INTERVAL '1 day' `+revenueOrderFilter+`), 0),
			       COALESCE((SELECT SUM(COALESCE((data->>'amount')::float8,0)) FROM dashboard_entities WHERE kind='expense' AND shop_id=$1 AND created_at >= $2 AND created_at <= $3::date + INTERVAL '1 day'), 0)`,
			shopID, from, to).Scan(&revenue, &expenses)
		result["revenue"] = []map[string]any{line("المبيعات", revenue)}
		result["expenses"] = []map[string]any{line("المصروفات", expenses)}
		result["totals"] = fiber.Map{
			"totalRevenue":  revenue,
			"totalExpenses": expenses,
			"netProfit":     revenue - expenses,
		}
	case "balance_sheet":
		assetRows, err := h.pool.Query(c.Context(), `
			SELECT COALESCE(data->>'name', data->>'bankName', 'حساب'), COALESCE((data->>'balance')::float8, 0)
			FROM dashboard_entities WHERE kind='account' AND shop_id=$1`,
			shopID)
		assets := []map[string]any{}
		totalAssets := 0.0
		if err == nil {
			defer assetRows.Close()
			for assetRows.Next() {
				var label string
				var amount float64
				if err := assetRows.Scan(&label, &amount); err == nil {
					assets = append(assets, line(label, amount))
					totalAssets += amount
				}
			}
		}
		var liabilities float64
		_ = h.pool.QueryRow(c.Context(),
			`SELECT COALESCE(SUM(total),0) FROM orders WHERE shop_id=$1 AND status='PENDING'`, shopID).Scan(&liabilities)
		result["assets"] = assets
		result["liabilities"] = []map[string]any{line("طلبات غير مسددة", liabilities)}
		result["equity"] = []map[string]any{line("حقوق الملكية", totalAssets-liabilities)}
		result["totals"] = fiber.Map{
			"totalAssets":     totalAssets,
			"totalLiabilities": liabilities,
			"totalEquity":     totalAssets - liabilities,
		}
	default: // cash_flow
		var cashIn, cashOut float64
		_ = h.pool.QueryRow(c.Context(), `
			SELECT
			  COALESCE((SELECT SUM(total) FROM orders WHERE shop_id=$1 AND created_at >= $2 AND created_at <= $3::date + INTERVAL '1 day' `+revenueOrderFilter+`), 0),
			  COALESCE((SELECT SUM(COALESCE((data->>'amount')::float8,0)) FROM dashboard_entities WHERE kind='expense' AND shop_id=$1 AND created_at >= $2 AND created_at <= $3::date + INTERVAL '1 day'), 0)`,
			shopID, from, to).Scan(&cashIn, &cashOut)
		result["cashIn"] = []map[string]any{line("تحصيلات المبيعات", cashIn)}
		result["cashOut"] = []map[string]any{line("مدفوعات المصروفات", cashOut)}
		result["totals"] = fiber.Map{
			"cashInTotal":  cashIn,
			"cashOutTotal": cashOut,
			"netCashFlow":  cashIn - cashOut,
		}
	}
	return c.JSON(result)
}
