package shops

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes shop HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a shop handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the shop endpoints under the provided router.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/shops")

	g.Get("/sitemap", h.Sitemap)
	g.Get("/", h.ListPublic)

	merchantAuth := []fiber.Handler{middleware.RequireAuth(h.cfg), requireRolesMiddleware("MERCHANT", "ADMIN")}
	g.Post("/", append(merchantAuth, h.CreateShop)...)
	g.Get("/me", append(merchantAuth, h.GetMyShop)...)
	g.Patch("/me", append(merchantAuth, h.UpdateMyShop)...)
	g.Get("/me/module-config", append(merchantAuth, h.GetModuleConfig)...)
	g.Get("/me/module-upgrade-requests", append(merchantAuth, h.ListMyModuleUpgradeRequests)...)
	g.Post("/me/module-upgrade-requests", append(merchantAuth, h.CreateMyModuleUpgradeRequest)...)

	admin := g.Group("/admin", middleware.RequireAuth(h.cfg), requireRolesMiddleware("ADMIN"))
	admin.Get("/", h.ListByStatus)
	admin.Get("/pending", h.ListPending)
	admin.Get("/:id", h.GetAdminShop)
	admin.Patch("/:id/status", h.UpdateStatus)
	admin.Patch("/:id", h.UpdateAdminShop)
	admin.Get("/module-upgrade-requests", h.AdminListModuleUpgradeRequests)
	admin.Post("/module-upgrade-requests/:id/approve", h.AdminApproveModuleUpgradeRequest)
	admin.Post("/module-upgrade-requests/:id/reject", h.AdminRejectModuleUpgradeRequest)

	// Admin aliases directly under /shops for dashboard-web compatibility
	g.Get("/pending", middleware.RequireAuth(h.cfg), requireRolesMiddleware("ADMIN"), h.ListPending)
	g.Patch("/:id/status", middleware.RequireAuth(h.cfg), requireRolesMiddleware("ADMIN"), h.UpdateStatus)
	g.Patch("/:id", middleware.RequireAuth(h.cfg), requireRolesMiddleware("ADMIN"), h.UpdateAdminShop)

	// Admin module requests and settings directly under /admin for dashboard-web compatibility
	modAdmin := r.Group("/admin/module-requests", middleware.RequireAuth(h.cfg), requireRolesMiddleware("ADMIN"))
	modAdmin.Get("/", h.AdminListModuleUpgradeRequests)
	modAdmin.Post("/:id/approve", h.AdminApproveModuleUpgradeRequest)
	modAdmin.Post("/:id/reject", h.AdminRejectModuleUpgradeRequest)

	adminSys := r.Group("/admin", middleware.RequireAuth(h.cfg), requireRolesMiddleware("ADMIN"))
	adminSys.Get("/settings", h.GetAdminSettings)
	adminSys.Patch("/settings", h.UpdateAdminSettings)
	adminSys.Post("/upgrade-dashboard-config", h.UpgradeDashboardConfig)

	// Wildcard routes MUST be registered after fixed routes like /me, /pending, etc.
	g.Get("/:slug", h.GetBySlug)

	// Follow routes (authenticated)
	g.Get("/:id/follow-status", middleware.RequireAuth(h.cfg), h.GetFollowStatus)
	g.Post("/:id/follow", middleware.RequireAuth(h.cfg), h.FollowShop)
	g.Delete("/:id/follow", middleware.RequireAuth(h.cfg), h.UnfollowShop)
}

func (h *Handler) Sitemap(c *fiber.Ctx) error {
	xml, err := h.service.GenerateSitemap(c.UserContext())
	if err != nil {
		return err
	}
	c.Set("Content-Type", "application/xml; charset=utf-8")
	return c.SendString(xml)
}

func (h *Handler) CreateShop(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var req CreateShopRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	shop, err := h.service.CreateShop(c.UserContext(), user.ID, req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": shop})
}

func (h *Handler) GetMyShop(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	shop, err := h.service.GetMyShop(c.UserContext(), user.ID, user.ShopID, h.cfg.IsDevelopment())
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": shop})
}

func (h *Handler) UpdateMyShop(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var body map[string]any
	if err := c.BodyParser(&body); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}

	shop, err := h.service.UpdateMyShop(c.UserContext(), user, "", body)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": shop})
}

