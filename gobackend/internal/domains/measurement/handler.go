package measurement

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes measurement HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a measurement handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the measurement endpoints.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/measurements")

	g.Post("/", middleware.RequireAuth(h.cfg), h.Create)
	g.Get("/me", middleware.RequireAuth(h.cfg), h.ListMine)
	g.Get("/summary", middleware.RequireAuth(h.cfg), h.GetSummary)
	g.Get("/:id", middleware.RequireAuth(h.cfg), h.GetOne)
	g.Patch("/:id", middleware.RequireAuth(h.cfg), h.Update)
	g.Delete("/:id", middleware.RequireAuth(h.cfg), h.Remove)
	g.Post("/bulk", middleware.RequireAuth(h.cfg), h.BulkCreate)
	g.Patch("/bulk", middleware.RequireAuth(h.cfg), h.BulkUpdate)
	g.Delete("/me/all", middleware.RequireAuth(h.cfg), h.DeleteAll)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	var req CreateMeasurementRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	m, err := h.service.Create(c.UserContext(), user.ID, req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": m})
}

func (h *Handler) ListMine(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	page := c.QueryInt("page")
	limit := c.QueryInt("limit")
	result, err := h.service.ListByUser(c.UserContext(), user.ID, page, limit)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) GetSummary(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	summary, err := h.service.GetSummary(c.UserContext(), user.ID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": summary})
}

func (h *Handler) GetOne(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	m, err := h.service.GetOne(c.UserContext(), id, user.ID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": m})
}

func (h *Handler) Update(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	var req UpdateMeasurementRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	m, err := h.service.Update(c.UserContext(), id, user.ID, req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": m})
}

func (h *Handler) Remove(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	if err := h.service.Remove(c.UserContext(), id, user.ID); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) BulkCreate(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	var req BulkCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	count, err := h.service.BulkCreate(c.UserContext(), user.ID, req.Items)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"created": count}})
}

func (h *Handler) BulkUpdate(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	var req BulkUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	results, err := h.service.BulkUpdate(c.UserContext(), user.ID, req.Items)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": results})
}

func (h *Handler) DeleteAll(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	count, err := h.service.DeleteAll(c.UserContext(), user.ID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"deactivated": count}})
}
