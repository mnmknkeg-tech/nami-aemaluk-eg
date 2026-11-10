package ai

// Types for the AI insights domain. The shapes mirror exactly what the
// dashboard AI pages expect (apps/dashboard-web/app/dashboard/(main)/ai/...).

// AnalysisItem is one metric card on the AI analysis page.
type AnalysisItem struct {
	ID              string   `json:"id"`
	Type            string   `json:"type"` // sales | products | customers | traffic
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	Value           float64  `json:"value"`
	PreviousValue   float64  `json:"previousValue"`
	Trend           string   `json:"trend"` // up | down | stable
	Insights        []string `json:"insights"`
	Recommendations []string `json:"recommendations"`
	LastUpdated     string   `json:"lastUpdated"`
}

// Insight is one actionable recommendation on the AI insights page.
type Insight struct {
	ID              string   `json:"id"`
	Category        string   `json:"category"` // sales | products | customers | operations
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	Impact          string   `json:"impact"` // high | medium | low
	Confidence      float64  `json:"confidence"`
	Actions         []string `json:"actions"`
	ExpectedOutcome string   `json:"expectedOutcome"`
	CreatedAt       string   `json:"createdAt"`
	Status          string   `json:"status"` // new | viewed | implemented | dismissed
}

// SEOItem is one auditable entity (product/page/category) on the AI SEO page.
type SEOItem struct {
	ID          string   `json:"id"`
	Type        string   `json:"type"` // product | page | category
	Title       string   `json:"title"`
	URL         string   `json:"url"`
	Keywords    []string `json:"keywords"`
	Description string   `json:"description"`
	Score       float64  `json:"score"`
	Issues      []string `json:"issues"`
	Suggestions []string `json:"suggestions"`
	LastUpdated string   `json:"lastUpdated"`
	Status      string   `json:"status"` // optimized | needs_improvement | critical
}

// shopSnapshot holds the raw numbers the rules engine needs.
type shopSnapshot struct {
	// current period = last 30 days, previous = the 30 days before that
	Revenue          float64
	PrevRevenue      float64
	Orders           int64
	PrevOrders       int64
	NewCustomers     int64
	PrevNewCustomers int64
	Visits           int64
	PrevVisits       int64
	UnitsSold        int64
	PrevUnitsSold    int64
	ActiveProducts   int64
	LowStock         int64
	NoDescProducts   int64
	NoImageProducts  int64
	TotalProducts    int64

	// shop profile for SEO
	ShopName    string
	Slug        string
	Description string
	LogoURL     string
	BannerURL   string
	Phone       string
	PublishedAt *string
	ProductRows []productSEORow
}

type productSEORow struct {
	ID          string
	Name        string
	Description string
	ImageURL    string
	Category    string
	Price       float64
	UpdatedAt   string
}
