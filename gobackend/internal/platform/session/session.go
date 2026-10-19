// Package session provides server-side session management for refresh tokens.
// Sessions are stored in Redis (with in-memory fallback) and support rotation,
// revocation, family-wide invalidation, reuse detection and an absolute
// lifetime cap on top of the sliding idle expiry.
package session

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// Default idle TTL (7 days) — renewed on every use.
	DefaultTTL = 168 * time.Hour

	// Default absolute cap (30 days) from family creation regardless of activity.
	DefaultAbsoluteTTL = 720 * time.Hour

	// Default rotation grace window (60s).
	DefaultGrace = 60 * time.Second

	// Redis key prefix for individual sessions.
	sessionKeyPrefix = "session:"

	// Redis key prefix for the user→sessions index (set of session IDs).
	userSessionsKeyPrefix = "user_sessions:"

	// refresh_token:<sha256> → family id. This index survives rotation of the
	// owning session and is what lets reuse detection resolve a dead token
	// back to its family.
	refreshTokenKeyPrefix = "refresh_token:"

	// session_family:<family id> → id of the family's live session.
	familyKeyPrefix = "session_family:"
)

// Session represents a server-side session record.
type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	ShopID    string    `json:"shop_id,omitempty"`
	DeviceID  string    `json:"device_id,omitempty"`
	IssuedAt  time.Time `json:"issued_at"`
	ExpiresAt time.Time `json:"expires_at"`
	LastUsed  time.Time `json:"last_used"`

	// FamilyID groups every generation of one login. Rotation keeps the
	// family; detected reuse kills it entirely.
	FamilyID string `json:"family_id,omitempty"`
	// CreatedAt is the family birth time and anchors the absolute TTL.
	// It is copied verbatim across rotations.
	CreatedAt time.Time `json:"created_at,omitempty"`

	// SHA-256 hex digests of the current and previous refresh tokens.
	CurrentTokenHash  string    `json:"current_token_hash,omitempty"`
	PreviousTokenHash string    `json:"previous_token_hash,omitempty"`
	RotatedAt         time.Time `json:"rotated_at,omitempty"`
}

// Store manages server-side sessions.
type Store struct {
	client redis.UniversalClient
	ttl    time.Duration
	abs    time.Duration
	grace  time.Duration

	// In-memory fallback used when no Redis client is configured (single-
	// instance dev/test). Without it every refresh would fail with
	// "session_expired" and log users out after the access token expires.
	memMu     sync.Mutex
	memStore  map[string]*Session
	memFamily map[string]string    // familyID → current sessionID
	memTokens map[string]string    // refresh token hash → familyID
	memTokenT map[string]time.Time // hash → index expiry
}

// NewStore creates a session store backed by Redis. If client is nil, an
// in-memory store is used (suitable for single-instance dev/test).
// ttl is the sliding idle expiry, absoluteTTL the hard cap measured from
// family creation, grace the post-rotation window during which the previous
// refresh token remains acceptable.
func NewStore(client redis.UniversalClient, ttl, absoluteTTL, grace time.Duration) *Store {
	if ttl <= 0 {
		ttl = DefaultTTL
	}
	if absoluteTTL <= 0 {
		absoluteTTL = DefaultAbsoluteTTL
	}
	if grace <= 0 {
		grace = DefaultGrace
	}
	return &Store{
		client:    client,
		ttl:       ttl,
		abs:       absoluteTTL,
		grace:     grace,
		memStore:  make(map[string]*Session),
		memFamily: make(map[string]string),
		memTokens: make(map[string]string),
		memTokenT: make(map[string]time.Time),
	}
}

// Grace returns the configured post-rotation grace window.
func (s *Store) Grace() time.Duration { return s.grace }

// expiryFor computes the effective expiry of a session: the earlier of the
// sliding idle deadline and the family's absolute deadline.
func (s *Store) expiryFor(sess *Session, from time.Time) time.Time {
	idle := from.Add(s.ttl)
	if sess.CreatedAt.IsZero() {
		return idle
	}
	absolute := sess.CreatedAt.Add(s.abs)
	if absolute.Before(idle) {
		return absolute
	}
	return idle
}

func (s *Store) expired(sess *Session, now time.Time) bool {
	if now.After(sess.ExpiresAt) {
		return true
	}
	if !sess.CreatedAt.IsZero() && now.After(sess.CreatedAt.Add(s.abs)) {
		return true
	}
	return false
}

