package subscriptions

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for subscriptions
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new subscriptions repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// ============================================================
// SUBSCRIPTION PLANS
// ============================================================

// ListPlans returns all plans for a shop
func (r *Repository) ListPlans(ctx context.Context, shopID string) ([]SubscriptionPlan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			sp.id, sp.shop_id, sp.name, sp.name_ar, sp.description,
			sp.billing_cycle, sp.duration_days, sp.price, sp.currency,
			sp.features, sp.max_members, sp.trial_days, sp.sort_order,
			sp.is_active, sp.is_featured, sp.color,
			sp.created_at, sp.updated_at,
			COALESCE((
				SELECT COUNT(*) FROM member_subscriptions ms
				WHERE ms.plan_id = sp.id AND ms.status = 'active'
			), 0) AS active_members
		FROM subscription_plans sp
		WHERE sp.shop_id = $1
		ORDER BY sp.sort_order ASC, sp.created_at DESC
	`, shopID)
	if err != nil {
		return nil, fmt.Errorf("list plans: %w", err)
	}
	defer rows.Close()

	var plans []SubscriptionPlan
	for rows.Next() {
		var p SubscriptionPlan
		var features []byte
		err := rows.Scan(
			&p.ID, &p.ShopID, &p.Name, &p.NameAr, &p.Description,
			&p.BillingCycle, &p.DurationDays, &p.Price, &p.Currency,
			&features, &p.MaxMembers, &p.TrialDays, &p.SortOrder,
			&p.IsActive, &p.IsFeatured, &p.Color,
			&p.CreatedAt, &p.UpdatedAt,
			&p.ActiveMembers,
		)
		if err != nil {
			return nil, fmt.Errorf("scan plan: %w", err)
		}
		if features != nil {
			p.Features = json.RawMessage(features)
		}
		plans = append(plans, p)
	}
	if plans == nil {
		plans = []SubscriptionPlan{}
	}
	return plans, nil
}

// GetPlanByID returns a single plan
func (r *Repository) GetPlanByID(ctx context.Context, id, shopID string) (*SubscriptionPlan, error) {
	var p SubscriptionPlan
	var features []byte
	err := r.pool.QueryRow(ctx, `
		SELECT
			sp.id, sp.shop_id, sp.name, sp.name_ar, sp.description,
			sp.billing_cycle, sp.duration_days, sp.price, sp.currency,
			sp.features, sp.max_members, sp.trial_days, sp.sort_order,
			sp.is_active, sp.is_featured, sp.color,
			sp.created_at, sp.updated_at,
			COALESCE((
				SELECT COUNT(*) FROM member_subscriptions ms
				WHERE ms.plan_id = sp.id AND ms.status = 'active'
			), 0) AS active_members
		FROM subscription_plans sp
		WHERE sp.id = $1 AND sp.shop_id = $2
	`, id, shopID).Scan(
		&p.ID, &p.ShopID, &p.Name, &p.NameAr, &p.Description,
		&p.BillingCycle, &p.DurationDays, &p.Price, &p.Currency,
		&features, &p.MaxMembers, &p.TrialDays, &p.SortOrder,
		&p.IsActive, &p.IsFeatured, &p.Color,
		&p.CreatedAt, &p.UpdatedAt,
		&p.ActiveMembers,
	)
	if err != nil {
		return nil, fmt.Errorf("get plan: %w", err)
	}
	if features != nil {
		p.Features = json.RawMessage(features)
	}
	return &p, nil
}

// CreatePlan inserts a new subscription plan
func (r *Repository) CreatePlan(ctx context.Context, shopID string, req CreatePlanRequest) (*SubscriptionPlan, error) {
	id := uuid.New().String()
	currency := req.Currency
	if currency == "" {
		currency = "EGP"
	}
	var featuresJSON []byte
	if req.Features != nil {
		featuresJSON = req.Features
	}

	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		INSERT INTO subscription_plans
			(id, shop_id, name, name_ar, description, billing_cycle, duration_days,
			 price, currency, features, max_members, trial_days, sort_order,
			 is_active, is_featured, color, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
	`,
		id, shopID, req.Name, req.NameAr, req.Description,
		req.BillingCycle, req.DurationDays,
		req.Price, currency, featuresJSON,
		req.MaxMembers, req.TrialDays, req.SortOrder,
		req.IsActive, req.IsFeatured, req.Color,
		now,
	)
	if err != nil {
		return nil, fmt.Errorf("create plan: %w", err)
	}
	return r.GetPlanByID(ctx, id, shopID)
}

