package audit

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes audit HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a new audit handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the audit endpoints under the provided router.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/audit")
	g.Use(middleware.RequireAuth(h.cfg))

	g.Get("/events", h.GetRecentEvents)
	g.Get("/sessions/me", h.GetMySessions)
	g.Get("/stats", h.GetStats)
	g.Get("/active-count", h.GetActiveCount)
}

// GetRecentEvents returns recent login/logout events.
func (h *Handler) GetRecentEvents(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 20)
	events, err := h.service.GetRecentEvents(c.UserContext(), limit)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "فشل في جلب البيانات")
	}
	return c.JSON(fiber.Map{
		"success": true,
		"data":    events,
	})
}

// GetMySessions returns the current user's sessions.
func (h *Handler) GetMySessions(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return fiber.NewError(fiber.StatusUnauthorized, "يجب تسجيل الدخول")
	}
	limit := c.QueryInt("limit", 10)
	sessions, err := h.service.GetUserSessions(c.UserContext(), user.ID, limit)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "فشل في جلب الجلسات")
	}
	return c.JSON(fiber.Map{
		"success": true,
		"data":    sessions,
	})
}

// GetStats returns aggregate statistics.
func (h *Handler) GetStats(c *fiber.Ctx) error {
	stats, err := h.service.GetStats(c.UserContext())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "فشل في جلب الإحصائيات")
	}
	return c.JSON(fiber.Map{
		"success": true,
		"data":    stats,
	})
}

// GetActiveCount returns the number of active sessions.
func (h *Handler) GetActiveCount(c *fiber.Ctx) error {
	count, err := h.service.GetActiveSessionsCount(c.UserContext())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "فشل في جلب عدد الجلسات")
	}
	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"activeSessions": count,
		},
	})
}
