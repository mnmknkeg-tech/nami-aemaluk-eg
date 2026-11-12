package finance

// CashflowSummary represents aggregated cashflow data
type CashflowSummary struct {
	ShopID      string            `json:"shop_id"`
	Inflows     float64           `json:"inflows"`
	Outflows    float64           `json:"outflows"`
	NetCashflow float64           `json:"net_cashflow"`
	Monthly     []CashflowMonthly `json:"monthly"`
}

// CashflowMonthly represents a single month in the cashflow chart
type CashflowMonthly struct {
	Month   string  `json:"month"`
	Inflow  float64 `json:"inflow"`
	Outflow float64 `json:"outflow"`
}

// ProfitSummary represents profit & margin analysis
type ProfitSummary struct {
	ShopID      string  `json:"shop_id"`
	Revenue     float64 `json:"revenue"`
	COGS        float64 `json:"cogs"`
	GrossProfit float64 `json:"gross_profit"`
	Margin      float64 `json:"margin"`
}

// RevenueSummary represents revenue stats
type RevenueSummary struct {
	ShopID       string         `json:"shop_id"`
	TotalRevenue float64        `json:"total_revenue"`
	TodayRevenue float64        `json:"today_revenue"`
	MonthRevenue float64        `json:"month_revenue"`
	AvgOrder     float64        `json:"avg_order"`
	RecentOrders []RevenueOrder `json:"recent_orders"`
}

// RevenueOrder represents a recent order in the revenue page
type RevenueOrder struct {
	ID           string  `json:"id"`
	OrderNumber  string  `json:"order_number"`
	CustomerName string  `json:"customer_name"`
	Total        float64 `json:"total"`
}
