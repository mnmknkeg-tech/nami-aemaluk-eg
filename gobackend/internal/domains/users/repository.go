package users

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// Repository handles persistence for the Users domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new users repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// FindByID returns a user by ID or nil if not found.
func (r *Repository) FindByID(ctx context.Context, id string) (*auth.User, error) {
	row := r.pool.QueryRow(ctx, selectUser+" WHERE id = $1 LIMIT 1", id)
	return scanUser(row)
}

// FindByEmail returns a user by email or nil if not found.
func (r *Repository) FindByEmail(ctx context.Context, email string) (*auth.User, error) {
	row := r.pool.QueryRow(ctx, selectUser+" WHERE email = $1 LIMIT 1", email)
	return scanUser(row)
}

// FindByPhone returns a user by phone or nil if not found.
func (r *Repository) FindByPhone(ctx context.Context, phone string) (*auth.User, error) {
	row := r.pool.QueryRow(ctx, selectUser+" WHERE phone = $1 LIMIT 1", phone)
	return scanUser(row)
}

// UpdateMe updates the current user's name, phone and/or extra phone numbers.
func (r *Repository) UpdateMe(ctx context.Context, id string, name, phone string, extraPhones *[]string) (*auth.User, error) {
	parts := []string{}
	args := []any{}
	argIdx := 1
	if name != "" {
		parts = append(parts, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, name)
		argIdx++
	}
	if phone != "__UNSET__" {
		parts = append(parts, fmt.Sprintf("phone = $%d", argIdx))
		if phone == "" {
			args = append(args, nil)
		} else {
			args = append(args, phone)
		}
		argIdx++
	}
	if extraPhones != nil {
		encoded, err := json.Marshal(*extraPhones)
		if err != nil {
			return nil, errors.Internal("encode_extra_phones_failed", err)
		}
		parts = append(parts, fmt.Sprintf("extra_phones = $%d::jsonb", argIdx))
		args = append(args, string(encoded))
		argIdx++
	}
	if len(parts) == 0 {
		return r.FindByID(ctx, id)
	}

	query := "UPDATE users SET " + strings.Join(parts, ", ") + fmt.Sprintf(", updated_at = NOW() WHERE id = $%d RETURNING ", argIdx) + userColumns
	args = append(args, id)
	row := r.pool.QueryRow(ctx, query, args...)
	return scanUser(row)
}

// ReplaceDeliveryAddresses overwrites the user's saved address book and
// returns the refreshed user row.
func (r *Repository) ReplaceDeliveryAddresses(ctx context.Context, id string, addresses []auth.DeliveryAddress) (*auth.User, error) {
	encoded, err := json.Marshal(addresses)
	if err != nil {
		return nil, errors.Internal("encode_delivery_addresses_failed", err)
	}
	query := `UPDATE users SET delivery_addresses = $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING ` + userColumns
	row := r.pool.QueryRow(ctx, query, string(encoded), id)
	return scanUser(row)
}

// ListCouriers returns courier users with optional search and active filter.
func (r *Repository) ListCouriers(ctx context.Context, take, skip int, search string, isActive *bool) ([]auth.User, error) {
	args := []any{auth.RoleCourier, take, skip}
	filters := "role = $1"
	argIdx := 4
	if isActive != nil {
		filters += fmt.Sprintf(" AND is_active = $%d", argIdx)
		args = append(args, *isActive)
		argIdx++
	}
	if search != "" {
		filters += fmt.Sprintf(" AND (name ILIKE $%d OR email ILIKE $%d OR phone ILIKE $%d)", argIdx, argIdx+1, argIdx+2)
		pattern := "%" + search + "%"
		args = append(args, pattern, pattern, pattern)
	}

	query := selectUser + " WHERE " + filters + " ORDER BY created_at DESC LIMIT $2 OFFSET $3"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_couriers_failed", err)
	}
	defer rows.Close()
	return scanUsers(rows)
}

// CreateCourier inserts a new courier user.
func (r *Repository) CreateCourier(ctx context.Context, u *auth.User) (*auth.User, error) {
	query := `
		INSERT INTO users (id, email, name, phone, password, role, is_active, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW(), NOW())
		RETURNING ` + userColumns
	row := r.pool.QueryRow(ctx, query, u.Email, u.Name, u.Phone, u.Password, auth.RoleCourier)
	return scanUser(row)
}

