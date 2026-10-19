package apps

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes apps HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates an apps handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the apps endpoints.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/apps")

	g.Get("/", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.ListApps)
	g.Get("/me", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.MyApps)
	g.Post("/:key/install", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Install)
	g.Post("/:key/uninstall", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Uninstall)
	g.Post("/:key/enable", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Enable)
	g.Post("/:key/disable", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Disable)
}

func (h *Handler) ListApps(c *fiber.Ctx) error {
	apps, err := h.service.ListApps(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": apps})
}

func (h *Handler) MyApps(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := user.ShopID
	if isAdmin(user.Role) {
		shopID = c.Query("shopId")
	}
	// A merchant without a shop is a normal pre-onboarding state, not an
	// error: answer with an empty list so the dashboard doesn't spew 400s.
	if shopID == "" {
		return c.JSON(fiber.Map{"success": true, "data": []any{}})
	}
	apps, err := h.service.ListMyApps(c.UserContext(), shopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": apps})
}

func (h *Handler) Install(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	key := c.Params("key")
	shopID := user.ShopID
	if isAdmin(user.Role) {
		shopID = c.Query("shopId")
	}
	if shopID == "" {
		return errors.Validation("shopId_required", "لا يوجد متجر مرتبط بهذا الحساب")
	}
	result, err := h.service.Install(c.UserContext(), shopID, key)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) Uninstall(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	key := c.Params("key")
	shopID := user.ShopID
	if isAdmin(user.Role) {
		shopID = c.Query("shopId")
	}
	if shopID == "" {
		return errors.Validation("shopId_required", "لا يوجد متجر مرتبط بهذا الحساب")
	}
	result, err := h.service.Uninstall(c.UserContext(), shopID, key)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) Enable(c *fiber.Ctx) error {
	return h.setActive(c, true)
}

func (h *Handler) Disable(c *fiber.Ctx) error {
	return h.setActive(c, false)
}

func (h *Handler) setActive(c *fiber.Ctx, active bool) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	key := c.Params("key")
	shopID := user.ShopID
	if isAdmin(user.Role) {
		shopID = c.Query("shopId")
	}
	if shopID == "" {
		return errors.Validation("shopId_required", "لا يوجد متجر مرتبط بهذا الحساب")
	}
	result, err := h.service.SetActive(c.UserContext(), shopID, key, active)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func isAdmin(role string) bool {
	return role == string(auth.RoleAdmin)
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
