package offers

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes offer HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates an offers handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the offer endpoints under the provided router.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/offers")

	g.Get("/", h.List)
	g.Get("/:id", h.GetByID)
	g.Post("/", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Create)
	g.Delete("/:id", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Deactivate)
}

func (h *Handler) List(c *fiber.Ctx) error {
	req := parseListOffersRequest(c)
	offers, err := h.service.ListActive(c.UserContext(), req)
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
	offer, err := h.service.GetActiveByID(c.UserContext(), id)
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
	var req CreateOfferRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	offers, err := h.service.Create(c.UserContext(), req, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": offers})
}

func (h *Handler) Deactivate(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	offer, err := h.service.Deactivate(c.UserContext(), id, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": offer})
}

func parseListOffersRequest(c *fiber.Ctx) ListOffersRequest {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	return ListOffersRequest{
		ShopID:       c.Query("shopId"),
		ShopCategory: c.Query("shopCategory"),
		ProductID:    c.Query("productId"),
		Page:         page,
		Limit:        limit,
	}
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
