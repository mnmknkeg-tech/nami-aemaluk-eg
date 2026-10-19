package consent

import (
	"context"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for user consents.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new consent repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// Upsert inserts or updates a consent record for a user+type combination.
func (r *Repository) Upsert(ctx context.Context, userID, consentType string, granted bool, ip, ua string) (*UserConsent, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	var revokedAt *time.Time
	if !granted {
		revokedAt = &now
	}

	query := `
		INSERT INTO user_consents (id, user_id, consent_type, granted, granted_at, revoked_at, ip_address, user_agent, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id, consent_type) DO UPDATE SET
			granted = EXCLUDED.granted,
			granted_at = EXCLUDED.granted_at,
			revoked_at = EXCLUDED.revoked_at,
			ip_address = EXCLUDED.ip_address,
			user_agent = EXCLUDED.user_agent,
			updated_at = EXCLUDED.updated_at
		RETURNING id, user_id, consent_type, granted, granted_at, revoked_at, ip_address, user_agent, created_at, updated_at
	`

	var c UserConsent
	err := r.pool.QueryRow(ctx, query,
		id, userID, consentType, granted, now, revokedAt, ip, ua, now, now,
	).Scan(
		&c.ID, &c.UserID, &c.ConsentType, &c.Granted, &c.GrantedAt, &c.RevokedAt,
		&c.IPAddress, &c.UserAgent, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert consent: %w", err)
	}
	return &c, nil
}

// FindByUser retrieves all consents for a user.
func (r *Repository) FindByUser(ctx context.Context, userID string) ([]UserConsent, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, consent_type, granted, granted_at, revoked_at, ip_address, user_agent, created_at, updated_at
		FROM user_consents WHERE user_id = $1 ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query consents: %w", err)
	}
	defer rows.Close()

	var result []UserConsent
	for rows.Next() {
		var c UserConsent
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.ConsentType, &c.Granted, &c.GrantedAt, &c.RevokedAt,
			&c.IPAddress, &c.UserAgent, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan consent: %w", err)
		}
		result = append(result, c)
	}
	return result, nil
}

// RevokeByType sets granted=false and revoked_at for a specific user+type.
func (r *Repository) RevokeByType(ctx context.Context, userID, consentType string) (*UserConsent, error) {
	now := time.Now().UTC()
	var c UserConsent
	err := r.pool.QueryRow(ctx, `
		UPDATE user_consents
		SET granted = false, revoked_at = $1, updated_at = $1
		WHERE user_id = $2 AND consent_type = $3
		RETURNING id, user_id, consent_type, granted, granted_at, revoked_at, ip_address, user_agent, created_at, updated_at
	`, now, userID, consentType).Scan(
		&c.ID, &c.UserID, &c.ConsentType, &c.Granted, &c.GrantedAt, &c.RevokedAt,
		&c.IPAddress, &c.UserAgent, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to revoke consent: %w", err)
	}
	return &c, nil
}