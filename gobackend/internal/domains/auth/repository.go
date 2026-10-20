package auth

import (
	"context"
	"database/sql"
	stderrors "errors"
	"strings"
	"sync"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// Repository handles persistence for the Auth domain.
type Repository struct {
	pool *db.Pool

	// recoveryCodesTableReady is set once the 2FA recovery-code table has been
	// confirmed to exist, so the check is paid at most once per process.
	recoveryCodesMu     sync.Mutex
	recoveryCodesReady  bool
	recoveryCodesFailed bool
}

// createRecoveryCodesTableSQL mirrors migration 000077. It is idempotent, so
// whichever of the two runs first, the resulting schema is identical.
const createRecoveryCodesTableSQL = `
CREATE TABLE IF NOT EXISTS user_recovery_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`

const createRecoveryCodesIndexSQL = `
CREATE INDEX IF NOT EXISTS idx_user_recovery_codes_user
    ON user_recovery_codes (user_id, used_at)`

// ensureRecoveryCodesTable creates the 2FA recovery-code table when it is
// missing.
//
// Deployments running with DB_MIGRATE_ON_BOOT=false never apply migration
// 000077, so on those hosts the table simply does not exist and the first user
// to enable 2FA would get an opaque 500. Creating it here keeps 2FA working
// without requiring any change to the deployment environment.
//
// Both statements are idempotent, so this is safe whether or not the migration
// already ran. The DDL runs at most once per process; if it fails (for example
// the role lacks CREATE rights) the failure is remembered so it does not stall
// every request, and the caller's own query returns the real database error.
func (r *Repository) ensureRecoveryCodesTable(ctx context.Context) {
	r.recoveryCodesMu.Lock()
	defer r.recoveryCodesMu.Unlock()

	if r.recoveryCodesReady || r.recoveryCodesFailed {
		return
	}
	if r.pool == nil {
		r.recoveryCodesFailed = true
		return
	}
	if _, err := r.pool.Exec(ctx, createRecoveryCodesTableSQL); err != nil {
		logger.Global().Warn("failed to ensure user_recovery_codes table exists",
			zap.Error(err))
		r.recoveryCodesFailed = true
		return
	}
	if _, err := r.pool.Exec(ctx, createRecoveryCodesIndexSQL); err != nil {
		// The table is usable without the index; this is only a performance
		// nicety, so treat it as created and move on.
		logger.Global().Warn("failed to ensure user_recovery_codes index exists",
			zap.Error(err))
	}
	r.recoveryCodesReady = true
}

// NewRepository creates a new auth repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// FindByEmail returns a user by email or nil if not found.
func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT id, email, name, phone, password, role, shop_id, is_active,
		       email_verified_at, email_verification_sent_at, last_login, tfa_secret,
		       deactivated_at, scheduled_purge_at, created_at, updated_at
		FROM users
		WHERE email = $1
		LIMIT 1
	`
	row := r.pool.QueryRow(ctx, query, email)
	return scanUser(row)
}

// FindByID returns a user by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*User, error) {
	query := `
		SELECT id, email, name, phone, password, role, shop_id, is_active,
		       email_verified_at, email_verification_sent_at, last_login, tfa_secret,
		       deactivated_at, scheduled_purge_at, created_at, updated_at
		FROM users
		WHERE id = $1
		LIMIT 1
	`
	row := r.pool.QueryRow(ctx, query, id)
	return scanUser(row)
}

// FindFirstAdmin returns the first admin user or nil.
func (r *Repository) FindFirstAdmin(ctx context.Context) (*User, error) {
	query := `
		SELECT id, email, name, phone, password, role, shop_id, is_active,
		       email_verified_at, email_verification_sent_at, last_login, tfa_secret,
		       deactivated_at, scheduled_purge_at, created_at, updated_at
		FROM users
		WHERE role = 'ADMIN'
		LIMIT 1
	`
	row := r.pool.QueryRow(ctx, query)
	return scanUser(row)
}

// CreateDevShop creates a development shop for a merchant user.
func (r *Repository) CreateDevShop(ctx context.Context, userID, category string) (string, error) {
	shopID := "dev-shop-" + userID
	query := `
		INSERT INTO shops (id, owner_id, name, category, phone, governorate, city, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET owner_id = $2, updated_at = NOW()
		RETURNING id
	`

	shopName := "Dev Shop"
	if category != "" {
		shopName = "Dev " + category + " Shop"
	}

	row := r.pool.QueryRow(ctx, query, shopID, userID, shopName, category, "01000000000", "Cairo", "Cairo")
	var id string
	if err := row.Scan(&id); err != nil {
		return "", errors.Internal("create_dev_shop_failed", err)
	}

	// Update user's shop_id
	updateQuery := `UPDATE users SET shop_id = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.pool.Exec(ctx, updateQuery, shopID, userID)
	if err != nil {
		logger.Global().Warn("failed to update user shop_id", zap.Error(err))
	}

	return id, nil
}

// Create inserts a new user.
func (r *Repository) Create(ctx context.Context, u *User) (*User, error) {
	query := `
		INSERT INTO users (id, email, name, phone, password, role, shop_id, is_active, tfa_secret, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, '', NOW(), NOW())
		RETURNING id, email, name, phone, password, role, shop_id, is_active,
		          email_verified_at, email_verification_sent_at, last_login, tfa_secret,
		          deactivated_at, scheduled_purge_at, created_at, updated_at
	`
	row := r.pool.QueryRow(ctx, query, u.Email, u.Name, u.Phone, u.Password, u.Role, u.ShopID, u.IsActive)
	created, err := scanUser(row)
	if err != nil {
		return nil, translateUniqueViolation(err)
	}
	return created, nil
}

// translateUniqueViolation maps a Postgres unique-constraint violation onto a
// 409 conflict instead of letting it bubble up as a 500.
//
// The users table has two unique indexes — the email one and users_phone_key.
// Signup pre-checks the email, but two concurrent signups can still race, and
// the phone is never pre-checked at all. Without this translation a merchant
// who reuses a phone number got "internal server error" with no way to tell
// what went wrong.
func translateUniqueViolation(err error) error {
	var pgErr *pgconn.PgError
	// 23505 is Postgres' SQLSTATE for unique_violation.
	if !stderrors.As(err, &pgErr) || pgErr.Code != "23505" {
		return err
	}
	// The constraint name is the reliable signal here — Postgres reports it as
	// "duplicate key value violates unique constraint \"<name>\"".
	switch {
	case strings.Contains(pgErr.ConstraintName, "email"):
		return errors.Conflict("email_already_exists", "البريد الإلكتروني مستخدم بالفعل")
	case strings.Contains(pgErr.ConstraintName, "phone"):
		return errors.Conflict("phone_already_exists", "رقم الموبايل مستخدم بالفعل")
	default:
		return errors.Conflict("duplicate_value", "القيمة المدخلة مستخدمة بالفعل")
	}
}

// UpdatePassword changes the user's password and updated_at timestamp.
func (r *Repository) UpdatePassword(ctx context.Context, id, hashedPassword string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
		hashedPassword, id,
	)
	return err
}

