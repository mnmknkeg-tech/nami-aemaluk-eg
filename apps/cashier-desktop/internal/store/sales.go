package store

import (
	"database/sql"
)

// ─── shifts ─────────────────────────────────────────────────────────────────

type Shift struct {
	ID            string   `json:"id"`
	RemoteID      *string  `json:"remoteId"`
	OpenedByID    *string  `json:"openedById"`
	OpenedByName  *string  `json:"openedByName"`
	OpeningAmount float64  `json:"openingAmount"`
	ClosingAmount *float64 `json:"closingAmount"`
	ExpectedAmount *float64 `json:"expectedAmount"`
	Difference    *float64 `json:"difference"`
	TotalSales    float64  `json:"totalSales"`
	OrdersCount   int      `json:"ordersCount"`
	Status        string   `json:"status"`
	Note          *string  `json:"note"`
	OpenedAt      string   `json:"openedAt"`
	ClosedAt      *string  `json:"closedAt"`
	Synced        bool     `json:"synced"`
}

func (s *Store) OpenShift(sh *Shift) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`INSERT INTO pos_shifts(id, opened_by_id, opened_by_name, opening_amount, status, opened_at, synced)
		VALUES(?,?,?,?,?,?,?)`,
		sh.ID, sh.OpenedByID, sh.OpenedByName, sh.OpeningAmount, "open", sh.OpenedAt, boolInt(sh.Synced))
	return err
}

func (s *Store) GetOpenShift() (*Shift, error) {
	return s.scanShift(s.db.QueryRow(`SELECT * FROM pos_shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1`))
}

func (s *Store) GetShift(id string) (*Shift, error) {
	return s.scanShift(s.db.QueryRow(`SELECT * FROM pos_shifts WHERE id = ?`, id))
}

func (s *Store) scanShift(row *sql.Row) (*Shift, error) {
	var sh Shift
	var synced int
	err := row.Scan(&sh.ID, &sh.RemoteID, &sh.OpenedByID, &sh.OpenedByName, &sh.OpeningAmount,
		&sh.ClosingAmount, &sh.ExpectedAmount, &sh.Difference, &sh.TotalSales, &sh.OrdersCount,
		&sh.Status, &sh.Note, &sh.OpenedAt, &sh.ClosedAt, &synced)
	if err != nil {
		return nil, err
	}
	sh.Synced = synced == 1
	return &sh, nil
}

type shiftRow struct {
	scanner interface{ Scan(dest ...any) error }
}

// CloseShift finalises the shift locally using the same math as the server:
// expected = opening + total_sales, difference = closing - expected.
func (s *Store) CloseShift(id string, closing float64, note string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var opening, totalSales float64
	var ordersCount int
	if err := tx.QueryRow(`SELECT opening_amount, total_sales, orders_count FROM pos_shifts WHERE id = ?`, id).
		Scan(&opening, &totalSales, &ordersCount); err != nil {
		return err
	}
	expected := opening + totalSales
	diff := closing - expected
	_, err = tx.Exec(`UPDATE pos_shifts SET status='closed', closing_amount=?, expected_amount=?, difference=?, note=?, closed_at=?, synced=0 WHERE id=?`,
		closing, expected, diff, nullableString(note), now(), id)
	if err != nil {
		return err
	}
	return tx.Commit()
}

// RefreshShiftMetrics recomputes total_sales / orders_count from local orders
// exactly like the server does (source pos, non-cancelled, within window).
// Uses a single transaction so the UPDATE and the aggregation are atomic —
// this prevents a race where GetOpenShift reads stale values right after the
// UPDATE (SQLite WAL readers on the same connection always see the latest
// committed data, but an explicit transaction makes the intent clear).
func (s *Store) RefreshShiftMetrics(shiftID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var totalSales float64
	var ordersCount int
	if err := tx.QueryRow(
		`SELECT IFNULL(SUM(total),0), IFNULL(COUNT(*),0)
		 FROM orders
		 WHERE shift_id = ? AND status NOT IN ('CANCELLED','REFUNDED')`,
		shiftID,
	).Scan(&totalSales, &ordersCount); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`UPDATE pos_shifts SET total_sales = ?, orders_count = ? WHERE id = ?`,
		totalSales, ordersCount, shiftID,
	); err != nil {
		return err
	}
	return tx.Commit()
}

// ShiftCashBreakdown returns cash-flow numbers for the shift report:
// netCash = opening + cash sales - returns + cashIn - cashOut (same as the
// dashboard's Z/X report math).
func (s *Store) ShiftCashBreakdown(shiftID string) (opening, cashSales, cashIn, cashOut, expected, closing, difference float64, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	err = s.db.QueryRow(`SELECT opening_amount, IFNULL(closing_amount,0), IFNULL(expected_amount,0), IFNULL(difference,0) FROM pos_shifts WHERE id = ?`, shiftID).
		Scan(&opening, &closing, &expected, &difference)
	if err != nil {
		return
	}
	s.db.QueryRow(`SELECT IFNULL(SUM(total),0) FROM orders WHERE shift_id=? AND payment_method='COD' AND status NOT IN ('CANCELLED','REFUNDED')`, shiftID).Scan(&cashSales)
	s.db.QueryRow(`SELECT IFNULL(SUM(amount),0) FROM cash_movements WHERE shift_id=? AND kind='in'`, shiftID).Scan(&cashIn)
	s.db.QueryRow(`SELECT IFNULL(SUM(amount),0) FROM cash_movements WHERE shift_id=? AND kind='out'`, shiftID).Scan(&cashOut)
	return
}

