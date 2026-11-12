package accounting

// Account is a chart-of-accounts node (hierarchical).
type Account struct {
	ID             string  `json:"id"`
	ShopID         string  `json:"shop_id"`
	Code           string  `json:"code"`
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	ParentID       *string `json:"parent_id"`
	IsGroup        bool    `json:"is_group"`
	IsSystem       bool    `json:"is_system"`
	OpeningBalance float64 `json:"opening_balance"`
	Status         string  `json:"status"`
	CreatedAt      string  `json:"created_at"`
}

// AccountWithBalance adds computed balances on top of Account.
type AccountWithBalance struct {
	Account
	DebitBalance  float64 `json:"debit_balance"`
	CreditBalance float64 `json:"credit_balance"`
}

// JournalLine is one leg of a journal entry.
type JournalLine struct {
	ID          string  `json:"id"`
	EntryID     string  `json:"entry_id"`
	AccountID   string  `json:"account_id"`
	AccountCode string  `json:"account_code"`
	AccountName string  `json:"account_name"`
	Description string  `json:"description"`
	Debit       float64 `json:"debit"`
	Credit      float64 `json:"credit"`
	LineNo      int     `json:"line_no"`
}

// JournalEntry is a balanced double-entry document.
type JournalEntry struct {
	ID                string        `json:"id"`
	ShopID            string        `json:"shop_id"`
	Number            string        `json:"number"`
	EntryDate         string        `json:"entry_date"`
	Description       string        `json:"description"`
	Reference         string        `json:"reference"`
	Status            string        `json:"status"`
	TotalDebit        float64       `json:"total_debit"`
	TotalCredit       float64       `json:"total_credit"`
	PostedAt          string        `json:"posted_at"`
	PostedBy          string        `json:"posted_by"`
	ReversedByEntryID string        `json:"reversed_by_entry_id"`
	CreatedBy         string        `json:"created_by"`
	CreatedAt         string        `json:"created_at"`
	Lines             []JournalLine `json:"lines,omitempty"`
}

// TrialBalanceRow is one account row of the trial balance report.
type TrialBalanceRow struct {
	AccountID     string  `json:"account_id"`
	Code          string  `json:"code"`
	Name          string  `json:"name"`
	Type          string  `json:"type"`
	DebitTotal    float64 `json:"debit_total"`
	CreditTotal   float64 `json:"credit_total"`
	DebitBalance  float64 `json:"debit_balance"`
	CreditBalance float64 `json:"credit_balance"`
}

// TrialBalance is the full report payload.
type TrialBalance struct {
	ShopID      string            `json:"shop_id"`
	FromDate    string            `json:"from_date"`
	ToDate      string            `json:"to_date"`
	Rows        []TrialBalanceRow `json:"rows"`
	TotalDebit  float64           `json:"total_debit"`
	TotalCredit float64           `json:"total_credit"`
	IsBalanced  bool              `json:"is_balanced"`
}

// StatementLine is a line in income statement / balance sheet.
type StatementLine struct {
	Code   string  `json:"code"`
	Name   string  `json:"name"`
	Type   string  `json:"type"`
	Amount float64 `json:"amount"`
}

// IncomeStatement is the P&L report.
type IncomeStatement struct {
	ShopID        string          `json:"shop_id"`
	FromDate      string          `json:"from_date"`
	ToDate        string          `json:"to_date"`
	Revenue       []StatementLine `json:"revenue"`
	Expenses      []StatementLine `json:"expenses"`
	TotalRevenue  float64         `json:"total_revenue"`
	TotalExpenses float64         `json:"total_expenses"`
	NetProfit     float64         `json:"net_profit"`
}

// BalanceSheet is the financial position report.
type BalanceSheet struct {
	ShopID           string          `json:"shop_id"`
	AsOf             string          `json:"as_of"`
	Assets           []StatementLine `json:"assets"`
	Liabilities      []StatementLine `json:"liabilities"`
	Equity           []StatementLine `json:"equity"`
	NetProfit        float64         `json:"net_profit"`
	TotalAssets      float64         `json:"total_assets"`
	TotalLiabilities float64         `json:"total_liabilities"`
	TotalEquity      float64         `json:"total_equity"`
	IsBalanced       bool            `json:"is_balanced"`
}

// ---------------------------------------------------------------------------
// Phase 2: Customers (AR) / Vendors (AP)
// ---------------------------------------------------------------------------

