package portal

import (
	"context"
	"database/sql"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

// Repository handles persistence for the Portal domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new portal repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

const ownerColumns = "id, phone, email, name, password_hash, avatar_url, is_active, last_login, created_at"

// FindByEmail returns an owner by email.
func (r *Repository) FindByEmail(ctx context.Context, email string) (*Owner, error) {
	row := r.pool.QueryRow(ctx, "SELECT "+ownerColumns+" FROM map_listing_owners WHERE email = $1", email)
	return scanOwner(row)
}

// FindByPhone returns an owner by phone.
func (r *Repository) FindByPhone(ctx context.Context, phone string) (*Owner, error) {
	row := r.pool.QueryRow(ctx, "SELECT "+ownerColumns+" FROM map_listing_owners WHERE phone = $1", phone)
	return scanOwner(row)
}

// FindByID returns an owner by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*Owner, error) {
	row := r.pool.QueryRow(ctx, "SELECT "+ownerColumns+" FROM map_listing_owners WHERE id = $1", id)
	return scanOwner(row)
}

// Create creates a new owner.
func (r *Repository) Create(ctx context.Context, o *Owner) (*Owner, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO map_listing_owners (phone, email, name, password_hash, avatar_url, is_active, last_login)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+ownerColumns,
		o.Phone, o.Email, o.Name, o.PasswordHash, o.AvatarURL, o.IsActive, o.LastLogin,
	)
	return scanOwner(row)
}

// UpsertByPhone creates or updates an owner by phone.
func (r *Repository) UpsertByPhone(ctx context.Context, phone string, lastLogin time.Time) (*Owner, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO map_listing_owners (phone, last_login, is_active)
		VALUES ($1, $2, true)
		ON CONFLICT (phone) DO UPDATE SET last_login = $2, is_active = true, updated_at = NOW()
		RETURNING `+ownerColumns,
		phone, lastLogin,
	)
	return scanOwner(row)
}

// UpdateLastLogin updates the last login timestamp.
func (r *Repository) UpdateLastLogin(ctx context.Context, id string, lastLogin time.Time) error {
	_, err := r.pool.Exec(ctx, "UPDATE map_listing_owners SET last_login = $1, updated_at = NOW() WHERE id = $2", lastLogin, id)
	if err != nil {
		return errors.Internal("update_last_login_failed", err)
	}
	return nil
}

// UpdatePassword updates the password hash.
func (r *Repository) UpdatePassword(ctx context.Context, id string, passwordHash string) error {
	_, err := r.pool.Exec(ctx, "UPDATE map_listing_owners SET password_hash = $1, updated_at = NOW() WHERE id = $2", passwordHash, id)
	if err != nil {
		return errors.Internal("update_password_failed", err)
	}
	return nil
}

// CountRecentOtpCodes counts recent OTP codes for a phone.
func (r *Repository) CountRecentOtpCodes(ctx context.Context, phone, purpose string, since time.Time) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM portal_otp_codes
		WHERE phone = $1 AND purpose = $2 AND created_at >= $3
	`, phone, purpose, since).Scan(&count)
	if err != nil {
		return 0, errors.Internal("count_otp_failed", err)
	}
	return count, nil
}

// InvalidatePreviousOtpCodes marks previous unverified codes as consumed.
func (r *Repository) InvalidatePreviousOtpCodes(ctx context.Context, phone, purpose string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE portal_otp_codes SET verified = true
		WHERE phone = $1 AND purpose = $2 AND verified = false AND expires_at > NOW()
	`, phone, purpose)
	if err != nil {
		return errors.Internal("invalidate_otp_failed", err)
	}
	return nil
}

// CreateOtpCode creates a new OTP code.
func (r *Repository) CreateOtpCode(ctx context.Context, phone, codeHash, purpose string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO portal_otp_codes (phone, code_hash, purpose, expires_at)
		VALUES ($1, $2, $3, $4)
	`, phone, codeHash, purpose, expiresAt)
	if err != nil {
		return errors.Internal("create_otp_failed", err)
	}
	return nil
}

// FindLatestValidOtpCode finds the latest valid unverified OTP code.
func (r *Repository) FindLatestValidOtpCode(ctx context.Context, phone, purpose string) (*OtpCode, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, phone, code_hash, purpose, verified, attempts, expires_at, created_at
		FROM portal_otp_codes
		WHERE phone = $1 AND purpose = $2 AND verified = false AND expires_at > NOW()
		ORDER BY created_at DESC LIMIT 1
	`, phone, purpose)
	return scanOtpCode(row)
}

// IncrementOtpAttempts increments the attempt count for an OTP code.
func (r *Repository) IncrementOtpAttempts(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, "UPDATE portal_otp_codes SET attempts = attempts + 1 WHERE id = $1", id)
	if err != nil {
		return errors.Internal("increment_otp_attempts_failed", err)
	}
	return nil
}

// MarkOtpVerified marks an OTP code as verified.
func (r *Repository) MarkOtpVerified(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, "UPDATE portal_otp_codes SET verified = true WHERE id = $1", id)
	if err != nil {
		return errors.Internal("mark_otp_verified_failed", err)
	}
	return nil
}

func scanOwner(row pgx.Row) (*Owner, error) {
	var o Owner
	var phone, email, name, passwordHash, avatarURL sql.NullString
	var lastLogin sql.NullTime
	err := row.Scan(&o.ID, &phone, &email, &name, &passwordHash, &avatarURL, &o.IsActive, &lastLogin, &o.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_owner_failed", err)
	}
	o.Phone = nullStringPtr(phone)
	o.Email = nullStringPtr(email)
	o.Name = nullStringPtr(name)
	o.PasswordHash = nullStringPtr(passwordHash)
	o.AvatarURL = nullStringPtr(avatarURL)
	o.LastLogin = nullTimePtr(lastLogin)
	return &o, nil
}

func scanOtpCode(row pgx.Row) (*OtpCode, error) {
	var oc OtpCode
	err := row.Scan(&oc.ID, &oc.Phone, &oc.CodeHash, &oc.Purpose, &oc.Verified, &oc.Attempts, &oc.ExpiresAt, &oc.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_otp_code_failed", err)
	}
	return &oc, nil
}

func nullStringPtr(s sql.NullString) *string {
	if !s.Valid || s.String == "" {
		return nil
	}
	return &s.String
}

func nullTimePtr(t sql.NullTime) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

// HashPassword hashes a password using bcrypt.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}

// CheckPassword checks if a password matches a hash.
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
