package accounting

import "github.com/go-playground/validator/v10"

// ----------------------------- Accounts -----------------------------------

type CreateAccountDTO struct {
	Code           string  `json:"code" validate:"required,min=1,max=40"`
	Name           string  `json:"name" validate:"required,min=1,max=160"`
	Type           string  `json:"type" validate:"required,oneof=asset liability equity revenue expense"`
	ParentID       *string `json:"parent_id,omitempty" validate:"omitempty,uuid"`
	IsGroup        bool    `json:"is_group,omitempty"`
	OpeningBalance float64 `json:"opening_balance,omitempty"`
}

func (d *CreateAccountDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

type UpdateAccountDTO struct {
	Name     *string `json:"name,omitempty" validate:"omitempty,min=1,max=160"`
	ParentID *string `json:"parent_id,omitempty" validate:"omitempty,uuid"`
	Status   *string `json:"status,omitempty" validate:"omitempty,oneof=active inactive"`
}

func (d *UpdateAccountDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

// --------------------------- Journal entries ------------------------------

type JournalLineInput struct {
	AccountID   string  `json:"account_id,omitempty"`
	AccountCode string  `json:"account_code,omitempty"`
	Description string  `json:"description,omitempty" validate:"omitempty,max=240"`
	Debit       float64 `json:"debit,omitempty" validate:"gte=0"`
	Credit      float64 `json:"credit,omitempty" validate:"gte=0"`
}

type CreateJournalEntryDTO struct {
	EntryDate   string             `json:"entry_date" validate:"required,datetime=2006-01-02"`
	Description string             `json:"description" validate:"required,min=1,max=240"`
	Reference   string             `json:"reference,omitempty" validate:"omitempty,max=80"`
	Lines       []JournalLineInput `json:"lines" validate:"required,min=2,dive"`
}

func (d *CreateJournalEntryDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

type UpdateJournalEntryDTO struct {
	EntryDate   string             `json:"entry_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	Description string             `json:"description,omitempty" validate:"omitempty,min=1,max=240"`
	Reference   string             `json:"reference,omitempty" validate:"omitempty,max=80"`
	Lines       []JournalLineInput `json:"lines,omitempty" validate:"omitempty,min=2,dive"`
}

func (d *UpdateJournalEntryDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

// --------------------------- Entities (customers/vendors) -------------------

type CreateEntityDTO struct {
	EntityType   string  `json:"entity_type" validate:"required,oneof=customer vendor"`
	Name         string  `json:"name" validate:"required,min=1,max=160"`
	NameEN       string  `json:"name_en,omitempty"`
	TaxID        string  `json:"tax_id,omitempty"`
	Phone        string  `json:"phone,omitempty"`
	Email        string  `json:"email,omitempty"`
	Address      string  `json:"address,omitempty"`
	CurrencyCode string  `json:"currency_code" validate:"omitempty,len=3"`
	CreditLimit  float64 `json:"credit_limit,omitempty" validate:"gte=0"`
}

func (d *CreateEntityDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

type UpdateEntityDTO struct {
	Name        *string  `json:"name,omitempty" validate:"omitempty,min=1,max=160"`
	NameEN      *string  `json:"name_en,omitempty"`
	TaxID       *string  `json:"tax_id,omitempty"`
	Phone       *string  `json:"phone,omitempty"`
	Email       *string  `json:"email,omitempty"`
	Address     *string  `json:"address,omitempty"`
	CreditLimit *float64 `json:"credit_limit,omitempty" validate:"omitempty,gte=0"`
	Status      *string  `json:"status,omitempty" validate:"omitempty,oneof=active inactive"`
}

func (d *UpdateEntityDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

// --------------------------- Invoices --------------------------------------

type InvoiceLineInput struct {
	Description string  `json:"description" validate:"required,max=240"`
	AccountID   string  `json:"account_id,omitempty" validate:"omitempty,uuid"`
	Quantity    float64 `json:"quantity" validate:"omitempty,gte=0"`
	UnitPrice   float64 `json:"unit_price" validate:"omitempty,gte=0"`
	TaxRate     float64 `json:"tax_rate,omitempty" validate:"omitempty,gte=0,lte=100"`
}

type CreateInvoiceDTO struct {
	EntityID     string             `json:"entity_id" validate:"required,uuid"`
	InvoiceType  string             `json:"invoice_type" validate:"required,oneof=sale purchase"`
	Number       string             `json:"number" validate:"required,max=40"`
	InvoiceDate  string             `json:"invoice_date" validate:"required,datetime=2006-01-02"`
	DueDate      string             `json:"due_date" validate:"required,datetime=2006-01-02"`
	CurrencyCode string             `json:"currency_code,omitempty" validate:"omitempty,len=3"`
	Lines        []InvoiceLineInput `json:"lines" validate:"required,min=1,dive"`
}

func (d *CreateInvoiceDTO) Validate(v *validator.Validate) error {
	// ensure due_date >= invoice_date
	return v.Struct(d)
}

type UpdateInvoiceDTO struct {
	Number  *string            `json:"number,omitempty" validate:"omitempty,max=40"`
	DueDate *string            `json:"due_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	Lines   []InvoiceLineInput `json:"lines,omitempty" validate:"omitempty,min=1,dive"`
}

func (d *UpdateInvoiceDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

// --------------------------- Payments --------------------------------------

type CreatePaymentDTO struct {
	EntityID     string  `json:"entity_id" validate:"required,uuid"`
	PaymentType  string  `json:"payment_type" validate:"required,oneof=receipt payment"`
	Number       string  `json:"number" validate:"required,max=40"`
	PaymentDate  string  `json:"payment_date" validate:"required,datetime=2006-01-02"`
	Amount       float64 `json:"amount" validate:"required,gte=0"`
	CurrencyCode string  `json:"currency_code,omitempty" validate:"omitempty,len=3"`
	Method       string  `json:"method" validate:"required,oneof=cash bank mobile check other"`
	Reference    string  `json:"reference,omitempty" validate:"omitempty,max=80"`
	Allocations  []struct {
		InvoiceID string  `json:"invoice_id" validate:"required,uuid"`
		Amount    float64 `json:"amount" validate:"required,gte=0"`
	} `json:"allocations,omitempty" validate:"omitempty,dive"`
}

func (d *CreatePaymentDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

// --------------------------- Aging -----------------------------------------

type AgingRequest struct {
	AsOf       string `json:"as_of"`                 // optional, defaults to today
	EntityType string `json:"entity_type,omitempty"` // customer | vendor | "" = both
}

// --------------------------- Tax rates -------------------------------------

type CreateTaxRateDTO struct {
	Name      string  `json:"name" validate:"required,min=1,max=80"`
	Rate      float64 `json:"rate" validate:"required,gte=0,lte=100"`
	TaxType   string  `json:"tax_type" validate:"required,oneof=vat wht other"`
	IsDefault bool    `json:"is_default,omitempty"`
}

func (d *CreateTaxRateDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

type UpdateTaxRateDTO struct {
	Name   *string  `json:"name,omitempty" validate:"omitempty,min=1,max=80"`
	Rate   *float64 `json:"rate,omitempty" validate:"omitempty,gte=0,lte=100"`
	Status *string  `json:"status,omitempty" validate:"omitempty,oneof=active inactive"`
}

func (d *UpdateTaxRateDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

// --------------------------- Fiscal periods --------------------------------

type CreateFiscalPeriodDTO struct {
	Year  int `json:"year" validate:"required,gte=2000,lte=2100"`
	Month int `json:"month" validate:"required,gte=1,lte=12"`
}

func (d *CreateFiscalPeriodDTO) Validate(v *validator.Validate) error { return v.Struct(d) }

// --------------------------- Tax returns -----------------------------------

type GenerateTaxReturnDTO struct {
	Year  int `json:"year" validate:"required,gte=2000,lte=2100"`
	Month int `json:"month" validate:"required,gte=1,lte=12"`
}

func (d *GenerateTaxReturnDTO) Validate(v *validator.Validate) error { return v.Struct(d) }
