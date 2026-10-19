package seasonaloffers

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes seasonal offer HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a seasonal offers handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the seasonal offer endpoints under the provided router.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/marketing/seasonal-offers")

	// Public routes (no auth)
	g.Get("/public", h.ListPublic)
	g.Get("/public/:id", h.GetPublicByID)

	// Authenticated routes (merchant/admin)
	g.Get("/shop/:shopId", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.ListByShop)
	g.Get("/:id", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.GetByID)
	g.Post("/", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Create)
	g.Put("/:id", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Update)
	g.Delete("/:id", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Delete)
}

func (h *Handler) ListPublic(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	offers, err := h.service.ListPublic(c.UserContext(), page, limit)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": offers})
}

func (h *Handler) GetPublicByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	offer, err := h.service.GetByID(c.UserContext(), id)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": offer})
}

func (h *Handler) ListByShop(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}
	req := ListSeasonalOffersRequest{
		ShopID:   shopID,
		Status:   c.Query("status"),
		Occasion: c.Query("occasion"),
		Page:     c.QueryInt("page"),
		Limit:    c.QueryInt("limit"),
	}
	offers, err := h.service.ListByShop(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": offers})
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	offer, err := h.service.GetByID(c.UserContext(), id)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": offer})
}

func (h *Handler) Create(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	var req CreateSeasonalOfferRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	offer, err := h.service.Create(c.UserContext(), req, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": offer})
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
	var req UpdateSeasonalOfferRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	offer, err := h.service.Update(c.UserContext(), id, req, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": offer})
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	if err := h.service.Delete(c.UserContext(), id, user.Role, user.ShopID); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true})
}

func requireRolesMiddleware(allowed ...auth.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
		}
		for _, r := range allowed {
			if auth.Role(user.Role) == r {
				return c.Next()
			}
		}
		return errors.Forbidden("insufficient_role", "ليس لديك صلاحية للوصول")
	}
}