func (s *Store) GetShifts(limit int) ([]Shift, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.Query(`SELECT * FROM pos_shifts ORDER BY opened_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Shift
	for rows.Next() {
		var sh Shift
		var synced int
		if err := rows.Scan(&sh.ID, &sh.RemoteID, &sh.OpenedByID, &sh.OpenedByName, &sh.OpeningAmount,
			&sh.ClosingAmount, &sh.ExpectedAmount, &sh.Difference, &sh.TotalSales, &sh.OrdersCount,
			&sh.Status, &sh.Note, &sh.OpenedAt, &sh.ClosedAt, &synced); err != nil {
			return nil, err
		}
		sh.Synced = synced == 1
		out = append(out, sh)
	}
	return out, rows.Err()
}

// RefreshAndGetShift recomputes the shift metrics and returns the updated shift
// in a single logical operation — avoids the window between RefreshShiftMetrics
// and a subsequent GetOpenShift where another writer could slip in.
func (s *Store) RefreshAndGetShift(shiftID string) (*Shift, error) {
	if err := s.RefreshShiftMetrics(shiftID); err != nil {
		return nil, err
	}
	return s.GetShift(shiftID)
}
func (s *Store) MarkShiftSynced(localID, remoteID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE pos_shifts SET remote_id=?, synced=1 WHERE id=?`, remoteID, localID)
	return err
}

// ─── orders ─────────────────────────────────────────────────────────────────

type Order struct {
	ID            string  `json:"id"`
	RemoteID      *string `json:"remoteId"`
	ShiftID       string  `json:"shiftId"`
	Total         float64 `json:"total"`
	Subtotal      float64 `json:"subtotal"`
	Discount      float64 `json:"discount"`
	PaymentMethod string  `json:"paymentMethod"`
	Status        string  `json:"status"`
	CustomerName  *string `json:"customerName"`
	CustomerPhone *string `json:"customerPhone"`
	Notes         *string `json:"notes"`
	CashierID     *string `json:"cashierId"`
	CashierName   *string `json:"cashierName"`
	CreatedAt     string  `json:"createdAt"`
	Synced        bool    `json:"synced"`
}

type OrderItem struct {
	ID        string  `json:"id"`
	OrderID   string  `json:"orderId"`
	ProductID string  `json:"productId"`
	Name      string  `json:"name"`
	Quantity  float64 `json:"quantity"`
	Price     float64 `json:"price"`
}

type NewOrder struct {
	Order Order
	Items []OrderItem
}

func (s *Store) InsertOrder(o *NewOrder) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`INSERT INTO orders(id, shift_id, total, subtotal, discount, payment_method, status, customer_name, customer_phone, notes, cashier_id, cashier_name, created_at, synced)
		VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		o.Order.ID, o.Order.ShiftID, o.Order.Total, o.Order.Subtotal, o.Order.Discount,
		o.Order.PaymentMethod, o.Order.Status, o.Order.CustomerName, o.Order.CustomerPhone,
		o.Order.Notes, o.Order.CashierID, o.Order.CashierName, o.Order.CreatedAt, 0); err != nil {
		return err
	}
	for _, it := range o.Items {
		if _, err = tx.Exec(`INSERT INTO order_items(id, order_id, product_id, name, quantity, price) VALUES(?,?,?,?,?,?)`,
			it.ID, it.OrderID, it.ProductID, it.Name, it.Quantity, it.Price); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) GetOrder(id string) (*NewOrder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := &NewOrder{}
	var synced int
	err := s.db.QueryRow(`SELECT id, remote_id, shift_id, total, subtotal, discount, payment_method, status, customer_name, customer_phone, notes, cashier_id, cashier_name, created_at, synced FROM orders WHERE id=?`,
		id).Scan(&out.Order.ID, &out.Order.RemoteID, &out.Order.ShiftID, &out.Order.Total, &out.Order.Subtotal,
		&out.Order.Discount, &out.Order.PaymentMethod, &out.Order.Status, &out.Order.CustomerName,
		&out.Order.CustomerPhone, &out.Order.Notes, &out.Order.CashierID, &out.Order.CashierName,
		&out.Order.CreatedAt, &synced)
	if err != nil {
		return nil, err
	}
	out.Order.Synced = synced == 1
	rows, err := s.db.Query(`SELECT id, order_id, product_id, name, quantity, price FROM order_items WHERE order_id=?`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var it OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.Name, &it.Quantity, &it.Price); err != nil {
			return nil, err
		}
		out.Items = append(out.Items, it)
	}
	return out, rows.Err()
}

// ListOrders returns recent orders, newest first. pass shiftID to scope.
func (s *Store) ListOrders(shiftID string, limit int) ([]Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	q := `SELECT id, remote_id, shift_id, total, subtotal, discount, payment_method, status, customer_name, customer_phone, notes, cashier_id, cashier_name, created_at, synced FROM orders`
	var args []any
	if shiftID != "" {
		q += ` WHERE shift_id = ?`
		args = append(args, shiftID)
	}
	q += ` ORDER BY created_at DESC LIMIT ?`
	args = append(args, limit)
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Order
	for rows.Next() {
		var o Order
		var synced int
		if err := rows.Scan(&o.ID, &o.RemoteID, &o.ShiftID, &o.Total, &o.Subtotal, &o.Discount,
			&o.PaymentMethod, &o.Status, &o.CustomerName, &o.CustomerPhone, &o.Notes,
			&o.CashierID, &o.CashierName, &o.CreatedAt, &synced); err != nil {
			return nil, err
		}
		o.Synced = synced == 1
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *Store) CountUnsyncedOrders() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	var n int
	s.db.QueryRow(`SELECT COUNT(*) FROM orders WHERE synced = 0`).Scan(&n)
	return n
}

func (s *Store) MarkOrderSynced(localID, remoteID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE orders SET remote_id=?, synced=1, sync_error=NULL WHERE id=?`, remoteID, localID)
	return err
}

