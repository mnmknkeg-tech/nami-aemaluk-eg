package accounting

import (
	"context"
	"fmt"
)

// Service handles accounting business logic.
type Service struct {
	repo *Repository
}

// NewService creates a new accounting service.
func NewService(repo *Repository) *Service { return &Service{repo: repo} }

// Accounts
func (s *Service) ListAccounts(ctx context.Context, shopID string) ([]AccountWithBalance, error) {
	if err := s.repo.EnsureDefaultCOA(ctx, shopID); err != nil {
		return nil, err
	}
	return s.repo.ListAccounts(ctx, shopID)
}
func (s *Service) CreateAccount(ctx context.Context, shopID string, dto *CreateAccountDTO) (*Account, error) {
	return s.repo.CreateAccount(ctx, shopID, dto)
}
func (s *Service) UpdateAccount(ctx context.Context, id, shopID string, dto *UpdateAccountDTO) (*Account, error) {
	acc, err := s.repo.UpdateAccount(ctx, id, shopID, dto)
	if err != nil {
		return nil, err
	}
	return acc, nil
}
func (s *Service) DeleteAccount(ctx context.Context, id, shopID string) error {
	has, err := s.repo.AccountHasJournalLines(ctx, id, shopID)
	if err != nil {
		return err
	}
	if has {
		return ErrAccountInUse
	}
	return s.repo.DeleteAccount(ctx, id, shopID)
}

