package cartevent

import (
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes cart event HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a cart event handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the cart event endpoints.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/cart-events")

	// Public tracking
	g.Post("/public/track", h.PublicTrack)

	// Authenticated tracking
	g.Post("/", middleware.RequireAuth(h.cfg), h.Track)

	// Merchant/admin routes
	g.Get("/abandoned", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.ListAbandoned)
	g.Get("/stats", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.GetStats)
	g.Patch("/:id/recover", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.MarkRecovered)
}

func (h *Handler) PublicTrack(c *fiber.Ctx) error {
	var req TrackRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	event, err := h.service.TrackPublic(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": event})
}

func (h *Handler) Track(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	var req TrackRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	uid := user.ID
	event, err := h.service.Track(c.UserContext(), req, &uid)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": event})
}

func (h *Handler) ListAbandoned(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := c.Query("shopId")
	if !isAdmin(user.Role) {
		shopID = user.ShopID
	}
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId غير متوفر")
	}
	var from, to *time.Time
	if f := c.Query("from"); f != "" {
		if parsed, err := time.Parse(time.RFC3339, f); err == nil {
			from = &parsed
		}
	}
	if t := c.Query("to"); t != "" {
		if parsed, err := time.Parse(time.RFC3339, t); err == nil {
			to = &parsed
		}
	}
	page := c.QueryInt("page")
	limit := c.QueryInt("limit")
	result, err := h.service.ListAbandoned(c.UserContext(), shopID, from, to, page, limit, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) GetStats(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := c.Query("shopId")
	if !isAdmin(user.Role) {
		shopID = user.ShopID
	}
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId غير متوفر")
	}
	var from, to *time.Time
	if f := c.Query("from"); f != "" {
		if parsed, err := time.Parse(time.RFC3339, f); err == nil {
			from = &parsed
		}
	}
	if t := c.Query("to"); t != "" {
		if parsed, err := time.Parse(time.RFC3339, t); err == nil {
			to = &parsed
		}
	}
	stats, err := h.service.GetStats(c.UserContext(), shopID, from, to, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": stats})
}

func (h *Handler) MarkRecovered(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	event, err := h.service.MarkRecovered(c.UserContext(), id, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": event})
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
