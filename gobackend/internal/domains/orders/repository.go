package orders

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the Orders domain.
type Repository struct {
	pool *db.Pool
}

// Pool exposes the underlying pool (used by cross-domain helpers like customers.LinkOrderCustomer).
func (r *Repository) Pool() *db.Pool { return r.pool }

// NewRepository creates a new orders repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// FindByID returns an order by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*Order, error) {
	row := r.pool.QueryRow(ctx, selectOrder+" WHERE o.id = $1 LIMIT 1", id)
	order, err := scanOrder(row)
	if err != nil || order == nil {
		return order, err
	}
	// attach items like the list endpoints do, so the order detail view is complete
	items, err := r.scanOrderItems(ctx, []string{order.ID})
	if err != nil {
		return nil, err
	}
	if len(items) > 0 {
		order.Items = items
	}
	return order, nil
}

// ListByShop returns orders for a shop with optional date range.
func (r *Repository) ListByShop(ctx context.Context, shopID string, from, to *time.Time, limit, offset int) ([]Order, error) {
	filters := "o.shop_id = $1"
	args := []any{shopID, limit, offset}
	idx := 4
	if from != nil {
		filters += fmt.Sprintf(" AND o.created_at >= $%d", idx)
		args = append(args, *from)
		idx++
	}
	if to != nil {
		filters += fmt.Sprintf(" AND o.created_at <= $%d", idx)
		args = append(args, *to)
		idx++
	}
	query := selectOrder + " WHERE " + filters + " ORDER BY o.created_at DESC LIMIT $2 OFFSET $3"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_orders_failed", err)
	}
	defer rows.Close()
	return r.scanOrders(ctx, rows)
}

// ListAllAdmin returns orders across all shops with optional filters.
func (r *Repository) ListAllAdmin(ctx context.Context, shopID, userID string, from, to *time.Time, limit, offset int) ([]Order, error) {
	filters := "1=1"
	args := []any{limit, offset}
	idx := 3
	if shopID != "" {
		filters += fmt.Sprintf(" AND o.shop_id = $%d", idx)
		args = append(args, shopID)
		idx++
	}
	if userID != "" {
		filters += fmt.Sprintf(" AND o.user_id = $%d", idx)
		args = append(args, userID)
		idx++
	}
	if from != nil {
		filters += fmt.Sprintf(" AND o.created_at >= $%d", idx)
		args = append(args, *from)
		idx++
	}
	if to != nil {
		filters += fmt.Sprintf(" AND o.created_at <= $%d", idx)
		args = append(args, *to)
		idx++
	}
	query := selectOrder + " WHERE " + filters + " ORDER BY o.created_at DESC LIMIT $1 OFFSET $2"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_orders_failed", err)
	}
	defer rows.Close()
	return r.scanOrders(ctx, rows)
}

// ListByCourier returns orders assigned to a courier.
func (r *Repository) ListByCourier(ctx context.Context, courierID string, limit, offset int) ([]Order, error) {
	query := selectOrder + " WHERE o.courier_id = $1 ORDER BY o.created_at DESC LIMIT $2 OFFSET $3"
	rows, err := r.pool.Query(ctx, query, courierID, limit, offset)
	if err != nil {
		return nil, errors.Internal("list_courier_orders_failed", err)
	}
	defer rows.Close()
	return r.scanOrders(ctx, rows)
}

// ListByUserID returns orders placed by a customer (user_id).
func (r *Repository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]Order, error) {
	query := selectOrder + " WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT $2 OFFSET $3"
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, errors.Internal("list_customer_orders_failed", err)
	}
	defer rows.Close()
	return r.scanOrders(ctx, rows)
}

// countOrders returns the total count of orders matching the provided filters.
// It centralizes the WHERE logic so counts always match list queries.
func (r *Repository) countOrders(ctx context.Context, where string, args []any) (int64, error) {
	query := "SELECT COUNT(*) FROM orders o WHERE " + where
	var total int64
	err := r.pool.QueryRow(ctx, query, args...).Scan(&total)
	if err != nil {
		return 0, errors.Internal("count_orders_failed", err)
	}
	return total, nil
}

// CountByShop returns the total count of orders for a shop within an optional date range.
func (r *Repository) CountByShop(ctx context.Context, shopID string, from, to *time.Time) (int64, error) {
	filters := "o.shop_id = $1"
	args := []any{shopID}
	idx := 2
	if from != nil {
		filters += fmt.Sprintf(" AND o.created_at >= $%d", idx)
		args = append(args, *from)
		idx++
	}
	if to != nil {
		filters += fmt.Sprintf(" AND o.created_at <= $%d", idx)
		args = append(args, *to)
		idx++
	}
	return r.countOrders(ctx, filters, args)
}