// Journal
func (s *Service) ListJournalEntries(ctx context.Context, shopID, status, from, to string) ([]JournalEntry, error) {
	return s.repo.ListJournalEntries(ctx, shopID, status, from, to)
}
func (s *Service) GetJournalEntry(ctx context.Context, id, shopID string) (*JournalEntry, error) {
	entry, err := s.repo.GetJournalEntry(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	return entry, nil
}
func (s *Service) CreateJournalEntry(ctx context.Context, shopID, userID string, dto *CreateJournalEntryDTO) (*JournalEntry, error) {
	if err := validateBalanced(dto.Lines); err != nil {
		return nil, err
	}
	return s.repo.CreateJournalEntry(ctx, shopID, userID, dto)
}
func (s *Service) UpdateJournalEntry(ctx context.Context, id, shopID string, dto *UpdateJournalEntryDTO) (*JournalEntry, error) {
	if len(dto.Lines) > 0 {
		if err := validateBalancedLines(dto.Lines); err != nil {
			return nil, err
		}
	}
	return s.repo.UpdateJournalEntry(ctx, id, shopID, dto)
}
func (s *Service) PostJournalEntry(ctx context.Context, id, shopID, userID string) (*JournalEntry, error) {
	entry, err := s.repo.GetJournalEntry(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	if closed, periodName, _ := s.repo.IsPeriodClosed(ctx, entry.ShopID, entry.EntryDate); closed {
		return nil, ErrPeriodClosed(periodName)
	}
	posted, err := s.repo.PostJournalEntry(ctx, id, shopID, userID)
	if err != nil {
		return nil, err
	}
	s.repo.LogAudit(ctx, entry.ShopID, userID, "", "post", "journal", entry.ID,
		fmt.Sprintf("ترحيل قيد %s بمبلغ %.2f", entry.Number, entry.TotalDebit))
	return posted, nil
}
func (s *Service) ReverseJournalEntry(ctx context.Context, id, shopID, userID string) (*JournalEntry, error) {
	entry, err := s.repo.GetJournalEntry(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	reversed, err := s.repo.ReverseJournalEntry(ctx, id, shopID, userID)
	if err != nil {
		return nil, err
	}
	s.repo.LogAudit(ctx, entry.ShopID, userID, "", "reverse", "journal", entry.ID,
		fmt.Sprintf("قيد عكسي للقيد %s", entry.Number))
	return reversed, nil
}
func (s *Service) DeleteJournalEntry(ctx context.Context, id, shopID string) error {
	return s.repo.DeleteJournalEntry(ctx, id, shopID)
}

// Reports
func (s *Service) TrialBalance(ctx context.Context, shopID, from, to string) (*TrialBalance, error) {
	return s.repo.TrialBalance(ctx, shopID, from, to)
}

// IncomeStatement builds the P&L from posted entries in a period.
func (s *Service) IncomeStatement(ctx context.Context, shopID, from, to string) (*IncomeStatement, error) {
	accounts, err := s.repo.ListAccounts(ctx, shopID)
	if err != nil {
		return nil, err
	}
	totals, err := s.repo.AccountTotals(ctx, shopID, from, to)
	if err != nil {
		return nil, err
	}
	is := &IncomeStatement{ShopID: shopID, FromDate: from, ToDate: to}
	for _, a := range accounts {
		if a.IsGroup {
			continue
		}
		t, ok := totals[a.ID]
		if !ok {
			continue
		}
		var amount float64
		switch a.Type {
		case "revenue":
			amount = t[1] - t[0] // credit - debit
			if amount == 0 {
				continue
			}
			is.Revenue = append(is.Revenue, StatementLine{Code: a.Code, Name: a.Name, Type: a.Type, Amount: amount})
			is.TotalRevenue += amount
		case "expense":
			amount = t[0] - t[1] // debit - credit
			if amount == 0 {
				continue
			}
			is.Expenses = append(is.Expenses, StatementLine{Code: a.Code, Name: a.Name, Type: a.Type, Amount: amount})
			is.TotalExpenses += amount
		}
	}
	is.NetProfit = is.TotalRevenue - is.TotalExpenses
	return is, nil
}

// BalanceSheet builds the financial position report as of a date.
func (s *Service) BalanceSheet(ctx context.Context, shopID, asOf string) (*BalanceSheet, error) {
	accounts, err := s.repo.ListAccounts(ctx, shopID)
	if err != nil {
		return nil, err
	}
	totals, err := s.repo.AccountTotals(ctx, shopID, "", asOf)
	if err != nil {
		return nil, err
	}
	bs := &BalanceSheet{ShopID: shopID, AsOf: asOf}
	var retainedEarnings float64
	for _, a := range accounts {
		if a.IsGroup {
			continue
		}
		t, ok := totals[a.ID]
		if !ok {
			continue
		}
		var amount float64
		switch a.Type {
		case "asset":
			amount = a.OpeningBalance + t[0] - t[1]
			bs.Assets = append(bs.Assets, StatementLine{Code: a.Code, Name: a.Name, Type: a.Type, Amount: amount})
			bs.TotalAssets += amount
		case "liability":
			amount = a.OpeningBalance + t[1] - t[0]
			bs.Liabilities = append(bs.Liabilities, StatementLine{Code: a.Code, Name: a.Name, Type: a.Type, Amount: amount})
			bs.TotalLiabilities += amount
		case "equity":
			amount = a.OpeningBalance + t[1] - t[0]
			bs.Equity = append(bs.Equity, StatementLine{Code: a.Code, Name: a.Name, Type: a.Type, Amount: amount})
			bs.TotalEquity += amount
		case "revenue":
			retainedEarnings += t[1] - t[0]
		case "expense":
			retainedEarnings -= t[0] - t[1]
		}
	}
	bs.NetProfit = retainedEarnings
	bs.TotalEquity += retainedEarnings
	bs.TotalAssets = 0
	for _, l := range bs.Assets {
		bs.TotalAssets += l.Amount
	}
	bs.IsBalanced = absEq(bs.TotalAssets, bs.TotalLiabilities+bs.TotalEquity)
	return bs, nil
}

// validateBalanced ensures a new entry has both sides and is balanced.
func validateBalanced(lines []JournalLineInput) error {
	var d, c float64
	for _, l := range lines {
		if l.Debit > 0 && l.Credit > 0 {
			return ErrLineBothSides
		}
		if l.Debit == 0 && l.Credit == 0 {
			return ErrLineEmpty
		}
		d += l.Debit
		c += l.Credit
	}
	if d == 0 || c == 0 {
		return ErrNoBothSides
	}
	if !absEq(d, c) {
		return ErrUnbalanced
	}
	return nil
}

// ---------------------------------------------------------------------------
// Phase 2: Entities
// ---------------------------------------------------------------------------

func (s *Service) ListEntities(ctx context.Context, shopID, entityType string) ([]Entity, error) {
	return s.repo.ListEntities(ctx, shopID, entityType)
}

func (s *Service) GetEntity(ctx context.Context, id, shopID string) (*Entity, error) {
	return s.repo.GetEntity(ctx, id, shopID)
}

func (s *Service) CreateEntity(ctx context.Context, shopID, userID string, dto *CreateEntityDTO) (*Entity, error) {
	return s.repo.CreateEntity(ctx, shopID, userID, dto)
}

func (s *Service) UpdateEntity(ctx context.Context, id, shopID string, dto *UpdateEntityDTO) (*Entity, error) {
	return s.repo.UpdateEntity(ctx, id, shopID, dto)
}

func (s *Service) DeleteEntity(ctx context.Context, id, shopID string) error {
	return s.repo.DeleteEntity(ctx, id, shopID)
}

// ---------------------------------------------------------------------------
// Phase 2: Invoices
// ---------------------------------------------------------------------------

func (s *Service) CreateInvoice(ctx context.Context, shopID, userID string, dto *CreateInvoiceDTO) (*Invoice, error) {
	if len(dto.Lines) == 0 {
		return nil, ErrNoBothSides
	}
	return s.repo.CreateInvoice(ctx, shopID, userID, dto)
}

func (s *Service) GetInvoice(ctx context.Context, id, shopID string) (*Invoice, error) {
	return s.repo.GetInvoice(ctx, id, shopID)
}

func (s *Service) ListInvoices(ctx context.Context, shopID, entityID, status string) ([]Invoice, error) {
	return s.repo.ListInvoices(ctx, shopID, entityID, status)
}

func (s *Service) UpdateInvoice(ctx context.Context, id, shopID, number, dueDate string) (*Invoice, error) {
	err := s.repo.UpdateInvoice(ctx, id, shopID, number, dueDate)
	if err != nil {
		return nil, err
	}
	return s.repo.GetInvoice(ctx, id, shopID)
}

// ---------------------------------------------------------------------------
// Phase 2: Invoices (Post/Cancel)
// ---------------------------------------------------------------------------

func (s *Service) PostInvoice(ctx context.Context, id, shopID, userID string) (*Invoice, error) {
	inv, err := s.repo.GetInvoice(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	if inv.Status == "posted" {
		return inv, nil
	}
	// Fiscal period check: cannot post into a closed period
	if closed, periodName, _ := s.repo.IsPeriodClosed(ctx, inv.ShopID, inv.InvoiceDate); closed {
		return nil, ErrPeriodClosed(periodName)
	}
	entry, err := s.autoPostInvoiceEntry(ctx, inv, userID)
	if err != nil {
		return nil, err
	}
	err = s.repo.UpdateInvoiceStatus(ctx, id, entry.ID, "posted")
	if err != nil {
		return nil, err
	}
	amt := inv.Total
	if inv.InvoiceType == "purchase" {
		amt = -amt
	}
	_ = s.repo.UpdateEntityBalance(ctx, inv.EntityID, inv.ShopID, amt)
	s.repo.LogAudit(ctx, inv.ShopID, userID, "", "post", "invoice", inv.ID,
		fmt.Sprintf("ترحيل فاتورة %s بمبلغ %.2f", inv.Number, inv.Total))
	return s.repo.GetInvoice(ctx, id, shopID)
}

// autoPostInvoiceEntry creates the double-entry journal for an invoice with VAT split.
// Sale:   Debit AR(total) / Credit Revenue(subtotal) + Credit VAT-output(tax)
// Purchase: Debit Expense(subtotal) + Debit VAT-input(tax) / Credit AP(total)
func (s *Service) autoPostInvoiceEntry(ctx context.Context, inv *Invoice, userID string) (*JournalEntry, error) {
	revenueAccount := "4100"    // إيرادات المبيعات
	expenseAccount := "5000"    // المصروفات
	receivableAccount := "1130" // العملاء
	payableAccount := "2100"    // الموردون
	vatOutputAccount := "2130"  // ضريبة القيمة المضافة المستحقة (مبيعات)
	vatInputAccount := "2140"   // ضريبة القيمة المضافة على المشتريات

	subtotal := round2(inv.Subtotal)
	taxTotal := round2(inv.TaxTotal)
	total := round2(inv.Total)

	var lines []JournalLineInput
	if inv.InvoiceType == "sale" {
		lines = []JournalLineInput{{AccountCode: receivableAccount, Debit: total}}
		if subtotal > 0 {
			lines = append(lines, JournalLineInput{AccountCode: revenueAccount, Credit: subtotal})
		}
		if taxTotal > 0 {
			lines = append(lines, JournalLineInput{AccountCode: vatOutputAccount, Credit: taxTotal})
		}
	} else {
		if subtotal > 0 {
			lines = append(lines, JournalLineInput{AccountCode: expenseAccount, Debit: subtotal})
		}
		if taxTotal > 0 {
			lines = append(lines, JournalLineInput{AccountCode: vatInputAccount, Debit: taxTotal})
		}
		lines = append(lines, JournalLineInput{AccountCode: payableAccount, Credit: total})
	}
	dto := &CreateJournalEntryDTO{
		EntryDate:   inv.InvoiceDate,
		Description: fmt.Sprintf("قيد ناتج عن فاتورة %s %s", inv.InvoiceType, inv.Number),
		Reference:   inv.Number,
		Lines:       lines,
	}
	return s.repo.CreateJournalEntry(ctx, inv.ShopID, userID, dto)
}

func (s *Service) CancelInvoice(ctx context.Context, id, shopID, userID string) (*Invoice, error) {
	inv, err := s.repo.GetInvoice(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	if inv.Status == "cancelled" {
		return inv, nil
	}
	if inv.Status == "posted" && inv.JournalID != "" {
		_, err := s.repo.ReverseJournalEntry(ctx, inv.JournalID, shopID, userID)
		if err != nil {
			return nil, err
		}
	}
	err = s.repo.UpdateInvoiceStatus(ctx, id, "", "cancelled")
	if err != nil {
		return nil, err
	}
	amt := -inv.Total
	if inv.InvoiceType == "purchase" {
		amt = inv.Total
	}
	_ = s.repo.UpdateEntityBalance(ctx, inv.EntityID, inv.ShopID, amt)
	s.repo.LogAudit(ctx, inv.ShopID, userID, "", "cancel", "invoice", inv.ID,
		fmt.Sprintf("إلغاء فاتورة %s", inv.Number))
	return s.repo.GetInvoice(ctx, id, shopID)
}

// ---------------------------------------------------------------------------
// Phase 2: Payments
// ---------------------------------------------------------------------------

func (s *Service) CreatePayment(ctx context.Context, shopID, userID string, dto *CreatePaymentDTO) (*Payment, error) {
	if dto.Amount <= 0 {
		return nil, ErrLineEmpty
	}
	return s.repo.CreatePayment(ctx, shopID, userID, dto)
}

func (s *Service) GetPayment(ctx context.Context, id, shopID string) (*Payment, error) {
	return s.repo.GetPayment(ctx, id, shopID)
}

func (s *Service) ListPayments(ctx context.Context, shopID, entityID string) ([]Payment, error) {
	return s.repo.ListPayments(ctx, shopID, entityID)
}

func (s *Service) PostPayment(ctx context.Context, id, shopID, userID string) (*Payment, error) {
	p, err := s.repo.GetPayment(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	if p.Status == "posted" {
		return p, nil
	}
	if closed, periodName, _ := s.repo.IsPeriodClosed(ctx, p.ShopID, p.PaymentDate); closed {
		return nil, ErrPeriodClosed(periodName)
	}
	cashAccount := "1110"
	bankAccount := "1120"
	receivableAccount := "1130"
	payableAccount := "2100"
	var debitCode, creditCode string
	amt := p.Amount
	if p.PaymentType == "receipt" {
		debitCode = cashAccount
		creditCode = receivableAccount
		_ = s.repo.UpdateEntityBalance(ctx, p.EntityID, p.ShopID, -amt)
	} else {
		debitCode = payableAccount
		creditCode = bankAccount
		_ = s.repo.UpdateEntityBalance(ctx, p.EntityID, p.ShopID, amt)
	}
	dto := &CreateJournalEntryDTO{
		EntryDate:   p.PaymentDate,
		Description: fmt.Sprintf("قيد ناتج عن دفعة %s", p.Number),
		Reference:   p.Number,
		Lines: []JournalLineInput{
			{AccountCode: debitCode, Debit: amt},
			{AccountCode: creditCode, Credit: amt},
		},
	}
	entry, err := s.repo.CreateJournalEntry(ctx, p.ShopID, userID, dto)
	if err != nil {
		return nil, err
	}
	err = s.repo.UpdatePaymentStatus(ctx, id, entry.ID, "posted")
	if err != nil {
		return nil, err
	}
	s.repo.LogAudit(ctx, p.ShopID, userID, "", "post", "payment", p.ID,
		fmt.Sprintf("ترحيل دفعة %s بمبلغ %.2f", p.Number, p.Amount))
	return s.repo.GetPayment(ctx, id, shopID)
}

// ---------------------------------------------------------------------------
// Phase 2: Aging
// ---------------------------------------------------------------------------

func (s *Service) CalculateAging(ctx context.Context, shopID, entityType, asOf string) ([]AgingRow, error) {
	return s.repo.CalculateAging(ctx, shopID, entityType, asOf)
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

func validateBalancedLines(lines []JournalLineInput) error {
	var d, c float64
	for _, l := range lines {
		d += l.Debit
		c += l.Credit
	}
	if d == 0 || c == 0 {
		return ErrNoBothSides
	}
	if !absEq(d, c) {
		return ErrUnbalanced
	}
	return nil
}