// CreateSession creates a new session for a user and returns the session ID.
// A missing FamilyID/CreatedAt marks the start of a new family (login).
func (s *Store) CreateSession(ctx context.Context, sess *Session) (string, error) {
	if sess.ID == "" {
		sess.ID = generateSessionID()
	}
	now := time.Now().UTC()
	sess.IssuedAt = now
	sess.LastUsed = now
	if sess.CreatedAt.IsZero() {
		sess.CreatedAt = now
	}
	if sess.FamilyID == "" {
		sess.FamilyID = sess.ID
	}
	sess.ExpiresAt = s.expiryFor(sess, now)

	if s.client != nil {
		data, err := json.Marshal(sess)
		if err != nil {
			return "", fmt.Errorf("marshal session: %w", err)
		}
		ttl := time.Until(sess.ExpiresAt)
		if ttl <= 0 {
			return "", fmt.Errorf("session already expired")
		}

		pipe := s.client.TxPipeline()
		pipe.Set(ctx, sessionKeyPrefix+sess.ID, data, ttl)
		pipe.SAdd(ctx, userSessionsKeyPrefix+sess.UserID, sess.ID)
		pipe.Expire(ctx, userSessionsKeyPrefix+sess.UserID, ttl)
		// Family → live session pointer: lets reuse detection find the
		// current generation from a presented token hash alone.
		pipe.Set(ctx, familyKeyPrefix+sess.FamilyID, sess.ID, ttl)
		_, err = pipe.Exec(ctx)
		if err != nil {
			return "", fmt.Errorf("create session: %w", err)
		}
		return sess.ID, nil
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	s.memStore[sess.ID] = sess
	s.memFamily[sess.FamilyID] = sess.ID
	return sess.ID, nil
}

// GetSession retrieves a session by ID (renewing its sliding expiry).
// Returns nil if not found or expired.
func (s *Store) GetSession(ctx context.Context, sessionID string) (*Session, error) {
	if sessionID == "" {
		return nil, nil
	}

	if s.client != nil {
		raw, err := s.client.Get(ctx, sessionKeyPrefix+sessionID).Result()
		if err == redis.Nil {
			return nil, nil
		}
		if err != nil {
			return nil, fmt.Errorf("get session: %w", err)
		}

		var sess Session
		if err := json.Unmarshal([]byte(raw), &sess); err != nil {
			return nil, nil
		}
		now := time.Now().UTC()
		if s.expired(&sess, now) {
			_ = s.deleteSessionRecord(ctx, sessionID, &sess)
			return nil, nil
		}
		// Sliding expiration, capped by the absolute family deadline.
		sess.LastUsed = now
		sess.ExpiresAt = s.expiryFor(&sess, now)
		updated, _ := json.Marshal(sess)
		s.client.Set(ctx, sessionKeyPrefix+sessionID, updated, time.Until(sess.ExpiresAt))

		return &sess, nil
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	sess, ok := s.memStore[sessionID]
	if !ok || s.expired(sess, time.Now().UTC()) {
		delete(s.memStore, sessionID)
		return nil, nil
	}
	// Sliding expiration.
	sess.LastUsed = time.Now().UTC()
	sess.ExpiresAt = s.expiryFor(sess, sess.LastUsed)
	return sess, nil
}

// GetSessionRaw is GetSession without sliding-renewal side effects.
func (s *Store) GetSessionRaw(ctx context.Context, sessionID string) (*Session, error) {
	if sessionID == "" {
		return nil, nil
	}
	if s.client != nil {
		raw, err := s.client.Get(ctx, sessionKeyPrefix+sessionID).Result()
		if err == redis.Nil {
			return nil, nil
		}
		if err != nil {
			return nil, fmt.Errorf("get session: %w", err)
		}
		var sess Session
		if err := json.Unmarshal([]byte(raw), &sess); err != nil {
			return nil, nil
		}
		if s.expired(&sess, time.Now().UTC()) {
			return nil, nil
		}
		return &sess, nil
	}
	s.memMu.Lock()
	defer s.memMu.Unlock()
	sess, ok := s.memStore[sessionID]
	if !ok || s.expired(sess, time.Now().UTC()) {
		return nil, nil
	}
	cp := *sess
	return &cp, nil
}

// deleteSessionRecord removes the record and its user-index entry (Redis path).
func (s *Store) deleteSessionRecord(ctx context.Context, sessionID string, sess *Session) error {
	if s.client == nil {
		return s.DeleteSession(ctx, sessionID)
	}
	pipe := s.client.TxPipeline()
	pipe.Del(ctx, sessionKeyPrefix+sessionID)
	if sess != nil {
		pipe.SRem(ctx, userSessionsKeyPrefix+sess.UserID, sessionID)
		// Only clear the family pointer if it still targets this record —
		// a newer generation may already have replaced it.
		cur, err := s.client.Get(ctx, familyKeyPrefix+sess.FamilyID).Result()
		if err == nil && cur == sessionID {
			pipe.Del(ctx, familyKeyPrefix+sess.FamilyID)
		}
	}
	_, err := pipe.Exec(ctx)
	return err
}

// DeleteSession removes a session by ID.
func (s *Store) DeleteSession(ctx context.Context, sessionID string) error {
	if sessionID == "" {
		return nil
	}

	if s.client != nil {
		sess, _ := s.GetSessionRaw(ctx, sessionID)
		if err := s.deleteSessionRecord(ctx, sessionID, sess); err != nil {
			return fmt.Errorf("delete session: %w", err)
		}
		return nil
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	if sess, ok := s.memStore[sessionID]; ok {
		if cur, ok := s.memFamily[sess.FamilyID]; ok && cur == sessionID {
			delete(s.memFamily, sess.FamilyID)
		}
	}
	delete(s.memStore, sessionID)
	return nil
}

// DeleteAllUserSessions removes all sessions for a user (used on password
// change, reset, and logout-all).
func (s *Store) DeleteAllUserSessions(ctx context.Context, userID string) (int, error) {
	if userID == "" {
		return 0, nil
	}

	if s.client != nil {
		// Get all session IDs for the user.
		ids, err := s.client.SMembers(ctx, userSessionsKeyPrefix+userID).Result()
		if err != nil {
			return 0, fmt.Errorf("get user sessions: %w", err)
		}

		if len(ids) == 0 {
			return 0, nil
		}

		// Delete each session.
		pipe := s.client.TxPipeline()
		for _, id := range ids {
			pipe.Del(ctx, sessionKeyPrefix+id)
		}
		pipe.Del(ctx, userSessionsKeyPrefix+userID)
		_, err = pipe.Exec(ctx)
		if err != nil {
			return 0, fmt.Errorf("delete user sessions: %w", err)
		}
		return len(ids), nil
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	count := 0
	for id, sess := range s.memStore {
		if sess.UserID == userID {
			delete(s.memStore, id)
			if cur, ok := s.memFamily[sess.FamilyID]; ok && cur == id {
				delete(s.memFamily, sess.FamilyID)
			}
			count++
		}
	}
	return count, nil
}

// SetTokenHash records the SHA-256 hash of the freshly issued refresh token
// as the session's current hash and maintains the hash → family lookup index
// that reuse detection depends on. The old current hash is demoted to
// "previous" so a racing tab presenting it still lands in the grace window.
func (s *Store) SetTokenHash(ctx context.Context, sessionID, hash string) error {
	if sessionID == "" || hash == "" {
		return nil
	}

	if s.client != nil {
		sess, err := s.GetSessionRaw(ctx, sessionID)
		if err != nil || sess == nil {
			return fmt.Errorf("set token hash: session not found")
		}
		hadPrevious := sess.CurrentTokenHash != ""
		sess.PreviousTokenHash = sess.CurrentTokenHash
		sess.CurrentTokenHash = hash
		if hadPrevious || sess.RotatedAt.IsZero() {
			sess.RotatedAt = time.Now().UTC()
		}
		data, _ := json.Marshal(sess)
		ttl := time.Until(sess.ExpiresAt)
		if ttl <= 0 {
			return fmt.Errorf("session expired")
		}

		pipe := s.client.TxPipeline()
		pipe.Set(ctx, sessionKeyPrefix+sessionID, data, ttl)
		// The index stays alive for the session's lifetime so an old token
		// can always be resolved back to its family — even after its own
		// session record has been rotated away.
		pipe.Set(ctx, refreshTokenKeyPrefix+hash, sess.FamilyID, ttl)
		_, err = pipe.Exec(ctx)
		return err
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	sess, ok := s.memStore[sessionID]
	if !ok {
		return fmt.Errorf("set token hash: session not found")
	}
	hadPrevious := sess.CurrentTokenHash != ""
	sess.PreviousTokenHash = sess.CurrentTokenHash
	sess.CurrentTokenHash = hash
	if hadPrevious || sess.RotatedAt.IsZero() {
		sess.RotatedAt = time.Now().UTC()
	}
	s.memTokens[hash] = sess.FamilyID
	s.memTokenT[hash] = sess.ExpiresAt
	return nil
}

// LookupTokenHash resolves a presented refresh token hash to its family id.
// Returns "" when the hash is unknown (legacy token, forged, or index gone).
func (s *Store) LookupTokenHash(ctx context.Context, hash string) (string, error) {
	if hash == "" {
		return "", nil
	}
	if s.client != nil {
		familyID, err := s.client.Get(ctx, refreshTokenKeyPrefix+hash).Result()
		if err == redis.Nil {
			return "", nil
		}
		if err != nil {
			return "", fmt.Errorf("lookup token hash: %w", err)
		}
		return familyID, nil
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	familyID, ok := s.memTokens[hash]
	if !ok {
		return "", nil
	}
	if exp, ok := s.memTokenT[hash]; ok && time.Now().UTC().After(exp) {
		delete(s.memTokens, hash)
		delete(s.memTokenT, hash)
		return "", nil
	}
	return familyID, nil
}

// GetCurrentSession returns the live session a family currently points at.
func (s *Store) GetCurrentSession(ctx context.Context, familyID string) (*Session, error) {
	if familyID == "" {
		return nil, nil
	}
	var currentID string
	if s.client != nil {
		id, err := s.client.Get(ctx, familyKeyPrefix+familyID).Result()
		if err == redis.Nil {
			return nil, nil
		}
		if err != nil {
			return nil, fmt.Errorf("get family current: %w", err)
		}
		currentID = id
	} else {
		s.memMu.Lock()
		id, ok := s.memFamily[familyID]
		s.memMu.Unlock()
		if !ok {
			return nil, nil
		}
		currentID = id
	}
	return s.GetSession(ctx, currentID)
}

// RotateSession creates the next generation of a session inside the same
// family and deletes the old record. The family id and the absolute-TTL
// anchor (CreatedAt) carry over; PreviousTokenHash is pre-seeded from the
// old current hash so a racing tab presenting the old token matches the
// grace path even before the new token hash is bound.
func (s *Store) RotateSession(ctx context.Context, oldSessionID string) (*Session, string, error) {
	old, err := s.GetSessionRaw(ctx, oldSessionID)
	if err != nil {
		return nil, "", err
	}
	if old == nil {
		return nil, "", nil
	}

	now := time.Now().UTC()
	newSess := &Session{
		UserID:            old.UserID,
		Email:             old.Email,
		Role:              old.Role,
		ShopID:            old.ShopID,
		DeviceID:          old.DeviceID,
		FamilyID:          old.FamilyID,
		CreatedAt:         old.CreatedAt,
		PreviousTokenHash: old.CurrentTokenHash,
		RotatedAt:         now,
	}

	newID, err := s.CreateSession(ctx, newSess)
	if err != nil {
		return nil, "", err
	}
	// The old record dies immediately — only its hash index (written by
	// SetTokenHash) survives, pointing at the family for reuse detection.
	_ = s.DeleteSession(ctx, oldSessionID)

	return newSess, newID, nil
}

// DeleteSessionFamily revokes every credential of one login: the live
// session, its hash indexes and the family pointer. Called on detected
// refresh-token reuse (proven theft) and on family-wide logout.
func (s *Store) DeleteSessionFamily(ctx context.Context, familyID string) error {
	if familyID == "" {
		return nil
	}

	cur, err := s.GetCurrentSession(ctx, familyID)
	if err != nil {
		return err
	}

	if s.client != nil {
		pipe := s.client.TxPipeline()
		if cur != nil {
			pipe.Del(ctx, sessionKeyPrefix+cur.ID)
			pipe.SRem(ctx, userSessionsKeyPrefix+cur.UserID, cur.ID)
			if cur.CurrentTokenHash != "" {
				pipe.Del(ctx, refreshTokenKeyPrefix+cur.CurrentTokenHash)
			}
			if cur.PreviousTokenHash != "" {
				pipe.Del(ctx, refreshTokenKeyPrefix+cur.PreviousTokenHash)
			}
		}
		pipe.Del(ctx, familyKeyPrefix+familyID)
		_, err := pipe.Exec(ctx)
		return err
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	if cur != nil {
		delete(s.memStore, cur.ID)
		if cur.CurrentTokenHash != "" {
			delete(s.memTokens, cur.CurrentTokenHash)
			delete(s.memTokenT, cur.CurrentTokenHash)
		}
		if cur.PreviousTokenHash != "" {
			delete(s.memTokens, cur.PreviousTokenHash)
			delete(s.memTokenT, cur.PreviousTokenHash)
		}
	}
	delete(s.memFamily, familyID)
	return nil
}

// generateSessionID creates a cryptographically random session ID.
func generateSessionID() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// SessionIDFromToken extracts the session ID from a token string.
// The session ID is embedded in the JWT as a custom claim.
func SessionIDFromToken(tokenStr string) string {
	// The session ID is stored as the JWT ID (jti) claim.
	// This is a helper for the auth domain.
	return strings.TrimSpace(tokenStr)
}




