package coupons

import (
	"context"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	appErrors "github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
)

type Coupon struct {
	ID               string     `json:"id"`
	ShopID           string     `json:"shopId"`
	Code             string     `json:"code"`
	Name             string     `json:"name"`
	NameAr           string     `json:"nameAr"`
	Type             string     `json:"type"`
	Value            float64    `json:"value"`
	MinOrderValue    float64    `json:"minOrderValue"`
	MaxDiscountValue float64    `json:"maxDiscountValue"`
	UsageLimit       int        `json:"usageLimit"`
	UsedCount        int        `json:"usedCount"`
	StartDate        time.Time  `json:"startDate"`
	EndDate          *time.Time `json:"endDate,omitempty"`
	Status           string     `json:"status"`
	Description      string     `json:"description"`
}

type ValidateRequest struct {
	ShopID   string  `json:"shopId"`
	Code     string  `json:"code"`
	Subtotal float64 `json:"subtotal"`
}
type ValidateResponse struct {
	Coupon         Coupon  `json:"coupon"`
	DiscountAmount float64 `json:"discountAmount"`
	FinalTotal     float64 `json:"finalTotal"`
}
type WriteRequest struct {
	ShopID           string     `json:"shopId"`
	Code             string     `json:"code"`
	Name             string     `json:"name"`
	NameAr           string     `json:"nameAr"`
	Type             string     `json:"type"`
	Value            float64    `json:"value"`
	MinOrderValue    float64    `json:"minOrderValue"`
	MaxDiscountValue float64    `json:"maxDiscountValue"`
	UsageLimit       int        `json:"usageLimit"`
	StartDate        time.Time  `json:"startDate"`
	EndDate          *time.Time `json:"endDate,omitempty"`
	Status           string     `json:"status"`
	Description      string     `json:"description"`
}

type Repository struct{ pool *db.Pool }

func NewRepository(pool *db.Pool) *Repository { return &Repository{pool: pool} }

const columns = `id, shop_id, code, name, name_ar, type, value, min_order_value, max_discount_value, usage_limit, used_count, starts_at, ends_at, status, description`

func scan(row interface{ Scan(...any) error }) (*Coupon, error) {
	var c Coupon
	err := row.Scan(&c.ID, &c.ShopID, &c.Code, &c.Name, &c.NameAr, &c.Type, &c.Value, &c.MinOrderValue, &c.MaxDiscountValue, &c.UsageLimit, &c.UsedCount, &c.StartDate, &c.EndDate, &c.Status, &c.Description)
	return &c, err
}
func (r *Repository) List(ctx context.Context, shopID string) ([]Coupon, error) {
	rows, err := r.pool.Query(ctx, "SELECT "+columns+" FROM coupons WHERE shop_id=$1 ORDER BY created_at DESC", shopID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Coupon{}
	for rows.Next() {
		c, e := scan(rows)
		if e != nil {
			return nil, e
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}
func (r *Repository) Find(ctx context.Context, shopID, code string) (*Coupon, error) {
	c, e := scan(r.pool.QueryRow(ctx, "SELECT "+columns+" FROM coupons WHERE shop_id=$1 AND code=$2 LIMIT 1", shopID, strings.ToUpper(strings.TrimSpace(code))))
	if e != nil {
		return nil, e
	}
	return c, nil
}
func (r *Repository) Create(ctx context.Context, q WriteRequest) (*Coupon, error) {
	return scan(r.pool.QueryRow(ctx, `INSERT INTO coupons (shop_id,code,name,name_ar,type,value,min_order_value,max_discount_value,usage_limit,starts_at,ends_at,status,description) VALUES ($1,UPPER($2),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING `+columns, q.ShopID, q.Code, q.Name, q.NameAr, q.Type, q.Value, q.MinOrderValue, q.MaxDiscountValue, q.UsageLimit, q.StartDate, q.EndDate, q.Status, q.Description))
}
func (r *Repository) Update(ctx context.Context, id string, q WriteRequest) (*Coupon, error) {
	return scan(r.pool.QueryRow(ctx, `UPDATE coupons SET code=UPPER($1),name=$2,name_ar=$3,type=$4,value=$5,min_order_value=$6,max_discount_value=$7,usage_limit=$8,starts_at=$9,ends_at=$10,status=$11,description=$12,updated_at=NOW() WHERE id=$13 AND shop_id=$14 RETURNING `+columns, q.Code, q.Name, q.NameAr, q.Type, q.Value, q.MinOrderValue, q.MaxDiscountValue, q.UsageLimit, q.StartDate, q.EndDate, q.Status, q.Description, id, q.ShopID))
}
func (r *Repository) Delete(ctx context.Context, id, shopID string) error {
	_, e := r.pool.Exec(ctx, "UPDATE coupons SET status='inactive',updated_at=NOW() WHERE id=$1 AND shop_id=$2", id, shopID)
	return e
}

func (r *Repository) Consume(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE id = $1 AND (usage_limit = 0 OR used_count < usage_limit)`, id)
	return err
}

func Validate(c Coupon, subtotal float64, now time.Time) (float64, error) {
	if c.Status != "active" || now.Before(c.StartDate) || (c.EndDate != nil && !now.Before(*c.EndDate)) || (c.UsageLimit > 0 && c.UsedCount >= c.UsageLimit) {
		return 0, appErrors.Validation("coupon_invalid", "الكوبون غير صالح أو منتهي")
	}
	if subtotal < c.MinOrderValue {
		return 0, appErrors.Validation("coupon_min_order", "قيمة الطلب أقل من الحد الأدنى للكوبون")
	}
	if c.Type == "free_shipping" {
		return 0, nil
	}
	var d float64
	if c.Type == "percentage" {
		if c.Value > 100 {
			return 0, appErrors.Validation("coupon_invalid", "قيمة الكوبون غير صحيحة")
		}
		d = subtotal * c.Value / 100
	} else {
		d = c.Value
	}
	if c.MaxDiscountValue > 0 && d > c.MaxDiscountValue {
		d = c.MaxDiscountValue
	}
	if d > subtotal {
		d = subtotal
	}
	return d, nil
}
