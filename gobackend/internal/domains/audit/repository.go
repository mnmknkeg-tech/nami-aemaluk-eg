package audit

import (
	"context"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
)

// Repository handles persistence of audit events.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new audit repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// LoginAudit represents a user login session record.
type LoginAudit struct {
	ID           string    `db:"id"`
	UserID       string    `db:"user_id"`
	UserEmail    string    `db:"user_email"`
	UserRole     string    `db:"user_role"`
	LoginAt      time.Time `db:"login_at"`
	LogoutAt     *time.Time `db:"logout_at"`
	DurationMin  *int      `db:"duration_min"`
	IPAddress    string    `db:"ip_address"`
	UserAgent    string    `db:"user_agent"`
	SessionToken string    `db:"session_token"`
	CreatedAt    time.Time `db:"created_at"`
}

// InsertLoginEvent records a new login event and returns its ID.
func (r *Repository) InsertLoginEvent(ctx context.Context, userID, email, role, ip, userAgent, token string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, `
		INSERT INTO audit_login_events (user_id, user_email, user_role, ip_address, user_agent, session_token, login_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id
	`, userID, email, role, ip, userAgent, token).Scan(&id)
	return id, err
}

// UpdateLogoutEvent updates the audit record with logout time and duration.
func (r *Repository) UpdateLogoutEvent(ctx context.Context, token string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE audit_login_events
		SET logout_at = NOW(),
		    duration_min = EXTRACT(EPOCH FROM (NOW() - login_at))::int / 60
		WHERE session_token = $1 AND logout_at IS NULL
	`, token)
	return err
}

// GetRecentLoginEvents returns the most recent login events.
func (r *Repository) GetRecentLoginEvents(ctx context.Context, limit int) ([]LoginAudit, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, user_email, user_role, login_at, logout_at, duration_min,
		       ip_address, user_agent, session_token, created_at
		FROM audit_login_events
		ORDER BY login_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []LoginAudit
	for rows.Next() {
		var e LoginAudit
		if err := rows.Scan(&e.ID, &e.UserID, &e.UserEmail, &e.UserRole, &e.LoginAt,
			&e.LogoutAt, &e.DurationMin, &e.IPAddress, &e.UserAgent, &e.SessionToken, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

// GetUserSessions returns login events for a specific user.
func (r *Repository) GetUserSessions(ctx context.Context, userID string, limit int) ([]LoginAudit, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, user_email, user_role, login_at, logout_at, duration_min,
		       ip_address, user_agent, session_token, created_at
		FROM audit_login_events
		WHERE user_id = $1
		ORDER BY login_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []LoginAudit
	for rows.Next() {
		var e LoginAudit
		if err := rows.Scan(&e.ID, &e.UserID, &e.UserEmail, &e.UserRole, &e.LoginAt,
			&e.LogoutAt, &e.DurationMin, &e.IPAddress, &e.UserAgent, &e.SessionToken, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

// GetActiveSessionsCount returns the count of currently active (non-logged-out) sessions.
func (r *Repository) GetActiveSessionsCount(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM audit_login_events WHERE logout_at IS NULL
	`).Scan(&count)
	return count, err
}

// GetStats returns aggregate statistics.
func (r *Repository) GetStats(ctx context.Context) (map[string]interface{}, error) {
	var totalLogins int
	var activeSessions int
	var avgDuration float64

	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_login_events`).Scan(&totalLogins)
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_login_events WHERE logout_at IS NULL`).Scan(&activeSessions)
	_ = r.pool.QueryRow(ctx, `SELECT COALESCE(AVG(duration_min), 0) FROM audit_login_events WHERE duration_min IS NOT NULL`).Scan(&avgDuration)

	return map[string]interface{}{
		"totalLogins":     totalLogins,
		"activeSessions":  activeSessions,
		"avgDurationMin":  avgDuration,
	}, nil
}