// CountAllAdmin returns the total count of orders across all shops with optional filters.
func (r *Repository) CountAllAdmin(ctx context.Context, shopID, userID string, from, to *time.Time) (int64, error) {
	filters := "1=1"
	args := []any{}
	idx := 1
	if shopID != "" {
		filters += fmt.Sprintf(" AND o.shop_id = $%d", idx)
		args = append(args, shopID)
		idx++
	}
	if userID != "" {
		filters += fmt.Sprintf(" AND o.user_id = $%d", idx)
		args = append(args, userID)
		idx++
	}
	if from != nil {
		filters += fmt.Sprintf(" AND o.created_at >= $%d", idx)
		args = append(args, *from)
		idx++
	}
	if to != nil {
		filters += fmt.Sprintf(" AND o.created_at <= $%d", idx)
		args = append(args, *to)
		idx++
	}
	return r.countOrders(ctx, filters, args)
}

// CountByCourier returns the total count of orders assigned to a courier.
func (r *Repository) CountByCourier(ctx context.Context, courierID string) (int64, error) {
	return r.countOrders(ctx, "o.courier_id = $1", []any{courierID})
}

// CountByUserID returns the total count of orders placed by a customer.
func (r *Repository) CountByUserID(ctx context.Context, userID string) (int64, error) {
	return r.countOrders(ctx, "o.user_id = $1", []any{userID})
}
// FindOpenShiftID returns the id of the currently open POS shift of a shop.
func (r *Repository) FindOpenShiftID(ctx context.Context, shopID string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM pos_shifts WHERE shop_id = $1 AND status = 'open' LIMIT 1`,
		shopID,
	).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

// ShiftBelongsToShop verifies that a shift id exists and belongs to the shop.
func (r *Repository) ShiftBelongsToShop(ctx context.Context, shiftID, shopID string) bool {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM pos_shifts WHERE id = $1 AND shop_id = $2)`,
		shiftID, shopID,
	).Scan(&exists)
	return err == nil && exists
}

// RefreshShiftMetrics recomputes total_sales / orders_count of a POS shift
// from its linked orders, so the live shift numbers update immediately after
// each sale instead of only on the next shift read.
func (r *Repository) RefreshShiftMetrics(ctx context.Context, shiftID string) {
	if shiftID == "" {
		return
	}
	_, _ = r.pool.Exec(ctx, `
		UPDATE pos_shifts s SET
			total_sales = COALESCE(agg.sales, 0),
			orders_count = COALESCE(agg.cnt, 0)
		FROM (
			SELECT SUM(o.total) AS sales, COUNT(*) AS cnt
			FROM orders o
			WHERE o.pos_shift_id = $1
			  AND (o.status IS NULL OR o.status::text NOT IN ('CANCELLED', 'REFUNDED', 'RETURNED'))
		) agg
		WHERE s.id = $1 AND s.status = 'open'`, shiftID)
}

