package accounting

// TaxRate is a VAT/WHT rate configured per shop.
type TaxRate struct {
	ID        string  `json:"id"`
	ShopID    string  `json:"shop_id"`
	Name      string  `json:"name"`
	Rate      float64 `json:"rate"`
	TaxType   string  `json:"tax_type"` // vat | wht | other
	IsDefault bool    `json:"is_default"`
	Status    string  `json:"status"`
	CreatedAt string  `json:"created_at"`
}

// TaxReturn is a monthly VAT return snapshot (الإقرار الضريبي).
type TaxReturn struct {
	ID             string  `json:"id"`
	ShopID         string  `json:"shop_id"`
	PeriodYear     int     `json:"period_year"`
	PeriodMonth    int     `json:"period_month"`
	OutputTax      float64 `json:"output_tax"` // ضريبة المبيعات (مستحقة لنا)
	InputTax       float64 `json:"input_tax"`  // ضريبة المشتريات (مستحقة لنا من المورد)
	NetTax         float64 `json:"net_tax"`    // الصافي المستحق سداداً
	SalesTotal     float64 `json:"sales_total"`
	PurchasesTotal float64 `json:"purchases_total"`
	Status         string  `json:"status"` // draft | submitted
	GeneratedAt    string  `json:"generated_at"`
	SubmittedAt    string  `json:"submitted_at,omitempty"`
}

// FiscalPeriod is an accounting month that can be closed/locked.
type FiscalPeriod struct {
	ID        string `json:"id"`
	ShopID    string `json:"shop_id"`
	Name      string `json:"name"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Status    string `json:"status"` // open | closed
	ClosedBy  string `json:"closed_by,omitempty"`
	ClosedAt  string `json:"closed_at,omitempty"`
	CreatedAt string `json:"created_at"`
}

// AuditLogEntry is one recorded action in the audit trail.
type AuditLogEntry struct {
	ID         string `json:"id"`
	ShopID     string `json:"shop_id"`
	UserID     string `json:"user_id,omitempty"`
	UserName   string `json:"user_name,omitempty"`
	Action     string `json:"action"`
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id,omitempty"`
	Summary    string `json:"summary,omitempty"`
	CreatedAt  string `json:"created_at"`
}
