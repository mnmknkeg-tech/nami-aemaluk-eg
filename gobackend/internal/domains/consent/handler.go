package consent

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for user consents.
type Handler struct {
	service *Service
	config  *config.Config
}

// NewHandler creates a new consent handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, config: cfg}
}

// RegisterRoutes registers consent routes under /api/v1.
func (h *Handler) RegisterRoutes(app fiber.Router) {
	g := app.Group("/consent")

	g.Post("/", middleware.RequireAuth(h.config), h.GrantOrRevoke)
	g.Get("/me", middleware.RequireAuth(h.config), h.ListMine)
	g.Patch("/me/:type", middleware.RequireAuth(h.config), h.RevokeByType)
}

// GrantOrRevoke handles POST /api/v1/consent — grant or revoke a consent.
func (h *Handler) GrantOrRevoke(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "error": "غير مصرح"})
	}

	var req ConsentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "طلب غير صالح"})
	}

	if !isValidConsentType(req.ConsentType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "نوع الموافقة غير صالح"})
	}

	ip := c.IP()
	ua := c.Get("User-Agent")

	consent, err := h.service.GrantOrRevoke(c.UserContext(), user.ID, req.ConsentType, req.Granted, ip, ua)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في تسجيل الموافقة"})
	}

	return c.JSON(fiber.Map{"success": true, "data": consent})
}

// ListMine handles GET /api/v1/consent/me — list current user's consents.
func (h *Handler) ListMine(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "error": "غير مصرح"})
	}

	consents, err := h.service.ListByUser(c.UserContext(), user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في جلب الموافقات"})
	}

	return c.JSON(fiber.Map{"success": true, "data": consents})
}

// RevokeByType handles PATCH /api/v1/consent/me/:type — revoke a specific consent.
func (h *Handler) RevokeByType(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "error": "غير مصرح"})
	}

	consentType := c.Params("type")
	if !isValidConsentType(consentType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "نوع الموافقة غير صالح"})
	}

	consent, err := h.service.Revoke(c.UserContext(), user.ID, consentType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في سحب الموافقة"})
	}

	return c.JSON(fiber.Map{"success": true, "data": consent})
}

func isValidConsentType(t string) bool {
	switch t {
	case "privacy_policy", "cookies_analytics", "cookies_marketing", "data_collection", "gps_tracking":
		return true
	default:
		return false
	}
}