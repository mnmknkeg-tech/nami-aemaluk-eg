package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// SlowDownOptions configures the slow-down middleware.
//
// WindowMs   - rolling window used to count requests per client.
// DelayAfter - number of requests allowed within the window before delays kick in.
// DelayMs    - delay added per excess request.
// MaxDelayMs - upper bound for the computed delay.
type SlowDownOptions struct {
	WindowMs   time.Duration
	DelayAfter int
	DelayMs    time.Duration
	MaxDelayMs time.Duration
}

// SlowDown gently throttles excessive clients by adding an artificial delay
// instead of rejecting their requests. It is intended to sit in front of the
// hard rate limiter so that well-behaved clients are never affected while
// abusive ones are progressively slowed.
type SlowDown struct {
	opts SlowDownOptions
	mu   sync.Mutex
	hits map[string]*slowDownBucket
}

type slowDownBucket struct {
	count    int
	windowStart time.Time
}

// NewSlowDown constructs a SlowDown middleware with the supplied options.
func NewSlowDown(opts SlowDownOptions) *SlowDown {
	if opts.WindowMs <= 0 {
		opts.WindowMs = time.Minute
	}
	if opts.DelayAfter <= 0 {
		opts.DelayAfter = 60
	}
	if opts.DelayMs <= 0 {
		opts.DelayMs = 200 * time.Millisecond
	}
	if opts.MaxDelayMs <= 0 {
		opts.MaxDelayMs = 4 * time.Second
	}
	return &SlowDown{
		opts: opts,
		hits: make(map[string]*slowDownBucket),
	}
}

// Middleware returns the Fiber handler.
func (s *SlowDown) Middleware() fiber.Handler {
	// Background janitor that evicts stale buckets so the map cannot grow
	// unbounded for long-lived processes.
	go s.janitor()

	return func(c *fiber.Ctx) error {
		key := c.IP()
		if key == "" {
			key = "unknown"
		}

		excess := s.record(key)
		if excess <= 0 {
			return c.Next()
		}

		delay := time.Duration(excess) * s.opts.DelayMs
		if delay > s.opts.MaxDelayMs {
			delay = s.opts.MaxDelayMs
		}

		zap.L().Debug("slow-down applied",
			zap.String("ip", key),
			zap.Int("excess", excess),
			zap.Duration("delay", delay),
			zap.String("path", c.Path()),
		)

		if delay > 0 {
			timer := time.NewTimer(delay)
			defer timer.Stop()
			select {
			case <-timer.C:
			case <-c.UserContext().Done():
				return c.UserContext().Err()
			}
		}
		return c.Next()
	}
}

// record increments the per-IP counter and returns the number of requests
// exceeding the configured threshold within the current window.
func (s *SlowDown) record(key string) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	b, ok := s.hits[key]
	if !ok || now.Sub(b.windowStart) > s.opts.WindowMs {
		s.hits[key] = &slowDownBucket{count: 1, windowStart: now}
		return 0
	}
	b.count++
	if b.count <= s.opts.DelayAfter {
		return 0
	}
	return b.count - s.opts.DelayAfter
}

// janitor periodically drops buckets whose window has expired.
func (s *SlowDown) janitor() {
	ticker := time.NewTicker(s.opts.WindowMs)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for k, b := range s.hits {
			if now.Sub(b.windowStart) > s.opts.WindowMs {
				delete(s.hits, k)
			}
		}
		s.mu.Unlock()
	}
}
