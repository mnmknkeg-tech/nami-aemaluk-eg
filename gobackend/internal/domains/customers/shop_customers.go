package customers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
)

/* ============================================================
 * العملاء الموحد — الكيان المركزي الوحيد لكل قنوات النظام
 * (كاشير / موقع / حجوزات / خدمات / يدوي) — منع التكرار برقم الهاتف
 * ============================================================ */

var phoneDigitsRe = regexp.MustCompile(`[^0-9]`)

// NormalizePhone strips non-digits for the dedup key.
func NormalizePhone(phone string) string {
	return phoneDigitsRe.ReplaceAllString(strings.TrimSpace(phone), "")
}

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "[]"
	}
	return string(b)
}

func mustJSONMap(b []byte) map[string]any {
	out := map[string]any{}
	_ = json.Unmarshal(b, &out)
	return out
}

// ShopCustomer هو سجل العميل المركزي (جدول customers) — واحد لكل النظام.
type ShopCustomer struct {
	ID                string           `json:"id"`
	ShopID            string           `json:"shopId"`
	Code              string           `json:"code"`
	Name              string           `json:"name"`
	Email             string           `json:"email,omitempty"`
	Phone             string           `json:"phone"`
	CustomerType      string           `json:"customerType"` // individual | company
	CompanyName       string           `json:"companyName,omitempty"`
	TaxNumber         string           `json:"taxNumber,omitempty"`
	Status            string           `json:"status"` // active | inactive | blocked
	Address           string           `json:"address,omitempty"`
	City              string           `json:"city,omitempty"`
	Country           string           `json:"country,omitempty"`
	Branch            string           `json:"branch,omitempty"`
	Source            string           `json:"source"` // pos|website|bookings|services|manual|import|app
	SegmentID         string           `json:"segmentId,omitempty"`
	Tags              []string         `json:"tags"`
	Notes             string           `json:"notes,omitempty"`
	ShippingAddresses []map[string]any `json:"shippingAddresses,omitempty"`
	Addresses         []map[string]any `json:"addresses,omitempty"`
	Archived          bool             `json:"archived"`
	LoyaltyBalance    int              `json:"loyaltyBalance"`
	BalanceDue        float64          `json:"balanceDue"`
	OrdersCount       int64            `json:"totalOrders"`
	TotalSpent        float64          `json:"totalSpent"`
	LastPurchaseAt    *string          `json:"lastPurchaseAt,omitempty"`
	CreatedAt         string           `json:"createdAt"`
	UpdatedAt         string           `json:"updatedAt"`
}

const shopCustomerCols = `
	id, shop_id, COALESCE(code,''), name, COALESCE(email,''), phone,
	COALESCE(customer_type,'individual'), COALESCE(company_name,''), COALESCE(tax_number,''),
	COALESCE(status,'active'), COALESCE(address,''), COALESCE(city,''), COALESCE(country,''),
	COALESCE(branch,''), COALESCE(source,'manual'), COALESCE(segment_id::TEXT,''),
	COALESCE(tags,'[]'::jsonb), COALESCE(notes,''), COALESCE(shipping_addresses,'[]'::jsonb),
	COALESCE(addresses,'[]'::jsonb), COALESCE(archived,FALSE), COALESCE(loyalty_balance,0),
	COALESCE(balance_due,0), orders, total_spent, last_purchase_at::TEXT, created_at::TEXT, updated_at::TEXT
`