func (s *Store) SetOrderSyncError(localID, errMsg string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE orders SET sync_error=? WHERE id=?`, errMsg, localID)
	return err
}

// ListUnsyncedOrders returns FIFO pending orders with their items.
func (s *Store) ListUnsyncedOrders(limit int) ([]*NewOrder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.Query(`SELECT id, remote_id, shift_id, total, subtotal, discount, payment_method, status, customer_name, customer_phone, notes, cashier_id, cashier_name, created_at, synced FROM orders WHERE synced = 0 ORDER BY created_at LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*NewOrder
	var ids []string
	for rows.Next() {
		var o Order
		var synced int
		if err := rows.Scan(&o.ID, &o.RemoteID, &o.ShiftID, &o.Total, &o.Subtotal, &o.Discount,
			&o.PaymentMethod, &o.Status, &o.CustomerName, &o.CustomerPhone, &o.Notes,
			&o.CashierID, &o.CashierName, &o.CreatedAt, &synced); err != nil {
			return nil, err
		}
		ids = append(ids, o.ID)
		out = append(out, &NewOrder{Order: o})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, id := range ids {
		irows, err := s.db.Query(`SELECT id, order_id, product_id, name, quantity, price FROM order_items WHERE order_id=?`, id)
		if err != nil {
			return nil, err
		}
		for irows.Next() {
			var it OrderItem
			if err := irows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.Name, &it.Quantity, &it.Price); err != nil {
				irows.Close()
				return nil, err
			}
			for _, o := range out {
				if o.Order.ID == it.OrderID {
					o.Items = append(o.Items, it)
				}
			}
		}
		irows.Close()
	}
	return out, nil
}

// ─── cash movements ─────────────────────────────────────────────────────────

type CashMovement struct {
	ID        string  `json:"id"`
	ShiftID   string  `json:"shiftId"`
	Kind      string  `json:"kind"`
	Amount    float64 `json:"amount"`
	Note      *string `json:"note"`
	CreatedAt string  `json:"createdAt"`
}

func (s *Store) InsertCashMovement(m *CashMovement) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`INSERT INTO cash_movements(id, shift_id, kind, amount, note, created_at) VALUES(?,?,?,?,?,?)`,
		m.ID, m.ShiftID, m.Kind, m.Amount, m.Note, m.CreatedAt)
	return err
}

func (s *Store) ListCashMovements(shiftID string) ([]CashMovement, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.Query(`SELECT id, shift_id, kind, amount, note, created_at FROM cash_movements WHERE shift_id=? ORDER BY created_at DESC`, shiftID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CashMovement
	for rows.Next() {
		var m CashMovement
		if err := rows.Scan(&m.ID, &m.ShiftID, &m.Kind, &m.Amount, &m.Note, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// ─── held orders ────────────────────────────────────────────────────────────

type HeldOrder struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Payload   string `json:"payload"`
	CreatedAt string `json:"createdAt"`
}

func (s *Store) InsertHeldOrder(h *HeldOrder) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`INSERT INTO held_orders(id, label, payload, created_at) VALUES(?,?,?,?)`,
		h.ID, h.Label, h.Payload, h.CreatedAt)
	return err
}

func (s *Store) ListHeldOrders() ([]HeldOrder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.Query(`SELECT id, label, payload, created_at FROM held_orders ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []HeldOrder
	for rows.Next() {
		var h HeldOrder
		if err := rows.Scan(&h.ID, &h.Label, &h.Payload, &h.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

func (s *Store) DeleteHeldOrder(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM held_orders WHERE id=?`, id)
	return err
}

func nullableString(v string) any {
	if v == "" {
		return nil
	}
	return v
}
