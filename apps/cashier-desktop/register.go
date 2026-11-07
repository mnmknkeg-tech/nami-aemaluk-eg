package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"cashier-desktop/internal/store"
	"cashier-desktop/internal/syncer"
)

func (a *App) GetActiveShift() *store.Shift {
	sh, err := a.store.GetOpenShift()
	if err != nil {
		return nil
	}
	_ = a.store.RefreshShiftMetrics(sh.ID)
	sh, _ = a.store.GetOpenShift()
	return sh
}

// CloseShift closes the ورديّة with the same math as the server
// (expected = opening + total_sales) and flags it for sync.
func (a *App) CloseShift(closingAmount float64, note string) (*store.Shift, error) {
	cashier := a.readCurrentCashier()
	if cashier == nil {
		return nil, fmt.Errorf("سجّل الكاشير الأول")
	}
	if !cashier.IsAdmin && !cashierHasPermission(posCashierFromCurrent(cashier), "close_shift") {
		return nil, fmt.Errorf("معندكش صلاحية إغلاق الوردية")
	}
	shift, err := a.store.GetOpenShift()
	if err != nil || shift == nil {
		return nil, fmt.Errorf("مفيش وردية مفتوحة")
	}
	if err := a.store.CloseShift(shift.ID, closingAmount, note); err != nil {
		return nil, err
	}
	a.syncer.Wake()
	return a.store.GetShift(shift.ID)
}

func (a *App) GetShiftsHistory() []store.Shift {
	sh, err := a.store.GetShifts(50)
	if err != nil {
		return nil
	}
	return sh
}

// GetShiftReport returns the X-report numbers for the open shift (same math
// as the dashboard buildReportData: netCash = opening + cashSales + in - out).
func (a *App) GetShiftReport() map[string]any {
	shift, err := a.store.GetOpenShift()
	if err != nil || shift == nil {
		return nil
	}
	_ = a.store.RefreshShiftMetrics(shift.ID)
	opening, cashSales, cashIn, cashOut, expected, closing, difference, _ := a.store.ShiftCashBreakdown(shift.ID)
	movements, _ := a.store.ListCashMovements(shift.ID)
	orders, _ := a.store.ListOrders(shift.ID, 200)
	return map[string]any{
		"shift":       shift,
		"opening":     opening,
		"cashSales":   cashSales,
		"cashIn":      cashIn,
		"cashOut":     cashOut,
		"netCash":     opening + cashSales + cashIn - cashOut,
		"expected":    expected,
		"closing":     closing,
		"difference":  difference,
		"movements":   movements,
		"orders":      orders,
		"pendingSync": a.store.CountUnsyncedOrders(),
	}
}

func (a *App) AddCashMovement(kind string, amount float64, note string) error {
	cashier := a.readCurrentCashier()
	if cashier == nil {
		return fmt.Errorf("سجّل الكاشير الأول")
	}
	shift, err := a.store.GetOpenShift()
	if err != nil || shift == nil {
		return fmt.Errorf("مفيش وردية مفتوحة")
	}
	if kind != "in" && kind != "out" {
		return fmt.Errorf("نوع الحركة غير صحيح")
	}
	if amount <= 0 {
		return fmt.Errorf("المبلغ لازم يكون أكبر من صفر")
	}
	m := &store.CashMovement{
		ID:        uuid.NewString(),
		ShiftID:   shift.ID,
		Kind:      kind,
		Amount:    amount,
		Note:      strPtr(note),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	return a.store.InsertCashMovement(m)
}

func (a *App) GetCashMovements() []store.CashMovement {
	shift, err := a.store.GetOpenShift()
	if err != nil || shift == nil {
		return nil
	}
	mov, _ := a.store.ListCashMovements(shift.ID)
	return mov
}

// ─── held orders ────────────────────────────────────────────────────────────

func (a *App) HoldOrder(label, payload string) error {
	if strings.TrimSpace(payload) == "" {
		return fmt.Errorf("السلة فاضية")
	}
	h := &store.HeldOrder{
		ID:        uuid.NewString(),
		Label:     label,
		Payload:   payload,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	return a.store.InsertHeldOrder(h)
}

func (a *App) GetHeldOrders() []store.HeldOrder {
	h, err := a.store.ListHeldOrders()
	if err != nil {
		return nil
	}
	return h
}

func (a *App) DeleteHeldOrder(id string) error {
	return a.store.DeleteHeldOrder(id)
}

// ─── orders / invoices ──────────────────────────────────────────────────────

func (a *App) GetOrders(shiftID string) []store.Order {
	o, err := a.store.ListOrders(shiftID, 200)
	if err != nil {
		return nil
	}
	return o
}

// ─── sync ───────────────────────────────────────────────────────────────────

func (a *App) SyncNow() syncer.Status {
	a.syncer.Run(true)
	return a.syncer.Status()
}

func (a *App) GetSyncStatus() syncer.Status {
	return a.syncer.Status()
}