func scanShopCustomer(row interface{ Scan(dest ...any) error }) (*ShopCustomer, error) {
	var c ShopCustomer
	var email, address, city, country, branch, segmentID, notes, lastPurchase sql.NullString
	var tagsJSON, shippingJSON, addressesJSON []byte
	err := row.Scan(
		&c.ID, &c.ShopID, &c.Code, &c.Name, &email, &c.Phone,
		&c.CustomerType, &c.CompanyName, &c.TaxNumber,
		&c.Status, &address, &city, &country,
		&branch, &c.Source, &segmentID,
		&tagsJSON, &notes, &shippingJSON,
		&addressesJSON, &c.Archived, &c.LoyaltyBalance,
		&c.BalanceDue, &c.OrdersCount, &c.TotalSpent, &lastPurchase, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	c.Email = email.String
	c.Address = address.String
	c.City = city.String
	c.Country = country.String
	c.Branch = branch.String
	c.SegmentID = segmentID.String
	c.Notes = notes.String
	c.Tags = parseStringArray(tagsJSON)
	c.ShippingAddresses = parseObjectArray(shippingJSON)
	c.Addresses = parseObjectArray(addressesJSON)
	if lastPurchase.Valid && lastPurchase.String != "" {
		c.LastPurchaseAt = &lastPurchase.String
	}
	return &c, nil
}

func parseStringArray(b []byte) []string {
	out := []string{}
	s := strings.TrimSpace(string(b))
	if s == "" || s == "null" {
		return out
	}
	var arr []string
	if err := json.Unmarshal(b, &arr); err == nil {
		return arr
	}
	return out
}

func parseObjectArray(b []byte) []map[string]any {
	out := []map[string]any{}
	s := strings.TrimSpace(string(b))
	if s == "" || s == "null" || s == "[]" || s == "{}" {
		return out
	}
	var arr []map[string]any
	if err := json.Unmarshal(b, &arr); err == nil && arr != nil {
		return arr
	}
	return out
}

// ─── Repo ────────────────────────────────────────────────────

// FindShopCustomerByPhone — مفتاح منع التكرار الأساسي (shop_id + هاتف مطبّع).
func (r *Repository) FindShopCustomerByPhone(ctx context.Context, shopID, phone string) (*ShopCustomer, error) {
	normalized := NormalizePhone(phone)
	if normalized == "" {
		return nil, nil
	}
	row := r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM customers WHERE shop_id = $1 AND regexp_replace(phone, '[^0-9]', '', 'g') = $2 LIMIT 1`, shopCustomerCols),
		shopID, normalized,
	)
	c, err := scanShopCustomer(row)
	if err != nil {
		return nil, nil // not found — caller creates a new one
	}
	return c, nil
}

// GetShopCustomer loads one customer of this shop (profile payload).
func (r *Repository) GetShopCustomer(ctx context.Context, shopID, id string) (*ShopCustomer, error) {
	row := r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM customers WHERE shop_id = $1 AND id = $2`, shopCustomerCols),
		shopID, id,
	)
	c, err := scanShopCustomer(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("customer not found")
		}
		return nil, err
	}
	// live stats: count by customer_id OR normalized phone (old orders have phone only)
	phone := NormalizePhone(c.Phone)
	var ordersCount int64
	var totalSpent float64
	var lastPurchase sql.NullString
	_ = r.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(total),0), MAX(created_at)::TEXT
		FROM orders
		WHERE shop_id = $1 AND status NOT IN ('CANCELLED','REFUNDED','RETURNED')
		  AND (customer_id = $2 OR ($3 <> '' AND regexp_replace(COALESCE(customer_phone,''), '[^0-9]', '', 'g') = $3))
	`, shopID, id, phone).Scan(&ordersCount, &totalSpent, &lastPurchase)
	c.OrdersCount = ordersCount
	c.TotalSpent = totalSpent
	if lastPurchase.Valid && lastPurchase.String != "" {
		c.LastPurchaseAt = &lastPurchase.String
	}
	return c, nil
}

// ShopCustomerQuery — فلاتر البحث الموحدة.
type ShopCustomerQuery struct {
	Query       string
	Status      string
	Source      string
	SegmentID   string
	TagID       string
	DebtorsOnly bool
	Archived    bool
	Limit       int
	Offset      int
}

// ListShopCustomers — بحث وفلاتر موحدة (هاتف/إيميل/كود/اسم/رقم طلب) + أرشفة.
func (r *Repository) ListShopCustomers(ctx context.Context, shopID string, q ShopCustomerQuery) ([]ShopCustomer, int64, error) {
	where := "shop_id = $1 AND COALESCE(archived,FALSE) = $2"
	args := []any{shopID, q.Archived}
	idx := 3
	if q.Status != "" {
		where += fmt.Sprintf(" AND COALESCE(status,'active') = $%d", idx)
		args = append(args, q.Status)
		idx++
	}
	if q.Source != "" {
		where += fmt.Sprintf(" AND COALESCE(source,'manual') = $%d", idx)
		args = append(args, q.Source)
		idx++
	}
	if q.SegmentID != "" {
		where += fmt.Sprintf(" AND segment_id::TEXT = $%d", idx)
		args = append(args, q.SegmentID)
		idx++
	}
	if q.TagID != "" {
		where += fmt.Sprintf(" AND tags @> to_jsonb(ARRAY[$%d::TEXT])", idx)
		args = append(args, q.TagID)
		idx++
	}
	if q.DebtorsOnly {
		where += " AND COALESCE(balance_due,0) > 0"
	}
	if q.Query != "" {
		like := "%" + strings.ToLower(q.Query) + "%"
		digits := NormalizePhone(q.Query)
		orderLike := "%" + q.Query + "%"
		where += fmt.Sprintf(
			" AND (LOWER(name) LIKE $%d OR LOWER(email) LIKE $%d OR LOWER(code) LIKE $%d"+
				" OR regexp_replace(COALESCE(phone,''),'[^0-9]','','g') LIKE $%d"+
				" OR regexp_replace(COALESCE(whatsapp,''),'[^0-9]','','g') LIKE $%d"+
				" OR EXISTS(SELECT 1 FROM orders o WHERE o.shop_id=customers.shop_id AND (o.customer_id=customers.id OR regexp_replace(COALESCE(o.customer_phone,''),'[^0-9]','','g')=regexp_replace(customers.phone,'[^0-9]','','g')) AND o.id ILIKE $%d))",
			idx, idx+1, idx+2, idx+3, idx+4, idx+5)
		args = append(args, like, like, like, digits, digits, orderLike)
		idx += 6
	}
	query := fmt.Sprintf(`SELECT %s FROM customers WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		shopCustomerCols, where, idx, idx+1)
	args = append(args, q.Limit, q.Offset)
	rows, err := r.pool.Query(ctx, query, args...)

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []ShopCustomer{}
	for rows.Next() {
		c, err := scanShopCustomer(rows)
		if err != nil {
			continue
		}
		out = append(out, *c)
	}

	// Count total matching rows (without LIMIT/OFFSET) for pagination.
	var total int64
	countArgs := args[:len(args)-2] // strip limit/offset
	_ = r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT COUNT(*) FROM customers WHERE %s`, where),
		countArgs...,
	).Scan(&total)

	return out, total, nil
}

// CreateShopCustomer — إنشاء عميل مركزي جديد (بعد التأكد من عدم وجود هاتف مكرر).
func (r *Repository) CreateShopCustomer(ctx context.Context, c *ShopCustomer) error {
	if err := r.insertShopCustomer(ctx, c); err == nil {
		return nil
	} else if strings.Contains(err.Error(), "23505") {
		// سباق التكرار: سجل موجود بنفس الهاتف — ارجعه بدل الفشل
		if existing, ferr := r.FindShopCustomerByPhone(ctx, c.ShopID, c.Phone); ferr == nil && existing != nil {
			*c = *existing
			return nil
		}
		return err
	} else {
		return err
	}
}

func (r *Repository) insertShopCustomer(ctx context.Context, c *ShopCustomer) error {
	var n int
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM customers WHERE shop_id = $1`, c.ShopID).Scan(&n)
	c.Code = fmt.Sprintf("CUST-%04d", n+1)

	return r.pool.QueryRow(ctx, `
		INSERT INTO customers (id, shop_id, code, name, email, phone, customer_type, company_name,
			tax_number, status, address, city, country, branch, source, segment_id, tags,
			notes, shipping_addresses, addresses, archived, loyalty_balance, balance_due, created_at, updated_at)
		VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
			NULLIF($15,''), $16::jsonb, $17, $18::jsonb, $19::jsonb, FALSE, 0, 0, NOW(), NOW())
		RETURNING id, code, created_at::TEXT, updated_at::TEXT`,
		c.ShopID, c.Code, c.Name, c.Email, c.Phone, c.CustomerType, c.CompanyName,
		c.TaxNumber, c.Status, c.Address, c.City, c.Country, c.Branch, c.Source,
		c.SegmentID, mustJSON(c.Tags), c.Notes, mustJSON(c.ShippingAddresses), mustJSON(c.Addresses),
	).Scan(&c.ID, &c.Code, &c.CreatedAt, &c.UpdatedAt)
}