// UpdatePlan updates an existing subscription plan
func (r *Repository) UpdatePlan(ctx context.Context, id, shopID string, req UpdatePlanRequest) (*SubscriptionPlan, error) {
	now := time.Now()

	sets := "updated_at = $1"
	args := []interface{}{now}
	i := 2

	addField := func(col string, val interface{}) {
		sets += fmt.Sprintf(", %s = $%d", col, i)
		args = append(args, val)
		i++
	}

	if req.Name != nil {
		addField("name", *req.Name)
	}
	if req.NameAr != nil {
		addField("name_ar", *req.NameAr)
	}
	if req.Description != nil {
		addField("description", *req.Description)
	}
	if req.BillingCycle != nil {
		addField("billing_cycle", *req.BillingCycle)
	}
	if req.DurationDays != nil {
		addField("duration_days", *req.DurationDays)
	}
	if req.Price != nil {
		addField("price", *req.Price)
	}
	if req.Currency != nil {
		addField("currency", *req.Currency)
	}
	if req.Features != nil {
		addField("features", []byte(req.Features))
	}
	if req.MaxMembers != nil {
		addField("max_members", *req.MaxMembers)
	}
	if req.TrialDays != nil {
		addField("trial_days", *req.TrialDays)
	}
	if req.SortOrder != nil {
		addField("sort_order", *req.SortOrder)
	}
	if req.IsActive != nil {
		addField("is_active", *req.IsActive)
	}
	if req.IsFeatured != nil {
		addField("is_featured", *req.IsFeatured)
	}
	if req.Color != nil {
		addField("color", *req.Color)
	}

	args = append(args, id, shopID)
	query := fmt.Sprintf(`UPDATE subscription_plans SET %s WHERE id = $%d AND shop_id = $%d`, sets, i, i+1)
	_, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("update plan: %w", err)
	}
	return r.GetPlanByID(ctx, id, shopID)
}

