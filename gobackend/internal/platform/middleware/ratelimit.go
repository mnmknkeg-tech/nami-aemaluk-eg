package middleware

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"github.com/ulule/limiter/v3"
	"github.com/ulule/limiter/v3/drivers/store/memory"
	sredis "github.com/ulule/limiter/v3/drivers/store/redis"
	"go.uber.org/zap"
)

// RateLimiter wraps an ulule/limiter instance and exposes Fiber middleware.
type RateLimiter struct {
	global  *limiter.Limiter
	auth    *limiter.Limiter
	refresh *limiter.Limiter
	signup  *limiter.Limiter
	// failClosed makes a store error (Redis unreachable) reject the request
	// instead of silently allowing it. Enabled for auth buckets in production
	// so an attacker cannot disable rate limiting by breaking Redis.
	failClosed bool
}

// NewRateLimiter creates the global and auth limiters backed by Redis when
// available, otherwise in-memory.
func NewRateLimiter(cfg *config.Config, client redis.UniversalClient) (*RateLimiter, error) {
	globalStore, err := newStore(client, "rl_global", limiter.Rate{
		Period: cfg.RateLimit.GlobalWindow,
		Limit:  int64(cfg.RateLimit.GlobalMax),
	})
	if err != nil {
		return nil, err
	}

	authStore, err := newStore(client, "rl_auth", limiter.Rate{
		Period: cfg.RateLimit.AuthWindow,
		Limit:  int64(cfg.RateLimit.AuthMax),
	})
	if err != nil {
		return nil, err
	}

	// Dedicated bucket for /auth/refresh — a token-minting endpoint that
	// previously rode the generous global limit (10000/15m).
	refreshStore, err := newStore(client, "rl_refresh", limiter.Rate{
		Period: cfg.RateLimit.RefreshWindow,
		Limit:  int64(cfg.RateLimit.RefreshMax),
	})
	if err != nil {
		return nil, err
	}

	// Dedicated bucket for account creation (signup): a DB-writing endpoint
	// that must stay cheap even for a coordinated IP rotation attack.
	signupStore, err := newStore(client, "rl_signup", limiter.Rate{
		Period: cfg.RateLimit.SignupWindow,
		Limit:  int64(cfg.RateLimit.SignupMax),
	})
	if err != nil {
		return nil, err
	}

	return &RateLimiter{
		global: limiter.New(globalStore, limiter.Rate{
			Period: cfg.RateLimit.GlobalWindow,
			Limit:  int64(cfg.RateLimit.GlobalMax),
		}),
		auth: limiter.New(authStore, limiter.Rate{
			Period: cfg.RateLimit.AuthWindow,
			Limit:  int64(cfg.RateLimit.AuthMax),
		}),
		refresh: limiter.New(refreshStore, limiter.Rate{
			Period: cfg.RateLimit.RefreshWindow,
			Limit:  int64(cfg.RateLimit.RefreshMax),
		}),
		signup: limiter.New(signupStore, limiter.Rate{
			Period: cfg.RateLimit.SignupWindow,
			Limit:  int64(cfg.RateLimit.SignupMax),
		}),
		failClosed: cfg.IsProduction(),
	}, nil
}

// Global middleware applies the global rate limit to every request.
func (rl *RateLimiter) Global() fiber.Handler {
	return rl.handle(rl.global, "global")
}

// Auth middleware applies a stricter rate limit to authentication endpoints.
// /auth/refresh gets its own, tighter budget (AUTH_REFRESH_RATE_LIMIT_MAX
// per window) because it mints fresh tokens. Account creation gets the
// tightest budget of all (AUTH_SIGNUP_RATE_LIMIT_MAX, 5/hour by default).
func (rl *RateLimiter) Auth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Path() == "/api/v1/auth/refresh" {
			return rl.handle(rl.refresh, "refresh")(c)
		}
		if isSignupPath(c.Path()) {
			return rl.handle(rl.signup, "signup")(c)
		}
		if !isAuthPath(c.Path()) {
			return c.Next()
		}
		return rl.handle(rl.auth, "auth")(c)
	}
}

func (rl *RateLimiter) handle(instance *limiter.Limiter, _ string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Key on IP + path so one abusive IP cannot burn the budget of a
		// different endpoint that shares the same limiter bucket.
		ip := c.IP()
		if ip == "" {
			ip = "unknown"
		}
		key := ip + "|" + c.Path()

		ctx, cancel := context.WithTimeout(c.UserContext(), 2*time.Second)
		defer cancel()

		limitCtx, err := instance.Get(ctx, key)
		if err != nil {
			zap.L().Warn("rate limiter error", zap.Error(err), zap.String("path", c.Path()))
			// Fail-closed in production: if the shared store is unreachable we
			// refuse the request rather than hand the attacker free attempts.
			if rl.failClosed {
				return errors.Internal("rate_limiter_unavailable", err)
			}
			return c.Next()
		}

		setRateHeaders(c, limitCtx)

		if limitCtx.Reached {
			retryAfter := time.Until(time.Unix(limitCtx.Reset, 0)).Seconds()
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Set("Retry-After", strconv.Itoa(int(retryAfter)))
			return errors.RateLimit("تم تجاوز عدد الطلبات المسموح به. حاول مرة أخرى لاحقاً.")
		}

		return c.Next()
	}
}

func newStore(client redis.UniversalClient, prefix string, _ limiter.Rate) (limiter.Store, error) {
	if client == nil {
		return memory.NewStore(), nil
	}

	// The ulule redis store expects a concrete *redis.Client. If Redis is
	// running in cluster mode we fall back to the in-memory store for now.
	c, ok := client.(*redis.Client)
	if !ok {
		zap.L().Warn("redis cluster not supported by ulule limiter, falling back to memory store", zap.String("prefix", prefix))
		return memory.NewStore(), nil
	}

	store, err := sredis.NewStoreWithOptions(c, limiter.StoreOptions{
		Prefix: prefix,
	})
	if err != nil {
		return nil, err
	}
	return store, nil
}

func setRateHeaders(c *fiber.Ctx, ctx limiter.Context) {
	c.Set("X-RateLimit-Limit", strconv.FormatInt(ctx.Limit, 10))
	c.Set("X-RateLimit-Remaining", strconv.FormatInt(ctx.Remaining, 10))
	c.Set("X-RateLimit-Reset", time.Unix(ctx.Reset, 0).Format(time.RFC3339))
}

func isSignupPath(path string) bool {
	prefixes := []string{
		"/api/v1/auth/signup",
		"/api/v1/auth/courier-signup",
	}
	path = strings.ToLower(path)
	for _, p := range prefixes {
		if strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}

func isAuthPath(path string) bool {
	prefixes := []string{
		"/api/v1/auth/login",
		"/api/v1/auth/signup",
		"/api/v1/auth/courier-signup",
		"/api/v1/auth/password/forgot",
		"/api/v1/auth/password/reset",
		"/api/v1/auth/bootstrap-admin",
		"/api/v1/auth/google",
		"/api/v1/auth/dev-merchant-login",
		"/api/v1/auth/dev-courier-login",
		"/api/v1/auth/dev-portal-login",
		// 2FA endpoints: brute-force protection on TOTP verification.
		"/api/v1/auth/2fa/verify",
		"/api/v1/auth/2fa/enable",
		"/api/v1/auth/2fa/generate",
		"/api/v1/auth/2fa/confirm",
		"/api/v1/auth/2fa/login",
		"/api/v1/auth/2fa/disable",
	}
	path = strings.ToLower(path)
	for _, p := range prefixes {
		if strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}
