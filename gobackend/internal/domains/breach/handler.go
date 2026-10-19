package breach

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for breach incidents.
type Handler struct {
	service *Service
	config  *config.Config
}

// NewHandler creates a new breach handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, config: cfg}
}

// RegisterRoutes registers breach routes under /api/v1.
func (h *Handler) RegisterRoutes(app fiber.Router) {
	g := app.Group("/breach")

	adminAuth := []fiber.Handler{middleware.RequireAuth(h.config), middleware.RequireRole(middleware.RoleAdmin)}

	g.Post("/", append(adminAuth, h.Create)...)
	g.Get("/", append(adminAuth, h.ListAll)...)
	g.Patch("/:id", append(adminAuth, h.UpdateStatus)...)

	// Public banner state consumed by the shared BreachNotice component — no
	// auth so storefront visitors learn about unresolved incidents.
	app.Get("/breach-status", h.PublicStatus)
}

// PublicStatus handles GET /api/v1/breach-status.
// Returns top-level {active, url} (the frontend reads these fields directly).
func (h *Handler) PublicStatus(c *fiber.Ctx) error {
	ctx := c.UserContext()
	active := false
	url := ""

	incidents, err := h.service.ListAll(ctx)
	if err == nil {
		for _, inc := range incidents {
			if inc.Status != "resolved" {
				active = true
				if strings.TrimSpace(inc.Description) != "" {
					url = strings.TrimSpace(inc.Description)
				}
				break
			}
		}
	}

	return c.JSON(fiber.Map{"active": active, "url": url})
}

// Create handles POST /api/v1/breach — create a breach incident (admin).
func (h *Handler) Create(c *fiber.Ctx) error {
	var req CreateBreachRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "طلب غير صالح"})
	}

	if !isValidSeverity(req.Severity) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "درجة الخطورة غير صالحة"})
	}

	breach, err := h.service.Create(c.UserContext(), req.Title, req.Description, req.Severity, req.AffectedUsersCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في إنشاء بلاغ الاختراق"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": breach})
}

// ListAll handles GET /api/v1/breach — list all breaches (admin).
func (h *Handler) ListAll(c *fiber.Ctx) error {
	breaches, err := h.service.ListAll(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في جلب الاختراقات"})
	}

	return c.JSON(fiber.Map{"success": true, "data": breaches})
}

// UpdateStatus handles PATCH /api/v1/breach/:id — update breach status (admin).
func (h *Handler) UpdateStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req UpdateBreachRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "طلب غير صالح"})
	}

	if !isValidBreachStatus(req.Status) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "حالة غير صالحة"})
	}

	breach, err := h.service.UpdateStatus(c.UserContext(), id, req.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في تحديث حالة الاختراق"})
	}

	return c.JSON(fiber.Map{"success": true, "data": breach})
}

func isValidSeverity(s string) bool {
	switch strings.ToLower(s) {
	case "low", "medium", "high", "critical", "":
		return true
	default:
		return false
	}
}

func isValidBreachStatus(s string) bool {
	switch strings.ToLower(s) {
	case "investigating", "notified_regulator", "notified_users", "resolved":
		return true
	default:
		return false
	}
}