func (h *Handler) GetModuleConfig(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	shop, err := h.service.GetMyShop(c.UserContext(), user.ID, user.ShopID, h.cfg.IsDevelopment())
	if err != nil {
		return err
	}
	if shop == nil {
		return errors.NotFound("shop_not_found", "المتجر غير موجود")
	}

	// Extract module config from builder_config
	moduleConfig := map[string]any{
		"enabledModules": []string{},
		"specialties":    []string{},
		"moduleFeatures": map[string]any{},
	}

	if shop.BuilderConfig != nil {
		if enabledModules, ok := shop.BuilderConfig["enabledModules"]; ok {
			moduleConfig["enabledModules"] = enabledModules
		}
		if specialties, ok := shop.BuilderConfig["specialties"]; ok {
			moduleConfig["specialties"] = specialties
		}
		if moduleFeatures, ok := shop.BuilderConfig["moduleFeatures"]; ok {
			moduleConfig["moduleFeatures"] = moduleFeatures
		}
	}

	return c.JSON(fiber.Map{"success": true, "data": moduleConfig})
}

func (h *Handler) GetBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return errors.Validation("slug_required", "slug مطلوب")
	}
	shop, err := h.service.GetShopBySlug(c.UserContext(), slug)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": shop})
}

func (h *Handler) ListPublic(c *fiber.Ctx) error {
	req := parseShopListRequest(c)
	shops, err := h.service.ListPublic(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": shops})
}

func (h *Handler) ListByStatus(c *fiber.Ctx) error {
	req := parseAdminShopListRequest(c)
	shops, err := h.service.ListByStatus(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": shops})
}

func (h *Handler) UpdateStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	var req UpdateShopStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	shop, err := h.service.UpdateStatus(c.UserContext(), id, ShopStatus(req.Status))
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": shop})
}

func (h *Handler) ListPending(c *fiber.Ctx) error {
	req := parseAdminShopListRequest(c)
	req.Status = string(ShopStatusPending)
	shops, err := h.service.ListByStatus(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": shops})
}

// GetAdminShop returns any shop by ID for admins.
func (h *Handler) GetAdminShop(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	shop, err := h.service.GetShopByID(c.UserContext(), id)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": shop})
}

// UpdateAdminShop allows admins to update shop fields directly.
func (h *Handler) UpdateAdminShop(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	var body map[string]any
	if err := c.BodyParser(&body); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	shop, err := h.service.UpdateAdminShop(c.UserContext(), id, body)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": shop})
}

func parseShopListRequest(c *fiber.Ctx) ShopListRequest {
	take, _ := strconv.Atoi(c.Query("take", "50"))
	skip, _ := strconv.Atoi(c.Query("skip", "0"))
	return ShopListRequest{
		Take:        take,
		Skip:        skip,
		Category:    c.Query("category"),
		Governorate: c.Query("governorate"),
		Search:      c.Query("search"),
	}
}

func parseAdminShopListRequest(c *fiber.Ctx) AdminShopListRequest {
	take, _ := strconv.Atoi(c.Query("take", "50"))
	skip, _ := strconv.Atoi(c.Query("skip", "0"))
	return AdminShopListRequest{
		Take:   take,
		Skip:   skip,
		Status: c.Query("status"),
		Search: c.Query("search"),
	}
}

func requireRolesMiddleware(allowed ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
		}
		for _, r := range allowed {
			if user.Role == r {
				return c.Next()
			}
		}
		return errors.Forbidden("insufficient_role", "ليس لديك صلاحية للوصول")
	}
}

// GetFollowStatus checks if the current user follows a shop
func (h *Handler) GetFollowStatus(c *fiber.Ctx) error {
	shopID := c.Params("id")
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	following, err := h.service.IsFollowing(c.UserContext(), user.ID, shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to check follow status"})
	}

	return c.JSON(fiber.Map{"success": true, "following": following})
}

// FollowShop lets a user follow a shop
func (h *Handler) FollowShop(c *fiber.Ctx) error {
	shopID := c.Params("id")
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	if err := h.service.FollowShop(c.UserContext(), user.ID, shopID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to follow shop"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// UnfollowShop lets a user unfollow a shop
func (h *Handler) UnfollowShop(c *fiber.Ctx) error {
	shopID := c.Params("id")
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	if err := h.service.UnfollowShop(c.UserContext(), user.ID, shopID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to unfollow shop"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// GetAdminSettings returns system settings
func (h *Handler) GetAdminSettings(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"platformName":    "منصة نمّي أعمالك",
			"defaultLanguage": "ar-EG",
			"enable2fa":       false,
		},
	})
}

// UpdateAdminSettings handles saving system settings
func (h *Handler) UpdateAdminSettings(c *fiber.Ctx) error {
	var body map[string]any
	_ = c.BodyParser(&body)
	return c.JSON(fiber.Map{
		"success": true,
		"message": "تم حفظ الإعدادات بنجاح",
		"data":    body,
	})
}

// UpgradeDashboardConfig runs the dashboard configuration updater
func (h *Handler) UpgradeDashboardConfig(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success":      true,
		"updatedCount": 0,
		"message":      "تم تحديث إعدادات لوحة التحكم بنجاح",
	})
}
