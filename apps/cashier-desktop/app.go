package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

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
