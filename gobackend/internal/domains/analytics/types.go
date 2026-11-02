package analytics

// TimeRange represents a time range for analytics
type TimeRange string

const (
	TimeRangeToday     TimeRange = "today"
	TimeRangeYesterday TimeRange = "yesterday"
	TimeRangeLast7Days TimeRange = "last_7_days"
	TimeRangeLast30Days TimeRange = "last_30_days"
	TimeRangeLast90Days TimeRange = "last_90_days"
	TimeRangeThisMonth TimeRange = "this_month"
	TimeRangeLastMonth TimeRange = "last_month"
	TimeRangeThisYear  TimeRange = "this_year"
	TimeRangeCustom    TimeRange = "custom"
)

// SystemAnalytics represents overall system analytics
type SystemAnalytics struct {
	TotalRevenue    float64 `json:"total_revenue"`
	TotalOrders     int64   `json:"total_orders"`
	TotalUsers      int64   `json:"total_users"`
	TotalShops      int64   `json:"total_shops"`
	TotalVisits     int64   `json:"total_visits"`
	RevenueGrowth   float64 `json:"revenue_growth"`
	OrderGrowth     float64 `json:"order_growth"`
	CustomerGrowth  float64 `json:"customer_growth"`
}

// TimeseriesData represents time-series data points
type TimeseriesData struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Orders  int64   `json:"orders"`
}

// ActivityEvent represents a system activity event
type ActivityEvent struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	CreatedAt string `json:"created_at"`
	Color     string `json:"color"`
}

// ShopAnalytics represents analytics for a specific shop
type ShopAnalytics struct {
	ShopID         string  `json:"shop_id"`
	TotalRevenue   float64 `json:"total_revenue"`
	TotalOrders    int64   `json:"total_orders"`
	TotalVisitors  int64   `json:"total_visitors"`
	AverageOrder   float64 `json:"average_order"`
	ConversionRate float64 `json:"conversion_rate"`
	TopProducts    []ProductPerformance `json:"top_products,omitempty"`
	RecentActivity []ActivityEvent `json:"recent_activity,omitempty"`
}

// ProductPerformance represents product performance metrics
type ProductPerformance struct {
	ProductID   string  `json:"product_id"`
	ProductName string  `json:"product_name"`
	Revenue     float64 `json:"revenue"`
	Orders      int64   `json:"orders"`
	Views       int64   `json:"views"`
}

// UserAnalytics represents analytics for a specific user
type UserAnalytics struct {
	UserID          string  `json:"user_id"`
	TotalOrders     int64   `json:"total_orders"`
	TotalSpent      float64 `json:"total_spent"`
	FavoriteShops   []string `json:"favorite_shops,omitempty"`
	RecentActivity  []ActivityEvent `json:"recent_activity,omitempty"`
}

// MetricsFilter represents filters for analytics queries
type MetricsFilter struct {
	ShopID      *string   `json:"shop_id,omitempty"`
	UserID      *string   `json:"user_id,omitempty"`
	TimeRange   TimeRange `json:"time_range,omitempty"`
	StartDate   *string   `json:"start_date,omitempty"`
	EndDate     *string   `json:"end_date,omitempty"`
	ProductID   *string   `json:"product_id,omitempty"`
}

// ConversionsAnalytics represents conversion funnel, goals, sources and timeline data
type ConversionsAnalytics struct {
	ShopID           string             `json:"shop_id"`
	Funnel           []FunnelStage      `json:"funnel"`
	Goals            []ConversionGoal   `json:"goals"`
	Sources          []ConversionSource `json:"sources"`
	Timeline         []TimelinePoint    `json:"timeline"`
	OverallRate      float64            `json:"overall_rate"`
	TotalConversions int64              `json:"total_conversions"`
	TotalRevenue     float64            `json:"total_revenue"`
	AvgRate          float64            `json:"avg_rate"`
}

// FunnelStage represents a stage in the conversion funnel
type FunnelStage struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	LabelAr  string `json:"label_ar"`
	Visitors int64  `json:"visitors"`
}

// ConversionGoal represents a conversion goal with target tracking
type ConversionGoal struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	NameAr      string  `json:"name_ar"`
	Conversions int64   `json:"conversions"`
	Visitors    int64   `json:"visitors"`
	Rate        float64 `json:"rate"`
	Target      float64 `json:"target"`
	Status      string  `json:"status"` // on-track | at-risk | behind
}

// ConversionSource represents a traffic source with conversion metrics
type ConversionSource struct {
	ID          string  `json:"id"`
	Source      string  `json:"source"`
	SourceAr    string  `json:"source_ar"`
	Visits      int64   `json:"visits"`
	Conversions int64   `json:"conversions"`
	Rate        float64 `json:"rate"`
	Revenue     float64 `json:"revenue"`
	Trend       float64 `json:"trend"`
}

// TimelinePoint represents a single data point in a timeline
type TimelinePoint struct {
	Day         string  `json:"day"`
	Rate        float64 `json:"rate"`
	Conversions int64   `json:"conversions"`
}

// ProductPerformanceDetail represents detailed product performance for the dashboard table
type ProductPerformanceDetail struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	NameAr         string  `json:"name_ar"`
	SKU            string  `json:"sku"`
	Category       string  `json:"category"`
	CategoryAr     string  `json:"category_ar"`
	UnitsSold      int64   `json:"units_sold"`
	Revenue        float64 `json:"revenue"`
	Views          int64   `json:"views"`
	ConversionRate float64 `json:"conversion_rate"`
	AvgRating      float64 `json:"avg_rating"`
	Stock          int64   `json:"stock"`
	Trend          float64 `json:"trend"`
	Status         string  `json:"status"` // star | rising | stable | declining
}