// UpdateShopCustomer — تحديث جزئي آمن بحسب الحقول المرسومة.
func (r *Repository) UpdateShopCustomer(ctx context.Context, shopID, id string, fields map[string]any) (*ShopCustomer, error) {
	allowed := map[string]string{
		"name": "name", "email": "email", "phone": "phone", "customer_type": "customer_type",
		"company_name": "company_name", "tax_number": "tax_number", "status": "status",
		"address": "address", "city": "city", "country": "country", "branch": "branch",
		"notes": "notes",
	}
	sets := []string{}
	args := []any{}
	idx := 1
	for key, col := range allowed {
		if v, ok := fields[key]; ok {
			sets = append(sets, fmt.Sprintf("%s = $%d", col, idx))
			args = append(args, v)
			idx++
		}
	}
	for _, jf := range []struct{ key, col string }{
		{"tags", "tags"}, {"shipping_addresses", "shipping_addresses"}, {"addresses", "addresses"},
	} {
		if v, ok := fields[jf.key]; ok {
			sets = append(sets, fmt.Sprintf("%s = $%d::jsonb", jf.col, idx))
			args = append(args, mustJSON(v))
			idx++
		}
	}
	if v, ok := fields["segment_id"]; ok {
		sets = append(sets, fmt.Sprintf("segment_id = NULLIF($%d,'')", idx))
		args = append(args, v)
		idx++
	}
	if len(sets) == 0 {
		return r.GetShopCustomer(ctx, shopID, id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, shopID, id)
	if _, err := r.pool.Exec(ctx,
		fmt.Sprintf("UPDATE customers SET %s WHERE shop_id = $%d AND id = $%d", strings.Join(sets, ", "), idx, idx+1),
		args...,
	); err != nil {
		return nil, err
	}
	return r.GetShopCustomer(ctx, shopID, id)
}

// SetShopCustomerArchived — أرشفة/استعادة (العمليات القديمة تبقى موجودة).
func (r *Repository) SetShopCustomerArchived(ctx context.Context, shopID, id string, archived bool) (*ShopCustomer, error) {
	if _, err := r.pool.Exec(ctx,
		`UPDATE customers SET archived = $1, updated_at = NOW() WHERE shop_id = $2 AND id = $3`,
		archived, shopID, id,
	); err != nil {
		return nil, err
	}
	return r.GetShopCustomer(ctx, shopID, id)
}

// RecordShopCustomerPurchase — يحدث عدادات العميل بعد كل عملية بيع ناجحة.
func (r *Repository) RecordShopCustomerPurchase(ctx context.Context, shopID, customerID string, total float64) {
	_, _ = r.pool.Exec(ctx, `
		UPDATE customers SET orders = COALESCE(orders,0) + 1,
			total_spent = COALESCE(total_spent,0) + $1,
			last_purchase_at = NOW(), updated_at = NOW()
		WHERE shop_id = $2 AND id = $3`, total, shopID, customerID)
}

// ─── سجل التواصل ─────────────────────────────────────────────

type ContactLogEntry struct {
	ID         string  `json:"id"`
	Type       string  `json:"type"`
	Content    string  `json:"content"`
	FollowupAt *string `json:"followupAt,omitempty"`
	StaffName  string  `json:"staffName,omitempty"`
	CreatedAt  string  `json:"createdAt"`
}

func (r *Repository) AddContactLog(ctx context.Context, shopID, customerID string, e ContactLogEntry) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO customer_contact_log (shop_id, customer_id, type, content, followup_at, staff_name)
		VALUES ($1,$2,$3,$4, NULLIF($5,'')::timestamptz, $6)`,
		shopID, customerID, e.Type, e.Content, ptrStr(e.FollowupAt), e.StaffName)
	return err
}

func (r *Repository) ListContactLog(ctx context.Context, shopID, customerID string, limit int) ([]ContactLogEntry, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, type, content, COALESCE(followup_at::TEXT,''), COALESCE(staff_name,''), created_at::TEXT
		FROM customer_contact_log WHERE shop_id = $1 AND customer_id = $2
		ORDER BY created_at DESC LIMIT $3`, shopID, customerID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ContactLogEntry{}
	for rows.Next() {
		var e ContactLogEntry
		var followup sql.NullString
		if err := rows.Scan(&e.ID, &e.Type, &e.Content, &followup, &e.StaffName, &e.CreatedAt); err != nil {
			continue
		}
		if followup.Valid && followup.String != "" {
			e.FollowupAt = &followup.String
		}
		out = append(out, e)
	}
	return out, nil
}

