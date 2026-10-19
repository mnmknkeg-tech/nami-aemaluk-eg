package dsr

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for DSR.
type Handler struct {
	service *Service
	config  *config.Config
}

// NewHandler creates a new DSR handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, config: cfg}
}

// RegisterRoutes registers DSR routes under /api/v1.
func (h *Handler) RegisterRoutes(app fiber.Router) {
	g := app.Group("/dsr")

	g.Post("/", middleware.RequireAuth(h.config), h.Submit)
	g.Get("/me", middleware.RequireAuth(h.config), h.ListMine)

	// Admin routes
	g.Get("/", middleware.RequireAuth(h.config), middleware.RequireRole(middleware.RoleAdmin), h.ListAll)
	g.Patch("/:id", middleware.RequireAuth(h.config), middleware.RequireRole(middleware.RoleAdmin), h.UpdateStatus)
}

// Submit handles POST /api/v1/dsr — submit a DSR.
func (h *Handler) Submit(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "error": "غير مصرح"})
	}

	var req CreateDSRRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "طلب غير صالح"})
	}

	if !isValidRequestType(req.RequestType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "نوع الطلب غير صالح"})
	}

	dsr, err := h.service.Create(c.UserContext(), user.ID, req.RequestType, req.Details)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في إنشاء الطلب"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": dsr})
}

// ListMine handles GET /api/v1/dsr/me — my DSRs.
func (h *Handler) ListMine(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "error": "غير مصرح"})
	}

	dsrList, err := h.service.ListByUser(c.UserContext(), user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في جلب الطلبات"})
	}

	return c.JSON(fiber.Map{"success": true, "data": dsrList})
}

// ListAll handles GET /api/v1/dsr — all DSRs (admin).
func (h *Handler) ListAll(c *fiber.Ctx) error {
	dsrList, err := h.service.ListAll(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في جلب الطلبات"})
	}

	return c.JSON(fiber.Map{"success": true, "data": dsrList})
}

// UpdateStatus handles PATCH /api/v1/dsr/:id — admin update DSR status.
func (h *Handler) UpdateStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req UpdateDSRRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "طلب غير صالح"})
	}

	if !isValidDSRStatus(req.Status) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "حالة غير صالحة"})
	}

	dsr, err := h.service.UpdateStatus(c.UserContext(), id, req.Status, req.AdminNotes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل في تحديث الطلب"})
	}

	return c.JSON(fiber.Map{"success": true, "data": dsr})
}

func isValidRequestType(t string) bool {
	switch strings.ToLower(t) {
	case "access", "correction", "deletion", "objection", "portability":
		return true
	default:
		return false
	}
}

func isValidDSRStatus(s string) bool {
	switch strings.ToLower(s) {
	case "pending", "processing", "completed", "rejected":
		return true
	default:
		return false
	}
}