// ProductPerformanceReport wraps the detailed product list with totals
type ProductPerformanceReport struct {
	ShopID   string                     `json:"shop_id"`
	Products []ProductPerformanceDetail `json:"products"`
	Totals   ProductPerformanceTotals   `json:"totals"`
}

// ProductPerformanceTotals represents aggregate totals for product performance
type ProductPerformanceTotals struct {
	Units      int64   `json:"units"`
	Revenue    float64 `json:"revenue"`
	Views      int64   `json:"views"`
	AvgConv    float64 `json:"avg_conv"`
}

// AnalyticsOverview represents the overview page summary data
type AnalyticsOverview struct {
	ShopID       string                  `json:"shop_id"`
	Stats        []OverviewStat          `json:"stats"`
	WeeklyData   []OverviewWeeklyPoint   `json:"weekly_data"`
	TopProducts  []OverviewTopProduct    `json:"top_products"`
}

// OverviewStat represents a single stat card on the overview page
type OverviewStat struct {
	Label  string  `json:"label"`
	LabelAr string `json:"label_ar"`
	Value  string  `json:"value"`
	Change string  `json:"change"`
	Up     bool    `json:"up"`
	Icon   string  `json:"icon"`
	Color  string  `json:"color"`
}

// OverviewWeeklyPoint represents a weekly sales bar
type OverviewWeeklyPoint struct {
	Day   string `json:"day"`
	Value int64  `json:"value"`
}

// OverviewTopProduct represents a top product entry on the overview
type OverviewTopProduct struct {
	Name    string  `json:"name"`
	Sales   int64   `json:"sales"`
	Revenue float64 `json:"revenue"`
}

// SalesReport represents the sales report page data
type SalesReport struct {
	ShopID       string                `json:"shop_id"`
	Stats        []SalesReportStat     `json:"stats"`
	Trend        []SalesTrendPoint     `json:"trend"`
	ByCategory   []SalesByCategory     `json:"by_category"`
	ByChannel    []SalesByChannel      `json:"by_channel"`
}

// SalesReportStat represents a stat card on the sales report page
type SalesReportStat struct {
	Label    string  `json:"label"`
	LabelAr  string  `json:"label_ar"`
	Value    string  `json:"value"`
	Change   string  `json:"change"`
	Up       bool    `json:"up"`
}

// SalesTrendPoint represents a point in the sales trend chart
type SalesTrendPoint struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Orders  int64   `json:"orders"`
}

// SalesPerformanceMetric represents a single metric card on the dashboard
// sales performance page. Value is the current half of the selected window and
// PreviousValue is the first half (a real period-over-period comparison).
type SalesPerformanceMetric struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Value         float64 `json:"value"`
	PreviousValue float64 `json:"previousValue"`
	Target        float64 `json:"target,omitempty"`
	Unit          string  `json:"unit"`
	Period        string  `json:"period"`
	Category      string  `json:"category"` // revenue | orders | products | conversion
	Trend         string  `json:"trend"`    // up | down | stable
}

// SalesByCategory represents sales broken down by category
type SalesByCategory struct {
	Category    string  `json:"category"`
	CategoryAr  string  `json:"category_ar"`
	Revenue     float64 `json:"revenue"`
	Orders      int64   `json:"orders"`
	Percentage  float64 `json:"percentage"`
}

// SalesByChannel represents sales broken down by channel
type SalesByChannel struct {
	Channel    string  `json:"channel"`
	ChannelAr  string  `json:"channel_ar"`
	Revenue    float64 `json:"revenue"`
	Orders     int64   `json:"orders"`
	Percentage float64 `json:"percentage"`
}

// TrafficAnalytics represents the traffic page data
type TrafficAnalytics struct {
	ShopID         string             `json:"shop_id"`
	TotalVisitors  int64              `json:"total_visitors"`
	UniqueVisitors int64              `json:"unique_visitors"`
	AvgSession     string            `json:"avg_session"`
	BounceRate     float64           `json:"bounce_rate"`
	Sources        []TrafficSource   `json:"sources"`
	Devices        []TrafficDevice   `json:"devices"`
	Pages          []TrafficPage     `json:"pages"`
}

// TrafficSource represents a traffic source entry
type TrafficSource struct {
	Source     string  `json:"source"`
	SourceAr   string  `json:"source_ar"`
	Visits     int64   `json:"visits"`
	Percentage float64 `json:"percentage"`
	Color      string  `json:"color"`
}

// TrafficDevice represents a device breakdown entry
type TrafficDevice struct {
	Device     string  `json:"device"`
	DeviceAr   string  `json:"device_ar"`
	Percentage float64 `json:"percentage"`
	Visits     int64   `json:"visits"`
}

// TrafficPage represents a top page entry
type TrafficPage struct {
	URL    string `json:"url"`
	Views  int64  `json:"views"`
	Bounce float64 `json:"bounce"`
}

// CustomerInsights represents the customer insights page data
type CustomerInsights struct {
	ShopID            string                  `json:"shop_id"`
	TotalCustomers    int64                   `json:"total_customers"`
	NewCustomers      int64                   `json:"new_customers"`
	ReturningCustomers int64                  `json:"returning_customers"`
	AvgOrderValue     float64                 `json:"avg_order_value"`
	Segments          []CustomerSegment       `json:"segments"`
	TopCustomers      []TopCustomer           `json:"top_customers"`
}

// CustomerSegment represents a customer segment
type CustomerSegment struct {
	Segment    string  `json:"segment"`
	SegmentAr  string  `json:"segment_ar"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
	Revenue    float64 `json:"revenue"`
}

// TopCustomer represents a top customer entry
type TopCustomer struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Email   string  `json:"email"`
	Orders  int64   `json:"orders"`
	Spent   float64 `json:"spent"`
	LastOrder string `json:"last_order"`
}