// DeletePlan deletes a plan (only if no active subscriptions)
func (r *Repository) DeletePlan(ctx context.Context, id, shopID string) error {
	var count int
	_ = r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM member_subscriptions
		WHERE plan_id = $1 AND status IN ('active','frozen','trial')
	`, id).Scan(&count)
	if count > 0 {
		return fmt.Errorf("plan has %d active subscriptions", count)
	}
	_, err := r.pool.Exec(ctx, `DELETE FROM subscription_plans WHERE id = $1 AND shop_id = $2`, id, shopID)
	return err
}

// ============================================================
// MEMBER SUBSCRIPTIONS
// ============================================================

// ListSubscriptions returns subscriptions for a shop with optional filters
func (r *Repository) ListSubscriptions(ctx context.Context, shopID string, filters map[string]string, limit, offset int) ([]MemberSubscription, int, error) {
	where := "ms.shop_id = $1"
	args := []interface{}{shopID}
	i := 2

	if v, ok := filters["status"]; ok && v != "" {
		where += fmt.Sprintf(" AND ms.status = $%d", i)
		args = append(args, v)
		i++
	}
	if v, ok := filters["payment_status"]; ok && v != "" {
		where += fmt.Sprintf(" AND ms.payment_status = $%d", i)
		args = append(args, v)
		i++
	}
	if v, ok := filters["plan_id"]; ok && v != "" {
		where += fmt.Sprintf(" AND ms.plan_id = $%d", i)
		args = append(args, v)
		i++
	}
	if v, ok := filters["expiring_days"]; ok && v != "" {
		where += fmt.Sprintf(" AND ms.end_date <= NOW() + INTERVAL '%s days' AND ms.status = 'active'", v)
	}
	if v, ok := filters["search"]; ok && v != "" {
		where += fmt.Sprintf(" AND (sc.name ILIKE $%d OR sc.phone ILIKE $%d OR sc.email ILIKE $%d)", i, i, i)
		args = append(args, "%"+v+"%")
		i++
	}

	var total int
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM member_subscriptions ms
		LEFT JOIN customers sc ON sc.id = ms.customer_id
		WHERE %s
	`, where)
	_ = r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)

	if limit <= 0 {
		limit = 50
	}
	args = append(args, limit, offset)
	dataQuery := fmt.Sprintf(`
		SELECT
			ms.id, ms.shop_id, ms.customer_id, ms.plan_id, ms.plan_name,
			ms.billing_cycle, ms.price, ms.currency,
			ms.start_date::text, ms.end_date::text,
			ms.trial_end_date::text,
			ms.status, ms.payment_status, ms.payment_method, ms.payment_ref,
			ms.auto_renew, ms.frozen_at, ms.frozen_days,
			ms.cancelled_at, ms.cancel_reason, ms.notes, ms.renewed_from_id,
			ms.created_by, ms.created_at, ms.updated_at,
			COALESCE(sc.name, '') AS customer_name,
			COALESCE(sc.phone, '') AS customer_phone,
			COALESCE(sc.email, '') AS customer_email
		FROM member_subscriptions ms
		LEFT JOIN customers sc ON sc.id = ms.customer_id
		WHERE %s
		ORDER BY ms.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, i, i+1)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list subscriptions: %w", err)
	}
	defer rows.Close()

	var subs []MemberSubscription
	for rows.Next() {
		var s MemberSubscription
		err := rows.Scan(
			&s.ID, &s.ShopID, &s.CustomerID, &s.PlanID, &s.PlanName,
			&s.BillingCycle, &s.Price, &s.Currency,
			&s.StartDate, &s.EndDate,
			&s.TrialEndDate,
			&s.Status, &s.PaymentStatus, &s.PaymentMethod, &s.PaymentRef,
			&s.AutoRenew, &s.FrozenAt, &s.FrozenDays,
			&s.CancelledAt, &s.CancelReason, &s.Notes, &s.RenewedFromID,
			&s.CreatedBy, &s.CreatedAt, &s.UpdatedAt,
			&s.CustomerName, &s.CustomerPhone, &s.CustomerEmail,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan subscription: %w", err)
		}
		subs = append(subs, s)
	}
	if subs == nil {
		subs = []MemberSubscription{}
	}
	return subs, total, nil
}

// GetSubscriptionByID returns a single subscription
func (r *Repository) GetSubscriptionByID(ctx context.Context, id, shopID string) (*MemberSubscription, error) {
	var s MemberSubscription
	err := r.pool.QueryRow(ctx, `
		SELECT
			ms.id, ms.shop_id, ms.customer_id, ms.plan_id, ms.plan_name,
			ms.billing_cycle, ms.price, ms.currency,
			ms.start_date::text, ms.end_date::text,
			ms.trial_end_date::text,
			ms.status, ms.payment_status, ms.payment_method, ms.payment_ref,
			ms.auto_renew, ms.frozen_at, ms.frozen_days,
			ms.cancelled_at, ms.cancel_reason, ms.notes, ms.renewed_from_id,
			ms.created_by, ms.created_at, ms.updated_at,
			COALESCE(sc.name, '') AS customer_name,
			COALESCE(sc.phone, '') AS customer_phone,
			COALESCE(sc.email, '') AS customer_email
		FROM member_subscriptions ms
		LEFT JOIN customers sc ON sc.id = ms.customer_id
		WHERE ms.id = $1 AND ms.shop_id = $2
	`, id, shopID).Scan(
		&s.ID, &s.ShopID, &s.CustomerID, &s.PlanID, &s.PlanName,
		&s.BillingCycle, &s.Price, &s.Currency,
		&s.StartDate, &s.EndDate,
		&s.TrialEndDate,
		&s.Status, &s.PaymentStatus, &s.PaymentMethod, &s.PaymentRef,
		&s.AutoRenew, &s.FrozenAt, &s.FrozenDays,
		&s.CancelledAt, &s.CancelReason, &s.Notes, &s.RenewedFromID,
		&s.CreatedBy, &s.CreatedAt, &s.UpdatedAt,
		&s.CustomerName, &s.CustomerPhone, &s.CustomerEmail,
	)
	if err != nil {
		return nil, fmt.Errorf("get subscription: %w", err)
	}
	return &s, nil
}

// CreateSubscription inserts a new member subscription
func (r *Repository) CreateSubscription(ctx context.Context, shopID, createdBy string, req CreateSubscriptionRequest) (*MemberSubscription, error) {
	// Fetch the plan
	plan, err := r.GetPlanByID(ctx, req.PlanID, shopID)
	if err != nil {
		return nil, fmt.Errorf("plan not found: %w", err)
	}

	// Parse start date and compute end date
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start_date: %w", err)
	}
	endDate := startDate.AddDate(0, 0, plan.DurationDays)

	// Trial end date
	var trialEndDate *string
	if plan.TrialDays > 0 {
		t := startDate.AddDate(0, 0, plan.TrialDays).Format("2006-01-02")
		trialEndDate = &t
	}

	// Determine initial status
	status := "active"
	if plan.TrialDays > 0 {
		status = "trial"
	}
	if req.PaymentStatus == "pending" || req.PaymentStatus == "overdue" {
		status = "pending"
	}

	id := uuid.New().String()
	now := time.Now()
	planName := plan.Name
	if plan.NameAr != nil {
		planName = *plan.NameAr
	}

	_, err = r.pool.Exec(ctx, `
		INSERT INTO member_subscriptions
			(id, shop_id, customer_id, plan_id, plan_name, billing_cycle,
			 price, currency, start_date, end_date, trial_end_date,
			 status, payment_status, payment_method, payment_ref,
			 auto_renew, notes, created_by, created_at, updated_at)
		VALUES
			($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)
	`,
		id, shopID, req.CustomerID, req.PlanID, planName, plan.BillingCycle,
		plan.Price, plan.Currency,
		req.StartDate, endDate.Format("2006-01-02"), trialEndDate,
		status, req.PaymentStatus, req.PaymentMethod, req.PaymentRef,
		req.AutoRenew, req.Notes, createdBy, now,
	)
	if err != nil {
		return nil, fmt.Errorf("create subscription: %w", err)
	}
	return r.GetSubscriptionByID(ctx, id, shopID)
}

// UpdateSubscription updates fields of a subscription
func (r *Repository) UpdateSubscription(ctx context.Context, id, shopID string, req UpdateSubscriptionRequest) (*MemberSubscription, error) {
	now := time.Now()
	sets := "updated_at = $1"
	args := []interface{}{now}
	i := 2

	addField := func(col string, val interface{}) {
		sets += fmt.Sprintf(", %s = $%d", col, i)
		args = append(args, val)
		i++
	}

	if req.Status != nil {
		addField("status", *req.Status)
		if *req.Status == "cancelled" {
			addField("cancelled_at", now)
		}
		if *req.Status == "frozen" {
			addField("frozen_at", now)
		}
	}
	if req.PaymentStatus != nil {
		addField("payment_status", *req.PaymentStatus)
	}
	if req.PaymentMethod != nil {
		addField("payment_method", *req.PaymentMethod)
	}
	if req.PaymentRef != nil {
		addField("payment_ref", *req.PaymentRef)
	}
	if req.AutoRenew != nil {
		addField("auto_renew", *req.AutoRenew)
	}
	if req.Notes != nil {
		addField("notes", *req.Notes)
	}
	if req.CancelReason != nil {
		addField("cancel_reason", *req.CancelReason)
	}

	args = append(args, id, shopID)
	query := fmt.Sprintf(`UPDATE member_subscriptions SET %s WHERE id = $%d AND shop_id = $%d`, sets, i, i+1)
	_, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("update subscription: %w", err)
	}
	return r.GetSubscriptionByID(ctx, id, shopID)
}

// RenewSubscription creates a renewal subscription from an existing one
func (r *Repository) RenewSubscription(ctx context.Context, id, shopID, createdBy string, req RenewSubscriptionRequest) (*MemberSubscription, error) {
	// Get existing subscription
	old, err := r.GetSubscriptionByID(ctx, id, shopID)
	if err != nil {
		return nil, err
	}

	// Fetch plan for duration
	plan, err := r.GetPlanByID(ctx, old.PlanID, shopID)
	if err != nil {
		return nil, err
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start_date: %w", err)
	}
	endDate := startDate.AddDate(0, 0, plan.DurationDays)

	newID := uuid.New().String()
	now := time.Now()

	_, err = r.pool.Exec(ctx, `
		INSERT INTO member_subscriptions
			(id, shop_id, customer_id, plan_id, plan_name, billing_cycle,
			 price, currency, start_date, end_date,
			 status, payment_status, payment_method, payment_ref,
			 auto_renew, renewed_from_id, created_by, created_at, updated_at)
		VALUES
			($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$12,$13,$14,$15,$16,$17,$17)
	`,
		newID, shopID, old.CustomerID, old.PlanID, old.PlanName, old.BillingCycle,
		old.Price, old.Currency,
		req.StartDate, endDate.Format("2006-01-02"),
		req.PaymentStatus, req.PaymentMethod, req.PaymentRef,
		old.AutoRenew, id, createdBy, now,
	)
	if err != nil {
		return nil, fmt.Errorf("renew subscription: %w", err)
	}
	return r.GetSubscriptionByID(ctx, newID, shopID)
}

// GetStats returns aggregated stats for a shop's subscriptions
func (r *Repository) GetStats(ctx context.Context, shopID string) (*SubscriptionStats, error) {
	var s SubscriptionStats
	err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS total_active,
			COALESCE(SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END), 0) AS total_expired,
			COALESCE(SUM(CASE WHEN status = 'frozen' THEN 1 ELSE 0 END), 0) AS total_frozen,
			COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS total_cancelled,
			COALESCE(SUM(CASE WHEN status = 'active' AND end_date <= NOW() + INTERVAL '7 days' THEN 1 ELSE 0 END), 0) AS expiring_this_week,
			COALESCE(SUM(CASE WHEN status = 'active' AND end_date <= NOW() + INTERVAL '30 days' THEN 1 ELSE 0 END), 0) AS expiring_this_month,
			COALESCE(SUM(CASE WHEN payment_status = 'overdue' THEN 1 ELSE 0 END), 0) AS overdue_payments,
			COALESCE(SUM(CASE WHEN payment_status = 'paid' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) THEN price ELSE 0 END), 0) AS monthly_revenue,
			COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN price ELSE 0 END), 0) AS total_revenue
		FROM member_subscriptions
		WHERE shop_id = $1
	`, shopID).Scan(
		&s.TotalActive, &s.TotalExpired, &s.TotalFrozen, &s.TotalCancelled,
		&s.ExpiringThisWeek, &s.ExpiringThisMonth, &s.OverduePayments,
		&s.MonthlyRevenue, &s.TotalRevenue,
	)
	if err != nil {
		return nil, fmt.Errorf("get stats: %w", err)
	}
	return &s, nil
}

