package lockout

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Manager tracks failed login attempts per account using Redis.
type Manager struct {
	client redis.UniversalClient
	window time.Duration
	max    int
}

// NewManager creates a lockout manager. If client is nil it falls back to a
// no-op in-process map.
func NewManager(client redis.UniversalClient, window time.Duration, max int) *Manager {
	if client == nil {
		return &Manager{}
	}
	return &Manager{client: client, window: window, max: max}
}

// RecordFailure increments the failure counter for an identifier (email or IP).
func (m *Manager) RecordFailure(ctx context.Context, identifier string) (int, error) {
	if m.client == nil {
		return 0, nil
	}
	key := failureKey(identifier)
	pipe := m.client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, m.window)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, err
	}
	return int(incr.Val()), nil
}

// IsLocked reports whether the identifier is currently rate-locked.
func (m *Manager) IsLocked(ctx context.Context, identifier string) (bool, error) {
	if m.client == nil {
		return false, nil
	}
	val, err := m.client.Get(ctx, failureKey(identifier)).Int()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return val >= m.max, nil
}

// Reset clears the failure counter, e.g. after a successful login.
func (m *Manager) Reset(ctx context.Context, identifier string) error {
	if m.client == nil {
		return nil
	}
	return m.client.Del(ctx, failureKey(identifier)).Err()
}

func failureKey(identifier string) string {
	return fmt.Sprintf("lockout:%s", identifier)
}
