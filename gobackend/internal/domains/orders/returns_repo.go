package orders

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// ReturnItem is one line inside an order return payload.
type ReturnItem struct {
	OrderItemID string  `json:"orderItemId"`
	ProductID   string  `json:"productId"`
	Name        string  `json:"name"`
	Quantity    int     `json:"quantity"`
	Price       float64 `json:"price"`
}

// CreateReturnInput is the body of POST /shops/:shopId/orders/:orderId/returns.
type CreateReturnInput struct {
	OrderID          string       `json:"-"`
	ShopID           string       `json:"-"`
	CreatedByID      string       `json:"-"`
	Reason           *string      `json:"reason"`
	ReturnToStock    bool         `json:"returnToStock"`
	TotalAmount      float64      `json:"totalAmount"`
	Items            []ReturnItem `json:"items"`
	MarkOrderReturned bool        `json:"markReturned"`
}

// OrderReturn is the API representation of a return.
type OrderReturn struct {
	ID            string       `json:"id"`
	OrderID       string       `json:"orderId"`
	ShopID        string       `json:"shopId"`
	Status        string       `json:"status"`
	Reason        *string      `json:"reason,omitempty"`
	ReturnToStock bool         `json:"returnToStock"`
	TotalAmount   float64      `json:"totalAmount"`
	Items         []ReturnItem `json:"items"`
	CreatedAt     time.Time    `json:"createdAt"`
}

var errReturnNotFound = errors.New("return not found")

type returnsRepository struct {
	pool *db.Pool
}

func newReturnsRepository(pool *db.Pool) *returnsRepository {
	return &returnsRepository{pool: pool}
}

const returnSelect = `
	SELECT r.id, r.order_id, r.shop_id, COALESCE(r.status, 'pending'), r.reason,
	       r.return_to_stock, r.total_amount, r.created_at
	FROM order_returns r
`

func scanReturnRow(scanner interface{ Scan(dest ...any) error }) (*OrderReturn, error) {
	var ret OrderReturn
	var reason *string
	if err := scanner.Scan(&ret.ID, &ret.OrderID, &ret.ShopID, &ret.Status, &reason,
		&ret.ReturnToStock, &ret.TotalAmount, &ret.CreatedAt); err != nil {
		return nil, err
	}
	ret.Reason = reason
	ret.Items = []ReturnItem{}
	return &ret, nil
}

// ListByOrder returns all returns of one order.
func (rr *returnsRepository) ListByOrder(ctx context.Context, shopID, orderID string) ([]*OrderReturn, error) {
	rows, err := rr.pool.Query(ctx,
		returnSelect+" WHERE r.shop_id = $1 AND r.order_id = $2 ORDER BY r.created_at DESC",
		shopID, orderID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*OrderReturn{}
	for rows.Next() {
		ret, err := scanReturnRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, ret)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, ret := range out {
		items, err := rr.itemsFor(ctx, ret.ID)
		if err != nil {
			return nil, err
		}
		ret.Items = items
	}
	return out, nil
}

func (rr *returnsRepository) itemsFor(ctx context.Context, returnID string) ([]ReturnItem, error) {
	rows, err := rr.pool.Query(ctx,
		`SELECT COALESCE(order_item_id, ''), COALESCE(product_id, ''), COALESCE(name, ''),
		        quantity, unit_price, line_total
		 FROM order_return_items WHERE return_id = $1`,
		returnID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []ReturnItem{}
	for rows.Next() {
		var (
			orderItemID, productID, name string
			qty                          int
			price, _                     float64
		)
		if err := rows.Scan(&orderItemID, &productID, &name, &qty, &price, new(float64)); err != nil {
			return nil, err
		}
		item := ReturnItem{OrderItemID: orderItemID, ProductID: productID, Name: name, Quantity: qty, Price: price}
		items = append(items, item)
	}
	return items, rows.Err()
}

// Create inserts a return with its items and optionally marks the order RETURNED.
func (rr *returnsRepository) Create(ctx context.Context, input *CreateReturnInput) (*OrderReturn, error) {
	id := uuid.NewString()
	now := time.Now().UTC()

	tx, err := rr.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx,
		`INSERT INTO order_returns (id, order_id, shop_id, created_by_id, reason, return_to_stock, total_amount, status, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)`,
		id, input.OrderID, input.ShopID, input.CreatedByID, input.Reason, input.ReturnToStock, input.TotalAmount, now,
	); err != nil {
		return nil, err
	}

	for _, it := range input.Items {
		var (
			orderItemID string
			productID   string
			name        string
			unitPrice   float64
			lineTotal   float64
		)
		switch {
		case it.OrderItemID != "":
			err := tx.QueryRow(ctx,
				`SELECT oi.id, oi.product_id, COALESCE(p.name, ''), oi.price
				 FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
				 WHERE oi.id = $1 AND oi.order_id = $2`,
				it.OrderItemID, input.OrderID,
			).Scan(&orderItemID, &productID, &name, &unitPrice)
			if err != nil {
				return nil, fmt.Errorf("invalid order item %s: %w", it.OrderItemID, err)
			}
		default:
			productID = it.ProductID
			name = it.Name
			unitPrice = it.Price
			// Resolve the original order item for this product when possible.
			_ = tx.QueryRow(ctx,
				`SELECT id FROM order_items WHERE order_id = $1 AND product_id = $2 LIMIT 1`,
				input.OrderID, productID,
			).Scan(&orderItemID)
		}
		if qty := it.Quantity; qty > 0 {
			lineTotal = float64(qty) * unitPrice
			if _, err := tx.Exec(ctx,
				`INSERT INTO order_return_items (id, return_id, order_item_id, product_id, quantity, unit_price, line_total, name)
				 VALUES ($1,$2,NULLIF($3,''),NULLIF($4,''),$5,$6,$7,NULLIF($8,''))`,
				uuid.NewString(), id, orderItemID, productID, qty, unitPrice, lineTotal, name,
			); err != nil {
				return nil, err
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return rr.GetByID(ctx, input.ShopID, id)
}

// GetByID loads a single return with items.
func (rr *returnsRepository) GetByID(ctx context.Context, shopID, returnID string) (*OrderReturn, error) {
	row := rr.pool.QueryRow(ctx, returnSelect+" WHERE r.id = $1 AND r.shop_id = $2", returnID, shopID)
	ret, err := scanReturnRow(row)
	if err != nil {
		return nil, errReturnNotFound
	}
	ret.Items, err = rr.itemsFor(ctx, ret.ID)
	if err != nil {
		return nil, err
	}
	return ret, nil
}

// UpdateStatus changes a return's lifecycle status.
func (rr *returnsRepository) UpdateStatus(ctx context.Context, shopID, returnID, status string) error {
	tag, err := rr.pool.Exec(ctx,
		`UPDATE order_returns SET status = $1 WHERE id = $2 AND shop_id = $3`,
		status, returnID, shopID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errReturnNotFound
	}
	return nil
}