// GetCustomerSubscriptions returns all subscriptions for a specific customer
func (r *Repository) GetCustomerSubscriptions(ctx context.Context, customerID, shopID string) ([]MemberSubscription, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			ms.id, ms.shop_id, ms.customer_id, ms.plan_id, ms.plan_name,
			ms.billing_cycle, ms.price, ms.currency,
			ms.start_date::text, ms.end_date::text,
			ms.trial_end_date::text,
			ms.status, ms.payment_status, ms.payment_method, ms.payment_ref,
			ms.auto_renew, ms.frozen_at, ms.frozen_days,
			ms.cancelled_at, ms.cancel_reason, ms.notes, ms.renewed_from_id,
			ms.created_by, ms.created_at, ms.updated_at,
			COALESCE(sc.name, '') AS customer_name,
			COALESCE(sc.phone, '') AS customer_phone,
			COALESCE(sc.email, '') AS customer_email
		FROM member_subscriptions ms
		LEFT JOIN customers sc ON sc.id = ms.customer_id
		WHERE ms.customer_id = $1 AND ms.shop_id = $2
		ORDER BY ms.created_at DESC
	`, customerID, shopID)
	if err != nil {
		return nil, fmt.Errorf("list customer subscriptions: %w", err)
	}
	defer rows.Close()

	var subs []MemberSubscription
	for rows.Next() {
		var s MemberSubscription
		err := rows.Scan(
			&s.ID, &s.ShopID, &s.CustomerID, &s.PlanID, &s.PlanName,
			&s.BillingCycle, &s.Price, &s.Currency,
			&s.StartDate, &s.EndDate,
			&s.TrialEndDate,
			&s.Status, &s.PaymentStatus, &s.PaymentMethod, &s.PaymentRef,
			&s.AutoRenew, &s.FrozenAt, &s.FrozenDays,
			&s.CancelledAt, &s.CancelReason, &s.Notes, &s.RenewedFromID,
			&s.CreatedBy, &s.CreatedAt, &s.UpdatedAt,
			&s.CustomerName, &s.CustomerPhone, &s.CustomerEmail,
		)
		if err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	if subs == nil {
		subs = []MemberSubscription{}
	}
	return subs, nil
}

// ============================================================
// PUBLIC STOREFRONT SUBSCRIPTION METHODS
// ============================================================

var subPhoneDigitsRe = regexp.MustCompile(`[^0-9]`)

func normalizePhone(phone string) string {
	return subPhoneDigitsRe.ReplaceAllString(strings.TrimSpace(phone), "")
}

// ResolveShopID finds the shop ID from either an ID or a slug
func (r *Repository) ResolveShopID(ctx context.Context, shopIDOrSlug string) (string, error) {
	var actualShopID string
	err := r.pool.QueryRow(ctx, `SELECT id FROM shops WHERE id = $1 OR slug = $1 LIMIT 1`, shopIDOrSlug).Scan(&actualShopID)
	if err != nil {
		return "", fmt.Errorf("shop not found: %w", err)
	}
	return actualShopID, nil
}

// ListPublicPlans returns active plans for a shop (resolving by ID or slug)
func (r *Repository) ListPublicPlans(ctx context.Context, shopIDOrSlug string) ([]SubscriptionPlan, error) {
	shopID, err := r.ResolveShopID(ctx, shopIDOrSlug)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT
			sp.id, sp.shop_id, sp.name, sp.name_ar, sp.description,
			sp.billing_cycle, sp.duration_days, sp.price, sp.currency,
			sp.features, sp.max_members, sp.trial_days, sp.sort_order,
			sp.is_active, sp.is_featured, sp.color,
			sp.created_at, sp.updated_at,
			0 AS active_members
		FROM subscription_plans sp
		WHERE sp.shop_id = $1 AND sp.is_active = true
		ORDER BY sp.sort_order ASC, sp.created_at ASC
	`, shopID)
	if err != nil {
		return nil, fmt.Errorf("list public plans: %w", err)
	}
	defer rows.Close()

	var plans []SubscriptionPlan
	for rows.Next() {
		var p SubscriptionPlan
		var features []byte
		err := rows.Scan(
			&p.ID, &p.ShopID, &p.Name, &p.NameAr, &p.Description,
			&p.BillingCycle, &p.DurationDays, &p.Price, &p.Currency,
			&features, &p.MaxMembers, &p.TrialDays, &p.SortOrder,
			&p.IsActive, &p.IsFeatured, &p.Color,
			&p.CreatedAt, &p.UpdatedAt,
			&p.ActiveMembers,
		)
		if err != nil {
			return nil, fmt.Errorf("scan public plan: %w", err)
		}
		if features != nil {
			p.Features = json.RawMessage(features)
		}
		plans = append(plans, p)
	}
	if plans == nil {
		plans = []SubscriptionPlan{}
	}
	return plans, nil
}

