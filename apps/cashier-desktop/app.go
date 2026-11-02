package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"cashier-desktop/internal/client"
	"cashier-desktop/internal/store"
	"cashier-desktop/internal/syncer"
)

// App is the struct bound to the frontend. Every exported method becomes
// window.go.main.App.<Method>() in the webview.
type App struct {
	ctx    context.Context
	store  *store.Store
	syncer *syncer.Syncer
}

func NewApp() *App { return &App{} }

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	st, err := store.Open()
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	a.store = st
	a.syncer = syncer.New(st, a, func(event string, payload any) {
		runtime.EventsEmit(a.ctx, event, payload)
	})
	a.syncer.Start()
	a.syncer.Wake()
}

func (a *App) shutdown(ctx context.Context) {
	if a.store != nil {
		a.store.Close()
	}
}

// ─── syncer.SessionProvider ─────────────────────────────────────────────────

func (a *App) CurrentSession() (string, string, string, string, bool) {
	s := a.readSession()
	if s == nil {
		return "", "", "", "", false
	}
	return s.ServerURL, s.AccessToken, s.RefreshToken, s.ShopID, true
}

func (a *App) UpdateTokens(access, refresh string) {
	s := a.readSession()
	if s == nil {
		return
	}
	if access != "" {
		s.AccessToken = access
	}
	if refresh != "" {
		s.RefreshToken = refresh
	}
	a.writeSession(s)
}

func (a *App) SessionExpired() {
	runtime.EventsEmit(a.ctx, "session:expired")
}

// ─── session (stored in settings table) ─────────────────────────────────────

