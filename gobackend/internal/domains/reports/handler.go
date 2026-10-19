package reports

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for product reports.
type Handler struct {
	service *Service
	config  *config.Config
}

// NewHandler creates a new reports handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, config: cfg}
}

// RegisterRoutes registers report routes under /api/v1.
func (h *Handler) RegisterRoutes(app fiber.Router) {
	g := app.Group("/reports")

	// Anyone authenticated or guest can report
	g.Post("/", middleware.OptionalAuth(h.config), h.Create)

	// Admin routes
	g.Get("/", middleware.RequireAuth(h.config), middleware.RequireRole(middleware.RoleAdmin), h.ListAll)
	g.Patch("/:id", middleware.RequireAuth(h.config), middleware.RequireRole(middleware.RoleAdmin), h.UpdateStatus)
}

// Create handles POST /api/v1/reports — report a product.
func (h *Handler) Create(c *fiber.Ctx) error {
	var req CreateReportRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "طلب غير صالح"})
	}

	if !isValidReportReason(req.Reason) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "سبب البلاغ غير صالح"})
	}

	var reporterID *string
	if user, ok := middleware.AuthUserFromContext(c); ok {
		reporterID = &user.ID
	}

	report, err := h.service.Create(c.UserContext(), req.ProductID, req.ShopID, reporterID, req.Reason, req.Description)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في إنشاء البلاغ"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": report})
}

// ListAll handles GET /api/v1/reports — list all reports (admin).
func (h *Handler) ListAll(c *fiber.Ctx) error {
	reports, err := h.service.ListAll(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في جلب البلاغات"})
	}

	return c.JSON(fiber.Map{"success": true, "data": reports})
}

// UpdateStatus handles PATCH /api/v1/reports/:id — admin update report.
func (h *Handler) UpdateStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req UpdateReportRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "طلب غير صالح"})
	}

	if !isValidReportStatus(req.Status) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "حالة غير صالحة"})
	}

	report, err := h.service.UpdateStatus(c.UserContext(), id, req.Status, req.AdminNotes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في تحديث البلاغ"})
	}

	return c.JSON(fiber.Map{"success": true, "data": report})
}

func isValidReportReason(r string) bool {
	switch strings.ToLower(r) {
	case "misleading", "counterfeit", "unsafe", "inappropriate", "other":
		return true
	default:
		return false
	}
}

func isValidReportStatus(s string) bool {
	switch strings.ToLower(s) {
	case "pending", "reviewed", "action_taken", "dismissed":
		return true
	default:
		return false
	}
}