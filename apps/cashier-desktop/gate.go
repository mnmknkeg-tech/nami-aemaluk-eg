package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"cashier-desktop/internal/store"
)

// GateInfo contains the local cashier and shift state shown at the lock screen.
type GateInfo struct {
	Mode        string          `json:"mode"` // open | resume | locked-admin
	ActiveShift *store.Shift    `json:"activeShift"`
	Cashiers    []GateCashier   `json:"cashiers"`
	HasAdminPin bool            `json:"hasAdminPin"`
	Current     *currentCashier `json:"current"`
	ShopName    string          `json:"shopName"`
	LastSync    *string         `json:"lastSync"`
}

type GateCashier struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Permissions []string `json:"permissions"`
}

// GetGate returns everything the lock screen needs. mode 'open' = no active
// shift (need opening cash), 'resume' = shift open but nobody signed in on
// this device — same logic as the dashboard gate.
func (a *App) GetGate() GateInfo {
	gi := GateInfo{ShopName: a.shopName()}
	if raw, ok := a.store.GetSetting("last_sync"); ok {
		gi.LastSync = &raw
	}
	ps := a.readPosSettings()
	gi.HasAdminPin = ps.AdminPin != ""
	for _, c := range ps.Cashiers {
		if cashierHasPermission(c, "open_shift") {
			gi.Cashiers = append(gi.Cashiers, GateCashier{ID: c.ID, Name: c.Name, Permissions: c.Permissions})
		}
	}
	if cur := a.readCurrentCashier(); cur != nil {
		gi.Current = cur
	}
	shift, err := a.store.GetOpenShift()
	if err == nil && shift != nil {
		_ = a.store.RefreshShiftMetrics(shift.ID)
		shift, _ = a.store.GetOpenShift()
		gi.ActiveShift = shift
	}
	switch {
	case gi.Current != nil:
		gi.Mode = "none"
	case shift != nil:
		gi.Mode = "resume"
	default:
		gi.Mode = "open"
	}
	return gi
}

func (a *App) shopName() string {
	if s := a.readSession(); s != nil && s.ShopName != "" {
		return s.ShopName
	}
	if n, ok := a.store.GetSetting("shop_name"); ok {
		return n
	}
	return ""
}

// verifyCashierPin checks a PIN against the synced cashier list.
func (a *App) verifyCashierPin(cashierID, pin string) (*PosCashier, error) {
	if strings.TrimSpace(pin) == "" {
		return nil, fmt.Errorf("اكتب الرقم السري")
	}
	ps := a.readPosSettings()
	for _, c := range ps.Cashiers {
		if c.ID == cashierID {
			if c.PIN != pin {
				return nil, fmt.Errorf("الرقم السري غير صحيح")
			}
			return &c, nil
		}
	}
	return nil, fmt.Errorf("اختار الكاشير الأول")
}

// GateAdmin unlocks the app with the admin PIN — full access (reports,
// closing the shift, cash movements) without opening a cashier session.
func (a *App) GateAdmin(adminPin string) error {
	ps := a.readPosSettings()
	if ps.AdminPin == "" {
		return fmt.Errorf("مفيش رقم سري للأدمن — اعمله من إعدادات الكاشير في الداشبورد")
	}
	if adminPin != ps.AdminPin {
		return fmt.Errorf("الرقم السري غير صحيح")
	}
	a.writeCurrentCashier(&currentCashier{ID: "admin", Name: "أدمن", IsAdmin: true, Permissions: []string{
		"open_shift", "close_shift", "returns", "discount", "reports",
	}})
	runtime.EventsEmit(a.ctx, "cashier:changed", a.readCurrentCashier())
	a.syncer.Wake()
	return nil
}

// GateSubmit verifies the cashier PIN, opens a new shift when needed and
// records the ورديّة locally (the syncer pushes it to the server when
// internet is available). Mirrors the dashboard submitGate().
func (a *App) GateSubmit(cashierID, pin string, openingCash float64) (*store.Shift, error) {
	var cashier *PosCashier
	if cashierID == "" && strings.TrimSpace(pin) == "" {
		// "فتح بدون كاشير" — allowed only when no cashier with open_shift exists
		ps := a.readPosSettings()
		for _, c := range ps.Cashiers {
			if cashierHasPermission(c, "open_shift") {
				return nil, fmt.Errorf("اختار الكاشير الأول")
			}
		}
	} else {
		var err error
		cashier, err = a.verifyCashierPin(cashierID, pin)
		if err != nil {
			return nil, err
		}
	}
	shift, err := a.store.GetOpenShift()
	if err != nil || shift == nil {
		// open a new shift locally — recorded exactly like pos_shifts
		id := uuid.NewString()
		sh := &store.Shift{
			ID:            id,
			OpeningAmount: openingCash,
			Status:        "open",
			OpenedAt:      time.Now().UTC().Format(time.RFC3339),
		}
		if cashier != nil {
			sh.OpenedByID = &cashier.ID
			sh.OpenedByName = &cashier.Name
		}
		if err := a.store.OpenShift(sh); err != nil {
			return nil, err
		}
		shift = sh
		a.syncer.Wake()
	}
	if cashier != nil {
		a.writeCurrentCashier(&currentCashier{ID: cashier.ID, Name: cashier.Name, Permissions: cashier.Permissions})
	} else {
		// legacy mode: no cashiers configured — sell without a named cashier
		a.writeCurrentCashier(&currentCashier{ID: "", Name: "بدون كاشير", IsAdmin: true})
	}
	runtime.EventsEmit(a.ctx, "cashier:changed", a.readCurrentCashier())
	return shift, nil
}

// LockScreen signs the current cashier out (shift stays open) — same as
// removing pos_current_cashier in the dashboard.
func (a *App) LockScreen() {
	a.writeCurrentCashier(nil)
	runtime.EventsEmit(a.ctx, "cashier:changed", nil)
}

// ─── products ───────────────────────────────────────────────────────────────

func (a *App) GetProducts(search, category string) ([]store.Product, error) {
	return a.store.GetProducts(search, category, false)
}

func (a *App) GetCategories() []string {
	return a.store.GetCategories()
}