// ─── الولاء والمكافآت ────────────────────────────────────────

type LoyaltySettings struct {
	ShopID            string         `json:"shopId"`
	Enabled           bool           `json:"enabled"`
	PointsPerCurrency float64        `json:"pointsPerCurrency"`
	SignupPoints      int            `json:"signupPoints"`
	MinRedeemPoints   int            `json:"minRedeemPoints"`
	Rules             map[string]any `json:"rules"`
	UpdatedAt         string         `json:"updatedAt"`
}

func (r *Repository) GetLoyaltySettings(ctx context.Context, shopID string) (*LoyaltySettings, error) {
	var s LoyaltySettings
	var rules []byte
	var updated sql.NullString
	err := r.pool.QueryRow(ctx, `
		SELECT shop_id, enabled, points_per_currency, signup_points, min_redeem_points, rules, updated_at::TEXT
		FROM loyalty_settings WHERE shop_id = $1`, shopID,
	).Scan(&s.ShopID, &s.Enabled, &s.PointsPerCurrency, &s.SignupPoints, &s.MinRedeemPoints, &rules, &updated)
	if err != nil {
		_, _ = r.pool.Exec(ctx, `INSERT INTO loyalty_settings (shop_id) VALUES ($1) ON CONFLICT (shop_id) DO NOTHING`, shopID)
		return &LoyaltySettings{ShopID: shopID, Enabled: false, PointsPerCurrency: 100, Rules: map[string]any{}}, nil
	}
	s.Rules = mustJSONMap(rules)
	s.UpdatedAt = updated.String
	return &s, nil
}