// SetActive updates the active flag for a user.
func (r *Repository) SetActive(ctx context.Context, id string, active bool) (*auth.User, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING `+userColumns,
		active, id,
	)
	return scanUser(row)
}

// ListAll retrieves all users with optional filtering for admin dashboard
func (r *Repository) ListAll(ctx context.Context, take, skip int, search, role string) ([]auth.User, error) {
	filters := []string{"1=1"}
	args := []any{}
	argIdx := 1

	if search != "" {
		filters = append(filters, fmt.Sprintf("(name ILIKE $%d OR email ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if role != "" && role != "all" {
		filters = append(filters, fmt.Sprintf("UPPER(role) = UPPER($%d)", argIdx))
		args = append(args, role)
		argIdx++
	}

	whereClause := strings.Join(filters, " AND ")
	args = append(args, take, skip)
	query := fmt.Sprintf("%s WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d", selectUser, whereClause, argIdx, argIdx+1)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_users_failed", err)
	}
	defer rows.Close()
	return scanUsers(rows)
}

// SetRole updates a user's role.
func (r *Repository) SetRole(ctx context.Context, id string, role string) (*auth.User, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING `+userColumns,
		role, id,
	)
	return scanUser(row)
}

// Delete removes a user by ID.
func (r *Repository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	return err
}

// CourierOrders returns the most recent orders assigned to a courier with their
// status. This is used to build the courier admin details response.
func (r *Repository) CourierOrders(ctx context.Context, courierID string, limit int) ([]map[string]any, error) {
	query := `
		SELECT id, total, status, created_at, handed_to_courier_at, delivered_at
		FROM orders
		WHERE courier_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, courierID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []map[string]any
	for rows.Next() {
		var id, status string
		var total float64
		var createdAt time.Time
		var handed, delivered sql.NullTime
		if err := rows.Scan(&id, &total, &status, &createdAt, &handed, &delivered); err != nil {
			return nil, err
		}
		orders = append(orders, map[string]any{
			"id":                id,
			"total":             total,
			"status":            status,
			"createdAt":         createdAt,
			"handedToCourierAt": nullTimePtr(handed),
			"deliveredAt":       nullTimePtr(delivered),
		})
	}
	return orders, rows.Err()
}

// CourierState returns the courier_state row for a courier if any.
func (r *Repository) CourierState(ctx context.Context, courierID string) (map[string]any, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, is_available, last_lat, last_lng, last_seen_at, updated_at
		 FROM courier_states WHERE user_id = $1 LIMIT 1`,
		courierID,
	)
	var id string
	var isAvailable bool
	var lat, lng sql.NullFloat64
	var lastSeenAt sql.NullTime
	var updatedAt time.Time
	if err := row.Scan(&id, &isAvailable, &lat, &lng, &lastSeenAt, &updatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return map[string]any{
		"id":          id,
		"isAvailable": isAvailable,
		"lastLat":     nullFloat64Ptr(lat),
		"lastLng":     nullFloat64Ptr(lng),
		"lastSeenAt":  nullTimePtr(lastSeenAt),
		"updatedAt":   updatedAt,
	}, nil
}

const userColumns = `id, email, name, phone, password, role, shop_id, is_active,
 email_verified_at, email_verification_sent_at, last_login, created_at, updated_at,
 COALESCE(extra_phones, '[]'::jsonb) AS extra_phones,
 COALESCE(delivery_addresses, '[]'::jsonb) AS delivery_addresses`

const selectUser = `SELECT ` + userColumns + ` FROM users`

func scanUser(row pgx.Row) (*auth.User, error) {
	u := &auth.User{}
	var phone, shopID sql.NullString
	var verifiedAt, sentAt, lastLogin pgtype.Timestamp
	var extraPhones, deliveryAddresses []byte
	err := row.Scan(
		&u.ID, &u.Email, &u.Name, &phone, &u.Password, &u.Role, &shopID,
		&u.IsActive, &verifiedAt, &sentAt, &lastLogin,
		&u.CreatedAt, &u.UpdatedAt, &extraPhones, &deliveryAddresses,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_user_failed", err)
	}
	if phone.Valid {
		u.Phone = &phone.String
	}
	if shopID.Valid {
		u.ShopID = &shopID.String
	}
	if len(extraPhones) > 0 {
		_ = json.Unmarshal(extraPhones, &u.ExtraPhones)
	}
	if len(deliveryAddresses) > 0 {
		_ = json.Unmarshal(deliveryAddresses, &u.DeliveryAddresses)
	}
	u.EmailVerifiedAt = timestampPtr(verifiedAt)
	u.EmailVerificationSentAt = timestampPtr(sentAt)
	u.LastLogin = timestampPtr(lastLogin)
	return u, nil
}

func scanUsers(rows pgx.Rows) ([]auth.User, error) {
	var users []auth.User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		if u != nil {
			users = append(users, *u)
		}
	}
	return users, rows.Err()
}

func timestampPtr(t pgtype.Timestamp) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

func nullTimePtr(t sql.NullTime) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

func nullFloat64Ptr(f sql.NullFloat64) *float64 {
	if !f.Valid {
		return nil
	}
	return &f.Float64
}