// EntityType describes if an account is a customer, vendor, or normal.
type EntityType string

const (
	EntityNormal   EntityType = "normal"
	EntityCustomer EntityType = "customer"
	EntityVendor   EntityType = "vendor"
)

// Entity is a customer or vendor business partner.
type Entity struct {
	ID           string  `json:"id"`
	ShopID       string  `json:"shop_id"`
	EntityType   string  `json:"entity_type"` // "customer" | "vendor"
	Name         string  `json:"name"`
	NameEN       string  `json:"name_en,omitempty"`
	TaxID        string  `json:"tax_id,omitempty"`
	Phone        string  `json:"phone,omitempty"`
	Email        string  `json:"email,omitempty"`
	Address      string  `json:"address,omitempty"`
	CurrencyCode string  `json:"currency_code"`
	CreditLimit  float64 `json:"credit_limit"`
	Balance      float64 `json:"balance"`
	Status       string  `json:"status"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// Invoice is a customer sale or vendor bill.
type Invoice struct {
	ID           string        `json:"id"`
	ShopID       string        `json:"shop_id"`
	EntityID     string        `json:"entity_id"`
	EntityName   string        `json:"entity_name,omitempty"`
	EntityType   string        `json:"entity_type"`  // "customer" | "vendor"
	InvoiceType  string        `json:"invoice_type"` // "sale" | "purchase"
	Number       string        `json:"number"`
	InvoiceDate  string        `json:"invoice_date"`
	DueDate      string        `json:"due_date"`
	CurrencyCode string        `json:"currency_code"`
	Subtotal     float64       `json:"subtotal"`
	TaxTotal     float64       `json:"tax_total"`
	Total        float64       `json:"total"`
	PaidAmount   float64       `json:"paid_amount"`
	Balance      float64       `json:"balance"`
	Status       string        `json:"status"` // "draft" | "posted" | "cancelled"
	JournalID    string        `json:"journal_id,omitempty"`
	CreatedBy    string        `json:"created_by,omitempty"`
	CreatedAt    string        `json:"created_at"`
	UpdatedAt    string        `json:"updated_at"`
	Lines        []InvoiceLine `json:"lines,omitempty"`
}

// InvoiceLine is one line of an invoice.
type InvoiceLine struct {
	ID          string  `json:"id"`
	InvoiceID   string  `json:"invoice_id"`
	Description string  `json:"description"`
	AccountID   string  `json:"account_id,omitempty"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	TaxRate     float64 `json:"tax_rate"`
	TaxAmount   float64 `json:"tax_amount"`
	Amount      float64 `json:"amount"`
	LineNo      int     `json:"line_no"`
}

// Payment is money received from a customer or paid to a vendor.
type Payment struct {
	ID           string              `json:"id"`
	ShopID       string              `json:"shop_id"`
	EntityID     string              `json:"entity_id"`
	EntityName   string              `json:"entity_name,omitempty"`
	EntityType   string              `json:"entity_type"`
	PaymentType  string              `json:"payment_type"` // "receipt" | "payment"
	Number       string              `json:"number"`
	PaymentDate  string              `json:"payment_date"`
	Amount       float64             `json:"amount"`
	CurrencyCode string              `json:"currency_code"`
	Method       string              `json:"method"`
	Reference    string              `json:"reference,omitempty"`
	Status       string              `json:"status"`
	JournalID    string              `json:"journal_id,omitempty"`
	CreatedBy    string              `json:"created_by,omitempty"`
	CreatedAt    string              `json:"created_at"`
	UpdatedAt    string              `json:"updated_at"`
	Allocations  []PaymentAllocation `json:"allocations,omitempty"`
}

// PaymentAllocation links a payment to specific invoices.
type PaymentAllocation struct {
	ID        string  `json:"id"`
	PaymentID string  `json:"payment_id"`
	InvoiceID string  `json:"invoice_id"`
	Allocated float64 `json:"allocated"`
}

// AgingRow is one bucket of an aging report.
type AgingRow struct {
	EntityID     string  `json:"entity_id"`
	EntityName   string  `json:"entity_name"`
	CurrencyCode string  `json:"currency_code"`
	Current      float64 `json:"current"`
	D30          float64 `json:"d30"`
	D60          float64 `json:"d60"`
	D90          float64 `json:"d90"`
	D90Plus      float64 `json:"d90_plus"`
	Total        float64 `json:"total"`
}