func (r *Repository) SaveLoyaltySettings(ctx context.Context, s *LoyaltySettings) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO loyalty_settings (shop_id, enabled, points_per_currency, signup_points, min_redeem_points, rules, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6::jsonb, NOW())
		ON CONFLICT (shop_id) DO UPDATE SET
			enabled = EXCLUDED.enabled, points_per_currency = EXCLUDED.points_per_currency,
			signup_points = EXCLUDED.signup_points, min_redeem_points = EXCLUDED.min_redeem_points,
			rules = EXCLUDED.rules, updated_at = NOW()`,
		s.ShopID, s.Enabled, s.PointsPerCurrency, s.SignupPoints, s.MinRedeemPoints, mustJSON(s.Rules))
	return err
}

// AddLoyaltyEntry — كل حركة نقاط تُسجّل في السجل (ممنوع تعديل الرصيد مباشرة).
func (r *Repository) AddLoyaltyEntry(ctx context.Context, shopID, customerID string, delta int, reason, refID, staffName string) (int, error) {
	var balance int
	err := r.pool.QueryRow(ctx, `
		UPDATE customers SET loyalty_balance = GREATEST(0, COALESCE(loyalty_balance,0) + $1), updated_at = NOW()
		WHERE shop_id = $2 AND id = $3 RETURNING loyalty_balance`,
		delta, shopID, customerID).Scan(&balance)
	if err != nil {
		return 0, err
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO loyalty_ledger (shop_id, customer_id, delta, balance_after, reason, ref_id, staff_name)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		shopID, customerID, delta, balance, reason, refID, staffName)
	return balance, err
}

type LoyaltyLedgerEntry struct {
	ID           string `json:"id"`
	CustomerID   string `json:"customerId"`
	Delta        int    `json:"delta"`
	BalanceAfter int    `json:"balanceAfter"`
	Reason       string `json:"reason"`
	RefID        string `json:"refId,omitempty"`
	StaffName    string `json:"staffName,omitempty"`
	CreatedAt    string `json:"createdAt"`
}

func (r *Repository) ListLoyaltyLedger(ctx context.Context, shopID, customerID string, limit int) ([]LoyaltyLedgerEntry, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, customer_id, delta, balance_after, reason, ref_id, COALESCE(staff_name,''), created_at::TEXT
		FROM loyalty_ledger WHERE shop_id = $1 AND ($2 = '' OR customer_id = $2)
		ORDER BY created_at DESC LIMIT $3`, shopID, customerID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []LoyaltyLedgerEntry{}
	for rows.Next() {
		var e LoyaltyLedgerEntry
		var refID, staff sql.NullString
		if err := rows.Scan(&e.ID, &e.CustomerID, &e.Delta, &e.BalanceAfter, &e.Reason, &refID, &staff, &e.CreatedAt); err != nil {
			continue
		}
		e.RefID = refID.String
		e.StaffName = staff.String
		out = append(out, e)
	}
	return out, nil
}