// CreateOrder inserts an order and its items in a transaction, optionally decrementing stock.
func (r *Repository) CreateOrder(ctx context.Context, order *Order, decrementStock bool) (*Order, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Insert order.
	orderQuery := `
		INSERT INTO orders (
			id, total, status, payment_method, payment_status, notes, customer_phone,
			delivery_address_manual, delivery_lat, delivery_lng, delivery_note, customer_note,
			user_id, shop_id, customer_id, courier_id, source, pos_shift_id, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NULL, NULL, $14, $15, NOW(), NOW()
		) RETURNING ` + orderColumnsNoAlias
	var createdCustomerID sql.NullString
	err = tx.QueryRow(ctx, orderQuery,
		order.Total, order.Status, order.PaymentMethod, order.PaymentStatus, order.Notes,
		order.CustomerPhone, order.DeliveryAddressManual, order.DeliveryLat, order.DeliveryLng,
		order.DeliveryNote, order.CustomerNote, order.UserID, order.ShopID, order.Source,
		order.PosShiftID,
	).Scan(
		&order.ID, &order.Total, &order.Status, &order.PaymentMethod, &order.PaymentStatus,
		&order.Notes, &order.CustomerPhone, &order.DeliveryAddressManual, &order.DeliveryLat,
		&order.DeliveryLng, &order.DeliveryNote, &order.CustomerNote, &order.UserID, &order.ShopID,
		&createdCustomerID, &order.CourierID, &order.HandedToCourierAt, &order.CodCollectedAt, &order.DeliveredAt,
		&order.Source, &order.CreatedAt, &order.UpdatedAt,
	)
	order.CustomerID = nullStringPtr(createdCustomerID)
	if err != nil {
		return nil, err
	}

	// Insert items.
	for i := range order.Items {
		item := &order.Items[i]
		_, err = tx.Exec(ctx,
			`INSERT INTO order_items (id, order_id, product_id, quantity, price, addons, variant_selection, created_at, updated_at)
			 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())`,
			order.ID, item.ProductID, item.Quantity, item.Price, item.Addons, item.VariantSelection,
		)
		if err != nil {
			return nil, err
		}
	}

	if decrementStock {
		for _, item := range order.Items {
			_, err = tx.Exec(ctx,
				`UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2 AND stock >= $1 AND track_stock = true`,
				item.Quantity, item.ProductID,
			)
			if err != nil {
				return nil, err
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Keep the live POS shift totals in sync immediately after the sale.
	if order.PosShiftID != nil && strings.TrimSpace(*order.PosShiftID) != "" {
		r.RefreshShiftMetrics(ctx, *order.PosShiftID)
	}

	return r.FindByID(ctx, order.ID)
}

// UpdateStatus updates order status and timestamps.
func (r *Repository) UpdateStatus(ctx context.Context, id string, status OrderStatus, notes *string) (*Order, error) {
	set := []string{"status = $1", "updated_at = NOW()"}
	args := []any{status}
	idx := 2
	if notes != nil {
		set = append(set, fmt.Sprintf("notes = $%d", idx))
		args = append(args, *notes)
		idx++
	}
	switch status {
	case OrderStatusReady:
		set = append(set, "handed_to_courier_at = NOW()")
	case OrderStatusDelivered:
		set = append(set, "delivered_at = NOW()")
	case OrderStatusPending, OrderStatusConfirmed, OrderStatusPreparing:
		// No automatic timestamp.
	}

	args = append(args, id)
	query := "UPDATE orders SET " + strings.Join(set, ", ") + fmt.Sprintf(" WHERE id = $%d RETURNING ", idx) + orderColumnsNoAlias
	row := r.pool.QueryRow(ctx, query, args...)
	return scanOrder(row)
}

// UpdateNotes updates order notes only.
func (r *Repository) UpdateNotes(ctx context.Context, id string, notes *string) (*Order, error) {
	row := r.pool.QueryRow(ctx,
		"UPDATE orders SET notes = $1, updated_at = NOW() WHERE id = $2 RETURNING "+orderColumnsNoAlias,
		notes, id,
	)
	return scanOrder(row)
}

// MarkCodCollected records COD collection.
func (r *Repository) MarkCodCollected(ctx context.Context, id string) (*Order, error) {
	row := r.pool.QueryRow(ctx,
		"UPDATE orders SET cod_collected_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING "+orderColumnsNoAlias,
		id,
	)
	return scanOrder(row)
}

// AssignCourier sets the order courier.
func (r *Repository) AssignCourier(ctx context.Context, id, courierID string) (*Order, error) {
	row := r.pool.QueryRow(ctx,
		"UPDATE orders SET courier_id = $1, updated_at = NOW() WHERE id = $2 RETURNING "+orderColumnsNoAlias,
		courierID, id,
	)
	return scanOrder(row)
}

// CourierUpdate allows a courier to update status and COD collection.
func (r *Repository) CourierUpdate(ctx context.Context, id string, status *OrderStatus, codCollected *bool) (*Order, error) {
	set := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1
	if status != nil {
		set = append(set, fmt.Sprintf("status = $%d", idx))
		args = append(args, *status)
		idx++
		if *status == OrderStatusDelivered {
			set = append(set, "delivered_at = NOW()")
		}
	}
	if codCollected != nil && *codCollected {
		set = append(set, "cod_collected_at = NOW()")
	}
	if len(args) == 0 {
		return r.FindByID(ctx, id)
	}
	args = append(args, id)
	query := "UPDATE orders SET " + strings.Join(set, ", ") + fmt.Sprintf(" WHERE id = $%d RETURNING ", idx) + orderColumnsNoAlias
	row := r.pool.QueryRow(ctx, query, args...)
	return scanOrder(row)
}

// GetProductForOrder returns product details used when building an order.
func (r *Repository) GetProductForOrder(ctx context.Context, productID, shopID string) (*struct {
	ID         string
	Name       string
	Price      float64
	Stock      int
	TrackStock bool
	IsActive   bool
	ShopID     string
}, error) {
	var p struct {
		ID         string
		Name       string
		Price      float64
		Stock      int
		TrackStock bool
		IsActive   bool
		ShopID     string
	}
	row := r.pool.QueryRow(ctx,
		`SELECT id, name, price, stock, track_stock, is_active, shop_id FROM products WHERE id = $1 AND shop_id = $2`,
		productID, shopID,
	)
	err := row.Scan(&p.ID, &p.Name, &p.Price, &p.Stock, &p.TrackStock, &p.IsActive, &p.ShopID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

// IsUserCourier checks whether the user is an active courier.
func (r *Repository) IsUserCourier(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND role = 'COURIER' AND is_active = true)",
		userID,
	).Scan(&exists)
	return exists, err
}

const orderColumns = `
	o.id, o.total, o.status, o.payment_method, o.payment_status, o.notes, o.customer_phone,
	o.delivery_address_manual, o.delivery_lat, o.delivery_lng, o.delivery_note, o.customer_note,
	o.user_id, o.shop_id, o.customer_id, o.courier_id, o.handed_to_courier_at, o.cod_collected_at, o.delivered_at,
	o.source, o.created_at, o.updated_at
`

// orderColumnsNoAlias is used in INSERT/UPDATE ... RETURNING clauses where the
// target table has no alias (Postgres would fail with "missing FROM-clause
// entry for table o" if the aliased columns were used there).
const orderColumnsNoAlias = `
	id, total, status, payment_method, payment_status, notes, customer_phone,
	delivery_address_manual, delivery_lat, delivery_lng, delivery_note, customer_note,
	user_id, shop_id, customer_id, courier_id, handed_to_courier_at, cod_collected_at, delivered_at,
	source, created_at, updated_at
`

const selectOrder = "SELECT " + orderColumns + " FROM orders o"

func scanOrder(row pgx.Row) (*Order, error) {
	var o Order
	var paymentMethod, paymentStatus, notes, customerPhone, deliveryAddressManual, deliveryNote, customerNote, customerID, courierID, source sql.NullString
	var deliveryLat, deliveryLng sql.NullFloat64
	var handedAt, codAt, deliveredAt sql.NullTime

	err := row.Scan(
		&o.ID, &o.Total, &o.Status, &paymentMethod, &paymentStatus, &notes, &customerPhone,
		&deliveryAddressManual, &deliveryLat, &deliveryLng, &deliveryNote, &customerNote,
		&o.UserID, &o.ShopID, &customerID, &courierID, &handedAt, &codAt, &deliveredAt, &source,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_order_failed", err)
	}

	o.PaymentMethod = nullStringPtr(paymentMethod)
	o.PaymentStatus = nullStringPtr(paymentStatus)
	o.Notes = nullStringPtr(notes)
	o.CustomerPhone = nullStringPtr(customerPhone)
	o.DeliveryAddressManual = nullStringPtr(deliveryAddressManual)
	o.DeliveryLat = nullFloat64Ptr(deliveryLat)
	o.DeliveryLng = nullFloat64Ptr(deliveryLng)
	o.DeliveryNote = nullStringPtr(deliveryNote)
	o.CustomerNote = nullStringPtr(customerNote)
	o.CustomerID = nullStringPtr(customerID)
	o.CourierID = nullStringPtr(courierID)
	o.HandedToCourierAt = nullTimePtr(handedAt)
	o.CodCollectedAt = nullTimePtr(codAt)
	o.DeliveredAt = nullTimePtr(deliveredAt)
	o.Source = source.String

	return &o, nil
}

func (r *Repository) scanOrders(ctx context.Context, rows pgx.Rows) ([]Order, error) {
	var orders []Order
	ids := []string{}
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		if o != nil {
			orders = append(orders, *o)
			ids = append(ids, o.ID)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	items, err := r.scanOrderItems(ctx, ids)
	if err != nil {
		return nil, err
	}
	byOrder := map[string][]OrderItem{}
	for _, it := range items {
		byOrder[it.OrderID] = append(byOrder[it.OrderID], it)
	}
	for i := range orders {
		orders[i].Items = byOrder[orders[i].ID]
	}
	return orders, nil
}

func (r *Repository) scanOrderItems(ctx context.Context, orderIDs []string) ([]OrderItem, error) {
	if len(orderIDs) == 0 {
		return nil, nil
	}
	placeholders := make([]string, len(orderIDs))
	args := make([]any, len(orderIDs))
	for i, id := range orderIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	query := "SELECT id, order_id, product_id, quantity, price, addons, variant_selection FROM order_items WHERE order_id IN (" + strings.Join(placeholders, ",") + ") ORDER BY created_at"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []OrderItem
	for rows.Next() {
		var it OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.Quantity, &it.Price, &it.Addons, &it.VariantSelection); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func nullStringPtr(s sql.NullString) *string {
	if !s.Valid || s.String == "" {
		return nil
	}
	return &s.String
}

func nullFloat64Ptr(f sql.NullFloat64) *float64 {
	if !f.Valid {
		return nil
	}
	return &f.Float64
}

func nullTimePtr(t sql.NullTime) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}
