package accounting

import (
	"context"
	"fmt"
)

// Phase 3 errors
func ErrPeriodClosed(periodName string) error {
	return fmt.Errorf("الفترة المحاسبية %s مقفولة — لا يمكن الترحيل إليها", periodName)
}

// ---------------------------------------------------------------------------
// Phase 3: Tax rates
// ---------------------------------------------------------------------------

func (s *Service) ListTaxRates(ctx context.Context, shopID string) ([]TaxRate, error) {
	return s.repo.ListTaxRates(ctx, shopID)
}

func (s *Service) CreateTaxRate(ctx context.Context, shopID, userID string, dto *CreateTaxRateDTO) (*TaxRate, error) {
	t, err := s.repo.CreateTaxRate(ctx, shopID, dto)
	if err != nil {
		return nil, err
	}
	s.repo.LogAudit(ctx, shopID, userID, "", "create", "tax_rate", t.ID,
		fmt.Sprintf("إضافة ضريبة %s بنسبة %.2f%%", t.Name, t.Rate))
	return t, nil
}

func (s *Service) UpdateTaxRate(ctx context.Context, id, shopID, userID string, dto *UpdateTaxRateDTO) (*TaxRate, error) {
	t, err := s.repo.UpdateTaxRate(ctx, id, shopID, dto)
	if err != nil {
		return nil, err
	}
	s.repo.LogAudit(ctx, t.ShopID, userID, "", "update", "tax_rate", t.ID,
		fmt.Sprintf("تعديل ضريبة %s", t.Name))
	return t, nil
}

func (s *Service) DeleteTaxRate(ctx context.Context, id, shopID, userID string) error {
	if err := s.repo.DeleteTaxRate(ctx, id, shopID); err != nil {
		return err
	}
	s.repo.LogAudit(ctx, shopID, userID, "", "delete", "tax_rate", id, "حذف ضريبة")
	return nil
}

// ---------------------------------------------------------------------------
// Phase 3: Fiscal periods
// ---------------------------------------------------------------------------

func (s *Service) ListFiscalPeriods(ctx context.Context, shopID string) ([]FiscalPeriod, error) {
	return s.repo.ListFiscalPeriods(ctx, shopID)
}

func (s *Service) CreateFiscalPeriod(ctx context.Context, shopID, userID string, year, month int) (*FiscalPeriod, error) {
	p, err := s.repo.CreateFiscalPeriod(ctx, shopID, year, month)
	if err != nil {
		return nil, err
	}
	s.repo.LogAudit(ctx, shopID, userID, "", "create", "period", p.ID,
		fmt.Sprintf("إنشاء فترة %s", p.Name))
	return p, nil
}

func (s *Service) CloseFiscalPeriod(ctx context.Context, id, shopID, userID string) (*FiscalPeriod, error) {
	if err := s.repo.CloseFiscalPeriod(ctx, id, shopID, userID); err != nil {
		return nil, err
	}
	p, err := s.repo.GetFiscalPeriod(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	s.repo.LogAudit(ctx, p.ShopID, userID, "", "close", "period", p.ID,
		fmt.Sprintf("إقفال فترة %s", p.Name))
	return p, nil
}

func (s *Service) ReopenFiscalPeriod(ctx context.Context, id, shopID, userID string) (*FiscalPeriod, error) {
	if err := s.repo.ReopenFiscalPeriod(ctx, id, shopID); err != nil {
		return nil, err
	}
	p, err := s.repo.GetFiscalPeriod(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	s.repo.LogAudit(ctx, p.ShopID, userID, "", "reopen", "period", p.ID,
		fmt.Sprintf("إعادة فتح فترة %s", p.Name))
	return p, nil
}

// ---------------------------------------------------------------------------
// Phase 3: Tax returns
// ---------------------------------------------------------------------------

func (s *Service) GenerateTaxReturn(ctx context.Context, shopID, userID string, year, month int) (*TaxReturn, error) {
	tr, err := s.repo.ComputeVATReturn(ctx, shopID, year, month)
	if err != nil {
		return nil, err
	}
	saved, err := s.repo.UpsertTaxReturn(ctx, tr)
	if err != nil {
		return nil, err
	}
	s.repo.LogAudit(ctx, shopID, userID, "", "generate", "tax_return", saved.ID,
		fmt.Sprintf("توليد إقرار ضريبي %d-%02d: صافي %.2f", year, month, saved.NetTax))
	return saved, nil
}

func (s *Service) ListTaxReturns(ctx context.Context, shopID string) ([]TaxReturn, error) {
	return s.repo.ListTaxReturns(ctx, shopID)
}

func (s *Service) SubmitTaxReturn(ctx context.Context, id, shopID, userID string) error {
	if err := s.repo.SubmitTaxReturn(ctx, id, shopID); err != nil {
		return err
	}
	s.repo.LogAudit(ctx, shopID, userID, "", "submit", "tax_return", id, "تقديم إقرار ضريبي")
	return nil
}

// ---------------------------------------------------------------------------
// Phase 3: Audit log
// ---------------------------------------------------------------------------

func (s *Service) ListAuditLog(ctx context.Context, shopID, entityType, action string, limit int) ([]AuditLogEntry, error) {
	return s.repo.ListAuditLog(ctx, shopID, entityType, action, limit)
}