// ─── نشاط العميل + كشف الحساب ────────────────────────────────

type ActivityRow struct {
	ID        string  `json:"id"`
	Status    string  `json:"status,omitempty"`
	Total     float64 `json:"total"`
	Method    string  `json:"method,omitempty"`
	Source    string  `json:"source,omitempty"`
	CreatedAt string  `json:"createdAt"`
}

// CustomerActivity — الطلبات/المرتجعات مرتبطة بالعميل (customer_id أو الهاتف المطبّع).
func (r *Repository) CustomerActivity(ctx context.Context, shopID, customerID, phone, kind string) ([]ActivityRow, error) {
	normalized := NormalizePhone(phone)
	statusFilter := ""
	switch kind {
	case "returns":
		statusFilter = " AND status::TEXT = 'REFUNDED'"
	default: // orders
		statusFilter = " AND status::TEXT NOT IN ('CANCELLED','REFUNDED','RETURNED')"
	}
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT id, COALESCE(status::TEXT,''), total, COALESCE(payment_method,''), COALESCE(source,''), created_at::TEXT
		FROM orders
		WHERE shop_id = $1
		  AND (customer_id = $2 OR ($3 <> '' AND regexp_replace(COALESCE(customer_phone,''), '[^0-9]', '', 'g') = $3))
		  %s
		ORDER BY created_at DESC LIMIT 200`, statusFilter),
		shopID, customerID, normalized)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ActivityRow{}
	for rows.Next() {
		var a ActivityRow
		if err := rows.Scan(&a.ID, &a.Status, &a.Total, &a.Method, &a.Source, &a.CreatedAt); err != nil {
			continue
		}
		out = append(out, a)
	}
	return out, nil
}

type StatementRow struct {
	Date    string  `json:"date"`
	Type    string  `json:"type"`
	Ref     string  `json:"ref"`
	Debit   float64 `json:"debit"`
	Credit  float64 `json:"credit"`
	Balance float64 `json:"balance"`
}

type StatementResult struct {
	Opening float64        `json:"opening"`
	Rows    []StatementRow `json:"rows"`
	Closing float64        `json:"closing"`
}

// CustomerStatement — كشف حساب مدين/دائن مرتبط بالنظام: الآجل مدين، المرتجعات دائن.
func (r *Repository) CustomerStatement(ctx context.Context, shopID, customerID, phone string) (*StatementResult, error) {
	normalized := NormalizePhone(phone)
	match := `(customer_id = $1 OR ($2 <> '' AND regexp_replace(COALESCE(customer_phone,''), '[^0-9]', '', 'g') = $2))`
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT created_at::TEXT, 'invoice' AS type, id,
		       CASE WHEN COALESCE(payment_method,'') = 'CREDIT' OR COALESCE(payment_status,'') = 'UNPAID' THEN total ELSE 0 END,
		       0::double precision
		FROM orders
		WHERE shop_id = $3 AND %s AND status::TEXT NOT IN ('CANCELLED','REFUNDED','RETURNED')
		UNION ALL
		SELECT created_at::TEXT, 'return', id, 0::double precision, total
		FROM orders
		WHERE shop_id = $3 AND %s AND status::TEXT IN ('RETURNED','REFUNDED')
		ORDER BY 1 ASC`, match, match), customerID, normalized, shopID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	res := &StatementResult{Opening: 0, Rows: []StatementRow{}}
	balance := 0.0
	for rows.Next() {
		var row StatementRow
		if err := rows.Scan(&row.Date, &row.Type, &row.Ref, &row.Debit, &row.Credit); err != nil {
			continue
		}
		balance += row.Debit - row.Credit
		row.Balance = balance
		res.Rows = append(res.Rows, row)
	}
	res.Closing = balance
	return res, nil
}

func ptrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// LinkOrderCustomer — يربط الطلب بالعميل المركزي: يبحث بالهاتف، ينشئ لو مش موجود،
// يحدّث العدادات، ويمنح نقاط الولاء لو مفعّلة. Best-effort — لا يفشل الطلب أبدًا.
func LinkOrderCustomer(ctx context.Context, pool *db.Pool, shopID, phone, name, source, orderID string, total float64) {
	defer func() { _ = recover() }()
	normalized := NormalizePhone(phone)
	if normalized == "" || strings.TrimSpace(shopID) == "" {
		return
	}
	repo := &Repository{pool: pool}
	customer, _ := repo.FindShopCustomerByPhone(ctx, shopID, phone)
	if customer == nil {
		if strings.TrimSpace(name) == "" {
			name = "عميل " + normalized
		}
		nc := &ShopCustomer{
			ShopID: shopID, Name: name, Phone: phone, Source: source, Status: "active",
			CustomerType: "individual",
		}
		if err := repo.CreateShopCustomer(ctx, nc); err != nil {
			return
		}
		customer = nc
		// نقاط التسجيل
		if settings, err := repo.GetLoyaltySettings(ctx, shopID); err == nil && settings.Enabled && settings.SignupPoints > 0 {
			_, _ = repo.AddLoyaltyEntry(ctx, shopID, customer.ID, settings.SignupPoints, "signup", "", "system")
		}
	}
	if customer == nil || customer.ID == "" {
		return
	}
	// اربط الطلب بالعميل + حدّث العدادات
	_, _ = pool.Exec(ctx, `UPDATE orders SET customer_id = $1 WHERE id = $2`, customer.ID, orderID)
	repo.RecordShopCustomerPurchase(ctx, shopID, customer.ID, total)
	// نقاط الولاء على الشراء
	if settings, err := repo.GetLoyaltySettings(ctx, shopID); err == nil && settings.Enabled && settings.PointsPerCurrency > 0 {
		points := int(total / settings.PointsPerCurrency)
		if points > 0 {
			_, _ = repo.AddLoyaltyEntry(ctx, shopID, customer.ID, points, "earn:order", orderID, "system")
		}
	}
}
