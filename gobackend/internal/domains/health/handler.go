package health

import (
	"context"
	"sync"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/redis"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// Handler exposes monitoring and health endpoints.
type Handler struct {
	db     *db.Pool
	redis  *redis.Client
	logger *zap.Logger

	// schema caching. VerifySchema is a single cheap catalog query, but
	// readiness probes can fire every second from multiple replicas, so a
	// positive result is cached briefly while failures are always re-checked
	// (so running migrations recovers readiness without a restart).
	schemaMu       sync.Mutex
	schemaVerified time.Time
}

// schemaCacheTTL is how long a successful schema verification is trusted.
const schemaCacheTTL = 30 * time.Second

// NewHandler creates a health handler.
func NewHandler(pool *db.Pool, redisClient *redis.Client, logger *zap.Logger) *Handler {
	return &Handler{db: pool, redis: redisClient, logger: logger}
}

// verifySchema reports whether the public schema contains the tables the API
// needs. A successful check is cached for schemaCacheTTL; failures are never
// cached so a later migration flips readiness back to green automatically.
func (h *Handler) verifySchema(ctx context.Context) error {
	h.schemaMu.Lock()
	if !h.schemaVerified.IsZero() && time.Since(h.schemaVerified) < schemaCacheTTL {
		h.schemaMu.Unlock()
		return nil
	}
	h.schemaMu.Unlock()

	err := h.db.VerifySchema(ctx)

	h.schemaMu.Lock()
	if err == nil {
		h.schemaVerified = time.Now()
	} else {
		h.schemaVerified = time.Time{}
	}
	h.schemaMu.Unlock()

	return err
}

// RegisterRoutes registers /monitoring/* routes.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/monitoring")
	g.Get("/live", h.Live)
	g.Get("/ready", h.Ready)
	g.Get("/health", h.Live)
}

// Live returns a lightweight liveness probe.
func (h *Handler) Live(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
		"time":   time.Now().UTC(),
	})
}

// Ready checks database and Redis connectivity.
func (h *Handler) Ready(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.UserContext(), 5*time.Second)
	defer cancel()

	checks := fiber.Map{
		"database": "ok",
		"redis":    "ok",
		"schema":   "ok",
	}
	status := fiber.StatusOK

	// A nil pool means DATABASE_URL was never provided or the connection failed
	// at boot. Reporting "degraded" here is essential: returning 200 while every
	// query fails hides the real cause behind opaque 500 "internal server error"
	// responses.
	if h.db == nil {
		checks["database"] = "not_configured"
		checks["schema"] = "unknown"
		status = fiber.StatusServiceUnavailable
		h.logger.Error("database readiness check failed: no connection pool (DATABASE_URL missing or invalid)")
	} else if err := h.db.Ping(ctx); err != nil {
		checks["database"] = "unavailable"
		checks["schema"] = "unknown"
		status = fiber.StatusServiceUnavailable
		h.logger.Error("database readiness check failed", zap.Error(err))
	} else if err := h.verifySchema(ctx); err != nil {
		// The connection is alive but migrations were never applied (a classic
		// symptom of pointing a fresh Supabase project at this API). Without
		// this check readiness reports 200 while every request 500s.
		checks["schema"] = "incomplete"
		status = fiber.StatusServiceUnavailable
		h.logger.Error("database schema readiness check failed", zap.Error(err),
			zap.String("fix", "set DB_MIGRATE_ON_BOOT=true (or run: go run scripts/migrate.go up)"))
	}

	if h.redis == nil {
		checks["redis"] = "not_configured"
	} else if !h.redis.IsHealthy(ctx) {
		checks["redis"] = "unavailable"
		status = fiber.StatusServiceUnavailable
		h.logger.Error("redis readiness check failed")
	}

	return c.Status(status).JSON(fiber.Map{
		"status": map[bool]string{true: "ok", false: "degraded"}[status == fiber.StatusOK],
		"checks": checks,
		"time":   time.Now().UTC(),
	})
}
