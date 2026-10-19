package middleware

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

const (
	idempotencyHeader       = "X-Idempotency-Key"
	idempotencyTTL          = 24 * time.Hour
	idempotencyRedisPrefix  = "idempotency:"
	idempotencyCleanupEvery = 1 * time.Hour
)

// IdempotencyStore is a distributed-or-local cache for idempotency records.
type IdempotencyStore struct {
	mu      sync.RWMutex
	memory  map[string]idempotencyRecord
	redis   redis.UniversalClient
	enabled bool
}

type idempotencyRecord struct {
	Status      int       `json:"status"`
	Body        []byte    `json:"body"`
	ContentType string    `json:"content_type"`
	CreatedAt   time.Time `json:"created_at"`
}

// NewIdempotencyStore creates an idempotency store backed by Redis when
// available, otherwise an in-memory map with periodic cleanup.
func NewIdempotencyStore(client redis.UniversalClient) *IdempotencyStore {
	s := &IdempotencyStore{
		memory:  make(map[string]idempotencyRecord),
		redis:   client,
		enabled: true,
	}

	if client == nil {
		go s.cleanupLoop()
	}
	return s
}

// Middleware returns a Fiber middleware that replays cached responses for
// repeated idempotency keys and caches successful responses.
func (s *IdempotencyStore) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		key := strings.TrimSpace(c.Get(idempotencyHeader))
		if key == "" {
			return c.Next()
		}

		method := strings.ToUpper(c.Method())
		if method != "POST" && method != "PUT" && method != "PATCH" {
			return c.Next()
		}

		// Try replay.
		rec, found, err := s.get(c.UserContext(), key)
		if err != nil {
			// Redis failure: fall through to avoid blocking the request.
		}
		if found {
			c.Set("Content-Type", rec.ContentType)
			c.Set("X-Idempotency-Replay", "true")
			return c.Status(rec.Status).Send(rec.Body)
		}

		// Execute handler and cache successful responses.
		err = c.Next()
		if err != nil {
			return err
		}

		status := c.Response().StatusCode()
		if status >= 200 && status < 400 {
			body := append([]byte{}, c.Response().Body()...)
			contentType := string(c.Response().Header.ContentType())
			if err := s.set(c.UserContext(), key, idempotencyRecord{
				Status:      status,
				Body:        body,
				ContentType: contentType,
				CreatedAt:   time.Now(),
			}); err != nil {
				// Best-effort caching failure is not fatal.
			}
		}

		return nil
	}
}

func (s *IdempotencyStore) get(ctx context.Context, key string) (idempotencyRecord, bool, error) {
	if s.redis != nil {
		raw, err := s.redis.Get(ctx, idempotencyRedisPrefix+key).Result()
		if err == redis.Nil {
			return idempotencyRecord{}, false, nil
		}
		if err != nil {
			return idempotencyRecord{}, false, err
		}
		var rec idempotencyRecord
		if err := json.Unmarshal([]byte(raw), &rec); err != nil {
			return idempotencyRecord{}, false, err
		}
		return rec, true, nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.memory[key]
	if !ok || time.Since(rec.CreatedAt) > idempotencyTTL {
		return idempotencyRecord{}, false, nil
	}
	return rec, true, nil
}

func (s *IdempotencyStore) set(ctx context.Context, key string, rec idempotencyRecord) error {
	if s.redis != nil {
		data, err := json.Marshal(rec)
		if err != nil {
			return err
		}
		return s.redis.Set(ctx, idempotencyRedisPrefix+key, data, idempotencyTTL).Err()
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.memory[key] = rec
	return nil
}

func (s *IdempotencyStore) cleanupLoop() {
	ticker := time.NewTicker(idempotencyCleanupEvery)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for k, rec := range s.memory {
			if now.Sub(rec.CreatedAt) > idempotencyTTL {
				delete(s.memory, k)
			}
		}
		s.mu.Unlock()
	}
}
