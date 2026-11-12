package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"cashier-desktop/internal/store"
)

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
	Order  store.Order       `json:"order"`
	Items  []store.OrderItem `json:"items"`
	Change float64           `json:"change"`
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
