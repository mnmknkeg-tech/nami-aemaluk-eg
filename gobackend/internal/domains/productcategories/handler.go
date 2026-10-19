package productcategories

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes product category HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a categories handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the category endpoints.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/categories")

	// GET /categories?shopId=xxx  – list categories for a shop (authenticated)
	g.Get("/", middleware.RequireAuth(h.cfg), h.List)

	// GET /categories/shop/:shopId  – list categories for a shop (public or merchant)
	g.Get("/shop/:shopId", middleware.RequireAuth(h.cfg), h.ListByShop)

	// POST /categories
	g.Post("/", middleware.RequireAuth(h.cfg), h.Create)

	// PUT /categories/:id
	g.Put("/:id", middleware.RequireAuth(h.cfg), h.Update)

	// DELETE /categories/:id
	g.Delete("/:id", middleware.RequireAuth(h.cfg), h.Delete)
}

// List handles GET /categories
// Accepts ?shopId query param, or uses the authenticated merchant's shopId.
func (h *Handler) List(c *fiber.Ctx) error {
	shopID := c.Query("shopId")
	if shopID == "" {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
		}
		shopID = user.ShopID
	}
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}
	cats, err := h.service.ListByShop(c.UserContext(), shopID)
	if err != nil {
		return err
	}
	return c.JSON(cats)
}

// ListByShop handles GET /categories/shop/:shopId
func (h *Handler) ListByShop(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}
	cats, err := h.service.ListByShop(c.UserContext(), shopID)
	if err != nil {
		return err
	}
	return c.JSON(cats)
}

// Create handles POST /categories
func (h *Handler) Create(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var req CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}

	// Use merchant's own shop unless admin provides a shopId
	if req.ShopID == "" {
		req.ShopID = user.ShopID
	}
	if req.ShopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}

	cat, err := h.service.Create(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(cat)
}

// Update handles PUT /categories/:id
func (h *Handler) Update(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}

	var req UpdateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}

	cat, err := h.service.Update(c.UserContext(), id, user.ShopID, req)
	if err != nil {
		return err
	}
	return c.JSON(cat)
}

// Delete handles DELETE /categories/:id
func (h *Handler) Delete(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}

	if err := h.service.Delete(c.UserContext(), id, user.ShopID); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم حذف الفئة"})
}
