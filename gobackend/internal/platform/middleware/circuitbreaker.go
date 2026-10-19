package middleware

import (
	"sync"
	"sync/atomic"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// Circuit breaker states.
const (
	cbClosed   int32 = 0
	cbOpen     int32 = 1
	cbHalfOpen int32 = 2
)

// CircuitBreaker protects the service from cascading failures by tripping open
// after a configurable number of consecutive 5xx responses, then letting a
// limited number of trial requests through (half-open) before resetting.
//
// Defaults: 5 failures to open, 30s open timeout, 3 half-open trials.
type CircuitBreaker struct {
	state        atomic.Int32
	failures     atomic.Int32
	halfOpenUsed atomic.Int32

	mu sync.Mutex

	failThreshold int
	openTimeout   time.Duration
	halfOpenMax   int

	openedAt atomic.Int64 // unix nano
}

// NewCircuitBreaker constructs a breaker with sensible defaults.
func NewCircuitBreaker() *CircuitBreaker {
	return &CircuitBreaker{
		failThreshold: 5,
		openTimeout:   30 * time.Second,
		halfOpenMax:   3,
	}
}

// Middleware returns the Fiber handler. The breaker counts 5xx responses
// emitted by downstream handlers; 4xx and successful responses reset the
// failure counter.
func (cb *CircuitBreaker) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Fast path: closed. Just continue and inspect the response after.
		if cb.state.Load() == cbClosed {
			err := c.Next()
			cb.observe(c)
			return err
		}

		// Otherwise check whether we may admit the request.
		if !cb.admit() {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success": false,
				"error":   "service_unavailable",
				"message": "الخدمة غير متاحة مؤقتاً، حاول مرة أخرى بعد لحظات.",
			})
		}

		err := c.Next()
		cb.observe(c)
		return err
	}
}

// admit returns true when a request may pass through an open/half-open breaker.
func (cb *CircuitBreaker) admit() bool {
	state := cb.state.Load()
	switch state {
	case cbOpen:
		// Transition to half-open once the cooldown has elapsed.
		openedAt := time.Unix(0, cb.openedAt.Load())
		if time.Since(openedAt) >= cb.openTimeout {
			cb.mu.Lock()
			defer cb.mu.Unlock()
			if cb.state.CompareAndSwap(cbOpen, cbHalfOpen) {
				cb.failures.Store(0)
				cb.halfOpenUsed.Store(0)
				zap.L().Warn("circuit breaker: open -> half-open")
			}
			return cb.tryHalfOpen()
		}
		return false
	case cbHalfOpen:
		return cb.tryHalfOpen()
	default:
		return true
	}
}

// tryHalfOpen consumes one of the half-open trial slots.
func (cb *CircuitBreaker) tryHalfOpen() bool {
	if cb.halfOpenUsed.Add(1) > int32(cb.halfOpenMax) {
		// Too many concurrent trials; reject to keep the trial count bounded.
		cb.halfOpenUsed.Add(-1)
		return false
	}
	return true
}

// observe updates breaker state based on the response status code.
func (cb *CircuitBreaker) observe(c *fiber.Ctx) {
	status := c.Response().StatusCode()
	if status < 500 {
		// Success or client error: reset failures and close if we were half-open.
		cb.failures.Store(0)
		if cb.state.CompareAndSwap(cbHalfOpen, cbClosed) {
			zap.L().Info("circuit breaker: half-open -> closed")
		}
		return
	}

	// 5xx: count as a failure.
	fails := cb.failures.Add(1)
	if cb.state.Load() == cbHalfOpen {
		// A failure during half-open reopens the breaker immediately.
		cb.trip()
		zap.L().Warn("circuit breaker: half-open -> open (trial failed)",
			zap.Int("status", status), zap.String("path", c.Path()))
		return
	}

	if fails >= int32(cb.failThreshold) {
		cb.trip()
		zap.L().Warn("circuit breaker: closed -> open",
			zap.Int32("failures", fails),
			zap.Int("threshold", cb.failThreshold),
			zap.String("path", c.Path()),
		)
	}
}

// trip moves the breaker into the open state and records the trip time.
func (cb *CircuitBreaker) trip() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	if cb.state.CompareAndSwap(cbClosed, cbOpen) || cb.state.CompareAndSwap(cbHalfOpen, cbOpen) {
		cb.openedAt.Store(time.Now().UnixNano())
	}
}
