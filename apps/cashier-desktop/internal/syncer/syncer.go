// Package syncer keeps the local SQLite cache in sync with the gobackend
// server whenever internet is available:
//
//	pull:  products + shop posSettings (cashiers/PINs)
//	push:  unsynced orders (FIFO) → POST /shops/:id/orders
//	       unsynced shift open/close → /shops/:id/shifts...
//
// Everything is idempotent: orders and shifts carry local UUIDs that map to
// remote ids after the first successful push.
package syncer

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"cashier-desktop/internal/client"
	"cashier-desktop/internal/store"
)

type SessionProvider interface {
	CurrentSession() (baseURL, accessToken, refreshToken, shopID string, ok bool)
	UpdateTokens(accessToken, refreshToken string)
	SessionExpired()
}

type Status struct {
	Online     bool      `json:"online"`
	Syncing    bool      `json:"syncing"`
	LastSync   *string   `json:"lastSync"`
	Pending    int       `json:"pending"`
	Error      string    `json:"error,omitempty"`
	LastSyncAt time.Time `json:"-"`
}

type Syncer struct {
	store *store.Store
	sp    SessionProvider
	emit  func(event string, payload any)

	mu       sync.Mutex
	status   Status
	wake     chan struct{}
	lastPush map[string]string // local order id -> permanent error (kept for logs)
}

func New(st *store.Store, sp SessionProvider, emit func(string, any)) *Syncer {
	return &Syncer{
		store: st,
		sp:    sp,
		emit:  emit,
		wake:  make(chan struct{}, 1),
	}
}

func (s *Syncer) Start() {
	go func() {
		ticker := time.NewTicker(20 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				s.Run(false)
			case <-s.wake:
				s.Run(false)
			}
		}
	}()
}

// Wake nudges the worker (e.g. right after a checkout or reconnect).
func (s *Syncer) Wake() {
	select {
	case s.wake <- struct{}{}:
	default:
	}
}

func (s *Syncer) Status() Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	st := s.status
	st.Pending = s.store.CountUnsyncedOrders()
	return st
}

func (s *Syncer) setStatus(fn func(*Status)) {
	s.mu.Lock()
	fn(&s.status)
	cur := s.status
	s.mu.Unlock()
	s.emit("sync:status", map[string]any{
		"online":   cur.Online,
		"syncing":  cur.Syncing,
		"lastSync": cur.LastSync,
		"error":    cur.Error,
	})
}