type sessionData struct {
	ServerURL    string `json:"serverUrl"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ShopID       string `json:"shopId"`
	ShopName     string `json:"shopName"`
	Email        string `json:"email"`
	LinkedAt     string `json:"linkedAt"`
}

// sessionTTL — لأمان الحساب: التاجر لازم يعيد تأكيد الحساب كل تلت شهور.
const sessionTTL = 90 * 24 * time.Hour

func (a *App) readSession() *sessionData {
	raw, ok := a.store.GetSetting("session")
	if !ok {
		return nil
	}
	var s sessionData
	if json.Unmarshal([]byte(raw), &s) != nil {
		return nil
	}
	return &s
}

func (a *App) writeSession(s *sessionData) {
	b, _ := json.Marshal(s)
	_ = a.store.SetSetting("session", string(b))
}

// ─── posSettings helpers (mirror of dashboard src/lib/posSettings.ts) ───────

type PosCashier struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	PIN         string   `json:"pin"`
	Permissions []string `json:"permissions"`
}

type PosSettings struct {
	AdminPin          string       `json:"adminPin"`
	Cashiers          []PosCashier `json:"cashiers"`
	AutoConfirmOrders bool         `json:"autoConfirmOrders"`
}

func (a *App) readPosSettings() PosSettings {
	var ps PosSettings
	if raw, ok := a.store.GetSetting("pos_settings"); ok {
		_ = json.Unmarshal([]byte(raw), &ps)
	}
	return ps
}

func cashierHasPermission(c PosCashier, perm string) bool {
	if c.Permissions == nil {
		return false
	}
	for _, p := range c.Permissions {
		if p == perm {
			return true
		}
	}
	return false
}

type currentCashier struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	IsAdmin     bool     `json:"isAdmin"`
	Permissions []string `json:"permissions"`
}

func (a *App) readCurrentCashier() *currentCashier {
	raw, ok := a.store.GetSetting("current_cashier")
	if !ok {
		return nil
	}
	var c currentCashier
	if json.Unmarshal([]byte(raw), &c) != nil {
		return nil
	}
	return &c
}

func (a *App) writeCurrentCashier(c *currentCashier) {
	if c == nil {
		_ = a.store.DeleteSetting("current_cashier")
		return
	}
	b, _ := json.Marshal(c)
	_ = a.store.SetSetting("current_cashier", string(b))
}

// ─── state / connect (first-run setup) ──────────────────────────────────────

type AppState struct {
	Configured     bool   `json:"configured"`
	ShopName       string `json:"shopName"`
	ServerURL      string `json:"serverUrl"`
	Email          string `json:"email"`
	HasProducts    bool   `json:"hasProducts"`
	CurrentSet     bool   `json:"currentSet"`
	SessionExpired bool   `json:"sessionExpired"`
}

// GetState tells the frontend which screen to show.
func (a *App) GetState() AppState {
	st := AppState{}
	if s := a.readSession(); s != nil {
		st.Configured = true
		st.ShopName = s.ShopName
		st.ServerURL = s.ServerURL
		st.Email = s.Email
		// حماية الحساب: بعد 90 يوم من آخر تأكيد — التاجر يعيد تسجيل الدخول.
		// البيانات المحلية والفواتير المعلقة بتفضل زي ما هي.
		if linked, err := time.Parse(time.RFC3339, s.LinkedAt); err != nil || time.Since(linked) > sessionTTL {
			st.SessionExpired = true
			// وقف المزامنة لحد إعادة التأكيد
			a.writeSession(&sessionData{ServerURL: s.ServerURL, ShopID: s.ShopID, ShopName: s.ShopName, Email: s.Email})
		}
	}
	st.HasProducts = a.store.CountProducts() > 0
	st.CurrentSet = a.readCurrentCashier() != nil
	return st
}

// Connect logs into the server once, stores the session and pulls the first
// batch of data (products + cashier settings). After this the app works
// offline forever.
func (a *App) Connect(serverURL, email, password string) error {
	serverURL = strings.TrimRight(strings.TrimSpace(serverURL), "/")
	if !strings.HasPrefix(serverURL, "http") {
		return fmt.Errorf("رابط السيرفر لازم يبدأ بـ http")
	}
	c := client.New(serverURL, "", "")
	resp, err := c.Login(email, password)
	if err != nil {
		return fmt.Errorf("فشل تسجيل الدخول: %v", err)
	}
	// pull shop info to grab the shop id + name + posSettings
	c.AccessToken = resp.Token.AccessToken
	c.RefreshToken = resp.Token.RefreshToken
	var shopResp struct {
		Success bool `json:"success"`
		Data    struct {
			ID           string         `json:"id"`
			Name         string         `json:"name"`
			LayoutConfig map[string]any `json:"layoutConfig"`
		} `json:"data"`
	}
	if err := c.Get("/api/v1/shops/me", &shopResp); err != nil {
		return fmt.Errorf("تم الدخول لكن فشل جلب بيانات المحل: %v", err)
	}
	if shopResp.Data.ID == "" {
		return fmt.Errorf("الحساب ده مش مربوط بمحل")
	}

	a.writeSession(&sessionData{
		ServerURL:    serverURL,
		AccessToken:  resp.Token.AccessToken,
		RefreshToken: resp.Token.RefreshToken,
		ShopID:       shopResp.Data.ID,
		ShopName:     shopResp.Data.Name,
		Email:        email,
		LinkedAt:     time.Now().UTC().Format(time.RFC3339),
	})
	if raw, err := json.Marshal(shopResp.Data.LayoutConfig["posSettings"]); err == nil {
		_ = a.store.SetSetting("pos_settings", string(raw))
	}
	a.syncer.Wake()
	return nil
}

// Disconnect forgets the session (data stays local).
func (a *App) Disconnect() error {
	return a.store.DeleteSetting("session")
}

// ─── gate (بطاقة الدخول) ────────────────────────────────────────────────────

type GateInfo struct {
	Mode        string       `json:"mode"` // open | resume | locked-admin
	ActiveShift *store.Shift `json:"activeShift"`
	Cashiers    []GateCashier `json:"cashiers"`
	HasAdminPin bool         `json:"hasAdminPin"`
	Current     *currentCashier `json:"current"`
	ShopName    string       `json:"shopName"`
	LastSync    *string      `json:"lastSync"`
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

// ─── checkout ───────────────────────────────────────────────────────────────

type CheckoutItem struct {
	ProductID string  `json:"productId"`
	Name      string  `json:"name"`
	Quantity  float64 `json:"quantity"`
	Price     float64 `json:"price"`
}

type CheckoutRequest struct {
	Items         []CheckoutItem `json:"items"`
	PaymentMethod string         `json:"paymentMethod"` // cash | card | wallet | credit
	DiscountType  string         `json:"discountType"`  // none | percent | fixed
	DiscountValue float64        `json:"discountValue"`
	CustomerName  string         `json:"customerName"`
	CustomerPhone string         `json:"customerPhone"`
	Notes         string         `json:"notes"`
}

type CheckoutResult struct {
	Order      store.Order   `json:"order"`
	Items      []store.OrderItem `json:"items"`
	Change     float64       `json:"change"`
}

var paymentMethodMap = map[string]string{
	"cash": "COD", "card": "CARD", "wallet": "WALLET", "credit": "CREDIT",
}

// Checkout records the sale locally FIRST (always succeeds offline), then the
// syncer pushes it. Same order shape the dashboard POS posts: source 'pos',
// payment COD/CARD/WALLET/CREDIT, discounts crammed into pipe-delimited notes.
func (a *App) Checkout(req CheckoutRequest) (*CheckoutResult, error) {
	cashier := a.readCurrentCashier()
	if cashier == nil {
		return nil, fmt.Errorf("سجّل الكاشير الأول")
	}
	shift, err := a.store.GetOpenShift()
	if err != nil || shift == nil {
		return nil, fmt.Errorf("مفيش وردية مفتوحة — افتح الوردية الأول")
	}
	if len(req.Items) == 0 {
		return nil, fmt.Errorf("السلة فاضية")
	}
	pm, ok := paymentMethodMap[req.PaymentMethod]
	if !ok {
		pm = "COD"
	}

	subtotal := 0.0
	for _, it := range req.Items {
		subtotal += it.Price * it.Quantity
	}
	discount := 0.0
	notes := []string{}
	switch req.DiscountType {
	case "percent":
		if !cashier.IsAdmin && !cashierHasPermission(posCashierFromCurrent(cashier), "discount") {
			return nil, fmt.Errorf("معندكش صلاحية منح خصم")
		}
		pct := req.DiscountValue
		if pct < 0 {
			pct = 0
		}
		if pct > 100 {
			pct = 100
		}
		discount = subtotal * pct / 100
		notes = append(notes, fmt.Sprintf("discount:percent:%g", pct))
	case "fixed":
		if !cashier.IsAdmin && !cashierHasPermission(posCashierFromCurrent(cashier), "discount") {
			return nil, fmt.Errorf("معندكش صلاحية منح خصم")
		}
		discount = req.DiscountValue
		if discount < 0 {
			discount = 0
		}
		if discount > subtotal {
			discount = subtotal
		}
		notes = append(notes, fmt.Sprintf("discount:fixed:%g", req.DiscountValue))
	}
	if strings.TrimSpace(req.Notes) != "" {
		notes = append(notes, req.Notes)
	}
	total := subtotal - discount
	if total < 0 {
		total = 0
	}

	orderID := uuid.NewString()
	no := &store.NewOrder{
		Order: store.Order{
			ID:            orderID,
			ShiftID:       shift.ID,
			Total:         total,
			Subtotal:      subtotal,
			Discount:      discount,
			PaymentMethod: pm,
			Status:        "CONFIRMED",
			CustomerName:  strPtr(req.CustomerName),
			CustomerPhone: strPtr(req.CustomerPhone),
			Notes:         strPtr(strings.Join(notes, "|")),
			CashierID:     &cashier.ID,
			CashierName:   &cashier.Name,
			CreatedAt:     time.Now().UTC().Format(time.RFC3339),
		},
	}
	for _, it := range req.Items {
		no.Items = append(no.Items, store.OrderItem{
			ID:        uuid.NewString(),
			OrderID:   orderID,
			ProductID: it.ProductID,
			Name:      it.Name,
			Quantity:  it.Quantity,
			Price:     it.Price,
		})
		if product, err := a.store.GetProductByID(it.ProductID); err == nil && product != nil && product.TrackStock {
			_ = a.store.AdjustLocalStock(product.ID, -int(it.Quantity))
		}
	}
	if err := a.store.InsertOrder(no); err != nil {
		return nil, err
	}
	_ = a.store.RefreshShiftMetrics(shift.ID)
	a.syncer.Wake()

	order, _ := a.store.GetOrder(orderID)
	res := &CheckoutResult{Order: order.Order, Items: order.Items}
	return res, nil
}

func posCashierFromCurrent(c *currentCashier) PosCashier {
	return PosCashier{ID: c.ID, Name: c.Name, Permissions: c.Permissions}
}

func strPtr(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}

// ─── shift ops ──────────────────────────────────────────────────────────────

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