// UpdateAdmin ensures a user is an active admin.
func (r *Repository) UpdateAdmin(ctx context.Context, id, name, hashedPassword string) (*User, error) {
	query := `
		UPDATE users
		SET name = $2, password = $3, role = 'ADMIN', is_active = true, updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, name, phone, password, role, shop_id, is_active,
		          email_verified_at, email_verification_sent_at, last_login, tfa_secret,
		          deactivated_at, scheduled_purge_at, created_at, updated_at
	`
	row := r.pool.QueryRow(ctx, query, id, name, hashedPassword)
	return scanUser(row)
}

// SetEmailVerified marks a user's email as verified.
func (r *Repository) SetEmailVerified(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
		id,
	)
	return err
}

// SetEmailVerificationSent updates the sent-at timestamp.
func (r *Repository) SetEmailVerificationSent(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET email_verification_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
		id,
	)
	return err
}

// UpdateLastLogin updates the last login timestamp.
func (r *Repository) UpdateLastLogin(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1`,
		id,
	)
	return err
}

// CancelScheduledDeletion clears a pending account-deletion schedule (the
// user logged back in before the purge date).
func (r *Repository) CancelScheduledDeletion(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET deactivated_at = NULL, scheduled_purge_at = NULL, updated_at = NOW() WHERE id = $1`,
		id,
	)
	return err
}