// Run performs one full sync pass. force=true runs even if a pass just ran.
func (s *Syncer) Run(interactive bool) {
	s.mu.Lock()
	if s.status.Syncing {
		s.mu.Unlock()
		return
	}
	s.status.Syncing = true
	s.mu.Unlock()
	defer func() {
		s.mu.Lock()
		s.status.Syncing = false
		s.mu.Unlock()
	}()

	baseURL, token, refresh, shopID, ok := s.sp.CurrentSession()
	if !ok || baseURL == "" || shopID == "" {
		return
	}
	c := client.New(baseURL, token, refresh)
	online := false

	// ── 1. pull products (public endpoint) ──────────────────────────────
	var prodResp struct {
		Success bool          `json:"success"`
		Data    []store.Product `json:"data"`
	}
	if err := c.Get("/api/v1/products?shopId="+shopID+"&take=1000", &prodResp); err == nil {
		online = true
		if len(prodResp.Data) > 0 {
			if err := s.store.UpsertProducts(prodResp.Data); err != nil {
				log.Printf("sync: upsert products: %v", err)
			}
		}
	}

	// ── 2. pull shop settings (posSettings: cashiers + PINs) ───────────
	var shopResp struct {
		Success bool `json:"success"`
		Data    struct {
			ID           string         `json:"id"`
			Name         string         `json:"name"`
			LayoutConfig map[string]any `json:"layoutConfig"`
		} `json:"data"`
	}
	if err := c.Get("/api/v1/shops/me", &shopResp); err == nil {
		online = true
		if shopResp.Data.ID != "" {
			if raw, err := jsonMarshal(shopResp.Data.LayoutConfig["posSettings"]); err == nil {
				_ = s.store.SetSetting("pos_settings", string(raw))
			}
			if shopResp.Data.Name != "" {
				_ = s.store.SetSetting("shop_name", shopResp.Data.Name)
			}
		}
	}

	if !online {
		s.setStatus(func(st *Status) { st.Online = false; st.Error = "" })
		return
	}

	// ── 3. push pending shift open ──────────────────────────────────────
	if sh, err := s.store.GetOpenShift(); err == nil && sh != nil && !sh.Synced {
		var out struct {
			Success bool `json:"success"`
			Data    struct {
				ID string `json:"id"`
			} `json:"data"`
		}
		err := c.Post("/api/v1/shops/"+shopID+"/shifts", map[string]any{
			"openingAmount": sh.OpeningAmount,
		}, &out)
		if err == nil && out.Data.ID != "" {
			_ = s.store.MarkShiftSynced(sh.ID, out.Data.ID)
		} else if isAlreadyOpen(err) {
			// a shift is already open on the server (opened by another
			// terminal) — adopt it so closes can still be pushed.
			var act struct {
				Success bool `json:"success"`
				Data    struct {
					ID string `json:"id"`
				} `json:"data"`
			}
			if err2 := c.Get("/api/v1/shops/"+shopID+"/shifts/active", &act); err2 == nil && act.Data.ID != "" {
				_ = s.store.MarkShiftSynced(sh.ID, act.Data.ID)
			}
		}
	}

	// ── 4. push closed-but-unsynced shifts (needs remote id) ───────────
	if shifts, err := s.store.GetShifts(30); err == nil {
		for _, sh := range shifts {
			if sh.Status != "closed" || sh.Synced || sh.RemoteID == nil || *sh.RemoteID == "" {
				continue
			}
			var out struct {
				Success bool `json:"success"`
				Data    struct {
					ID string `json:"id"`
				} `json:"data"`
			}
			if err := c.Post("/api/v1/shops/"+shopID+"/shifts/"+*sh.RemoteID+"/close", map[string]any{
				"closingAmount": derefFloat(sh.ClosingAmount),
				"note":          sh.Note,
			}, &out); err == nil {
				_ = s.store.MarkShiftSynced(sh.ID, *sh.RemoteID)
			}
		}
	}

	// ── 5. push pending orders (FIFO, 40 per pass) ─────────────────────
	if pending, err := s.store.ListUnsyncedOrders(40); err == nil {
		for _, o := range pending {
			items := make([]map[string]any, 0, len(o.Items))
			for _, it := range o.Items {
				qty := it.Quantity
				items = append(items, map[string]any{
					"productId": it.ProductID,
					"quantity":  int(qty),
					"addons":    nil,
					"variantSelection": nil,
				})
			}

			// Resolve the remote shift ID so the server can link the order
			// directly to its shift (avoids time-window ambiguity).
			var remoteShiftID any
			if o.Order.ShiftID != "" {
				if sh, err := s.store.GetShift(o.Order.ShiftID); err == nil && sh != nil && sh.RemoteID != nil && *sh.RemoteID != "" {
					remoteShiftID = *sh.RemoteID
				}
			}

			body := map[string]any{
				"shopId":        shopID,
				"items":         items,
				"total":         o.Order.Total,
				"paymentMethod": o.Order.PaymentMethod,
				"source":        "pos",
				"customerName":  deref(o.Order.CustomerName),
				"customerPhone": deref(o.Order.CustomerPhone),
				"notes":         deref(o.Order.Notes),
				"posShiftId":    remoteShiftID,
			}
			var out struct {
				Success bool `json:"success"`
				Data    struct {
					ID string `json:"id"`
				} `json:"data"`
			}
			if err := c.Post("/api/v1/shops/"+shopID+"/orders", body, &out); err == nil && out.Data.ID != "" {
				_ = s.store.MarkOrderSynced(o.Order.ID, out.Data.ID)
			} else if err != nil {
				if ae, ok := err.(*client.APIError); ok && ae.Status >= 400 && ae.Status < 500 && ae.Status != 401 {
					// permanent rejection — never retry, keep locally flagged
					_ = s.store.SetOrderSyncError(o.Order.ID, ae.Message)
					continue
				}
				_ = s.store.SetOrderSyncError(o.Order.ID, "")
			}
		}
	}

	// token rotation back to session
	s.sp.UpdateTokens(c.AccessToken, c.RefreshToken)

	nowStr := time.Now().Format(time.RFC3339)
	_ = s.store.SetSetting("last_sync", nowStr)
	pending := s.store.CountUnsyncedOrders()
	s.setStatus(func(st *Status) {
		st.Online = true
		st.LastSync = &nowStr
		st.Error = ""
		st.LastSyncAt = time.Now()
	})
	_ = pending
}

func isAlreadyOpen(err error) bool {
	if ae, ok := err.(*client.APIError); ok {
		return ae.Status == 400 || ae.Status == 409
	}
	return false
}

func deref(p *string) any {
	if p == nil {
		return nil
	}
	return *p
}

func derefFloat(p *float64) any {
	if p == nil {
		return nil
	}
	return *p
}

func jsonMarshal(v any) ([]byte, error) {
	if v == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(v)
}