// PublicSubscribe handles a customer self-subscribing from the website
func (r *Repository) PublicSubscribe(ctx context.Context, shopIDOrSlug string, req PublicSubscribeRequest) (*MemberSubscription, error) {
	shopID, err := r.ResolveShopID(ctx, shopIDOrSlug)
	if err != nil {
		return nil, err
	}

	// 1. Locate or create plan
	var plan *SubscriptionPlan
	if req.PlanID != "" {
		plan, _ = r.GetPlanByID(ctx, req.PlanID, shopID)
	}
	if plan == nil && req.PlanName != "" {
		// Look up by name
		rows, lerr := r.ListPlans(ctx, shopID)
		if lerr == nil {
			for _, p := range rows {
				if strings.EqualFold(p.Name, req.PlanName) || (p.NameAr != nil && *p.NameAr == req.PlanName) {
					plan = &p
					break
				}
			}
		}
	}
	if plan == nil {
		// If merchant doesn't have plans yet, create one on the fly from the website tier
		planName := req.PlanName
		if planName == "" {
			planName = "باقة اشتراك الموقع"
		}
		price := req.PlanPrice
		if price <= 0 {
			price = 0
		}
		createdPlan, cerr := r.CreatePlan(ctx, shopID, CreatePlanRequest{
			Name:         planName,
			BillingCycle: "monthly",
			DurationDays: 30,
			Price:        price,
			Currency:     "EGP",
			IsActive:     true,
			SortOrder:    0,
		})
		if cerr != nil {
			return nil, fmt.Errorf("create plan on the fly: %w", cerr)
		}
		plan = createdPlan
	}

	// 2. Find or create customer in unified customers table
	phone := strings.TrimSpace(req.CustomerPhone)
	cleanPhone := normalizePhone(phone)
	var customerID string
	_ = r.pool.QueryRow(ctx, `
		SELECT id FROM customers
		WHERE shop_id = $1 AND regexp_replace(COALESCE(phone,''), '[^0-9]', '', 'g') = $2
		LIMIT 1
	`, shopID, cleanPhone).Scan(&customerID)

	if customerID == "" {
		customerID = uuid.New().String()
		var n int
		_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM customers WHERE shop_id = $1`, shopID).Scan(&n)
		code := fmt.Sprintf("CUST-%04d", n+1)

		name := strings.TrimSpace(req.CustomerName)
		if name == "" {
			name = "عميل اشتراك الموقع"
		}
		email := strings.TrimSpace(req.CustomerEmail)

		_, cerr := r.pool.Exec(ctx, `
			INSERT INTO customers (
				id, shop_id, code, name, email, phone, customer_type,
				status, source, archived, loyalty_balance, balance_due, created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, 'individual',
				'active', 'website', FALSE, 0, 0, NOW(), NOW()
			)
		`, customerID, shopID, code, name, email, phone)
		if cerr != nil {
			return nil, fmt.Errorf("create customer: %w", cerr)
		}
	}

	// 3. Compute dates
	now := time.Now()
	startDateStr := now.Format("2006-01-02")
	durationDays := plan.DurationDays
	if durationDays <= 0 {
		durationDays = 30
	}
	endDateStr := now.AddDate(0, 0, durationDays).Format("2006-01-02")

	var trialEndDate *string
	if plan.TrialDays > 0 {
		t := now.AddDate(0, 0, plan.TrialDays).Format("2006-01-02")
		trialEndDate = &t
	}

	status := "active"
	if plan.TrialDays > 0 {
		status = "trial"
	}
	paymentStatus := "pending"

	paymentMethod := "cash"
	if strings.TrimSpace(req.PaymentMethod) != "" {
		paymentMethod = strings.TrimSpace(req.PaymentMethod)
	}

	notes := "تم الاشتراك عبر الموقع الإلكتروني"
	if strings.TrimSpace(req.Notes) != "" {
		notes += " - " + strings.TrimSpace(req.Notes)
	}

	planDisplayName := plan.Name
	if plan.NameAr != nil && *plan.NameAr != "" {
		planDisplayName = *plan.NameAr
	}

	subID := uuid.New().String()
	_, err = r.pool.Exec(ctx, `
		INSERT INTO member_subscriptions
			(id, shop_id, customer_id, plan_id, plan_name, billing_cycle,
			 price, currency, start_date, end_date, trial_end_date,
			 status, payment_status, payment_method,
			 auto_renew, notes, created_by, created_at, updated_at)
		VALUES
			($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'website',$17,$17)
	`,
		subID, shopID, customerID, plan.ID, planDisplayName, plan.BillingCycle,
		plan.Price, plan.Currency, startDateStr, endDateStr, trialEndDate,
		status, paymentStatus, paymentMethod,
		false, notes, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert subscription: %w", err)
	}

	return r.GetSubscriptionByID(ctx, subID, shopID)
}