// Set2FASecret sets the 2FA secret for a user.
func (r *Repository) Set2FASecret(ctx context.Context, userID, secret string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET tfa_secret = $1, updated_at = NOW() WHERE id = $2`,
		secret, userID,
	)
	return err
}

// Get2FASecret retrieves the 2FA secret for a user.
func (r *Repository) Get2FASecret(ctx context.Context, userID string) (string, error) {
	var secret sql.NullString
	err := r.pool.QueryRow(ctx,
		`SELECT tfa_secret FROM users WHERE id = $1`,
		userID,
	).Scan(&secret)
	if err != nil {
		return "", err
	}
	return secret.String, nil
}

// ReplaceRecoveryCodes clears any existing recovery codes for a user and
// inserts the given hashed codes. Only hashes are stored.
func (r *Repository) ReplaceRecoveryCodes(ctx context.Context, userID string, codeHashes []string) error {
	r.ensureRecoveryCodesTable(ctx)
	if _, err := r.pool.Exec(ctx,
		`DELETE FROM user_recovery_codes WHERE user_id = $1`, userID,
	); err != nil {
		return errors.Internal("clear_recovery_codes_failed", err)
	}
	for _, h := range codeHashes {
		if _, err := r.pool.Exec(ctx,
			`INSERT INTO user_recovery_codes (user_id, code_hash) VALUES ($1, $2)`,
			userID, h,
		); err != nil {
			return errors.Internal("insert_recovery_code_failed", err)
		}
	}
	return nil
}

// FindUnusedRecoveryCodeID returns the id of an unused recovery code matching
// the given hash, or "" when there is no match.
func (r *Repository) FindUnusedRecoveryCodeID(ctx context.Context, userID, codeHash string) (string, error) {
	r.ensureRecoveryCodesTable(ctx)
	var id string
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM user_recovery_codes
		 WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
		 LIMIT 1`,
		userID, codeHash,
	).Scan(&id)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", errors.Internal("find_recovery_code_failed", err)
	}
	return id, nil
}

// ConsumeRecoveryCode marks a recovery code as used (idempotent per code).
func (r *Repository) ConsumeRecoveryCode(ctx context.Context, id string) error {
	r.ensureRecoveryCodesTable(ctx)
	_, err := r.pool.Exec(ctx,
		`UPDATE user_recovery_codes SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`,
		id,
	)
	return err
}

// RecordAuthEvent inserts an authentication audit event.
func (r *Repository) RecordAuthEvent(ctx context.Context, userID, email, action, status string, ip, userAgent string, meta map[string]any) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO auth_events (id, user_id, email, action, status, ip, user_agent, metadata, created_at)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
		userID, email, action, status, ip, userAgent, meta,
	)
	return err
}

// scanUser maps a pgx row to a User. It returns nil, nil when no rows are found.
func scanUser(row pgx.Row) (*User, error) {
	u := &User{}
	var phone, shopID, tfaSecret sql.NullString
	var verifiedAt, sentAt, lastLogin, deactivatedAt, scheduledPurgeAt pgtype.Timestamp
	err := row.Scan(
		&u.ID, &u.Email, &u.Name, &phone, &u.Password, &u.Role, &shopID,
		&u.IsActive, &verifiedAt, &sentAt, &lastLogin, &tfaSecret,
		&deactivatedAt, &scheduledPurgeAt, &u.CreatedAt, &u.UpdatedAt,
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
	if tfaSecret.Valid {
		u.TFASecret = tfaSecret.String
	}
	u.EmailVerifiedAt = timestampPtr(verifiedAt)
	u.EmailVerificationSentAt = timestampPtr(sentAt)
	u.LastLogin = timestampPtr(lastLogin)
	u.DeactivatedAt = timestampPtr(deactivatedAt)
	u.ScheduledPurgeAt = timestampPtr(scheduledPurgeAt)
	return u, nil
}

func timestampPtr(t pgtype.Timestamp) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}
