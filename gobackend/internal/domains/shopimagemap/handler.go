package shopimagemap

import (
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/media"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes shop image map HTTP endpoints.
type Handler struct {
	service *Service
	media   *media.Service
	cfg     *config.Config
}

// NewHandler creates a shop image map handler. media is optional; when it is
// nil the upload endpoint reports a clear configuration error instead of
// failing mid-request.
func NewHandler(service *Service, mediaSvc *media.Service, cfg *config.Config) *Handler {
	return &Handler{service: service, media: mediaSvc, cfg: cfg}
}

// RegisterRoutes wires the shop image map endpoints.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	shops := r.Group("/shops")

	// Public route
	shops.Get("/:slug/image-map/active", h.GetActiveForCustomer)

	// Authenticated routes
	shops.Get("/:shopId/image-maps/manage", middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.ListForManage)
	shops.Post("/:shopId/image-maps/upload", middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Upload)
	shops.Post("/:shopId/image-maps", middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Create)
	shops.Patch("/:shopId/image-maps/:mapId/activate", middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Activate)
	shops.Patch("/:shopId/image-maps/:mapId/layout", middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.SaveLayout)
	shops.Post("/:shopId/image-maps/analyze", middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Analyze)
}

func (h *Handler) GetActiveForCustomer(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return errors.Validation("slug_required", "slug مطلوب")
	}
	m, err := h.service.GetActiveForCustomer(c.UserContext(), slug)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": m})
}

func (h *Handler) ListForManage(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := c.Params("shopId")
	maps, err := h.service.ListForManage(c.UserContext(), shopID, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": maps})
}

// Upload stores image-map source files through the shared media pipeline
// (content-type allowlist, magic-byte signature checks, server-side
// re-encoding — QualityHigh caps raster sources at 1920px webp) and lands
// them in object storage (S3/R2). Returns the public URL of every stored
// file, in order.
func (h *Handler) Upload(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	if h.media == nil {
		return errors.Internal("media_service_unavailable", fmt.Errorf("media service is not wired"))
	}
	shopID := c.Params("shopId")
	form, err := c.MultipartForm()
	if err != nil {
		return errors.Validation("invalid_form", "تعذر قراءة الملفات المرفوعة")
	}
	files := form.File["files"]
	if len(files) == 0 {
		return errors.Validation("files_required", "لم يتم إرسال أي ملف")
	}
	urls := make([]string, 0, len(files))
	for _, fh := range files {
		m, err := h.media.DirectUpload(c.UserContext(), user.ID, user.Role, user.ShopID, shopID, "image-maps", fh)
		if err != nil {
			return err
		}
		urls = append(urls, m.OriginalURL)
	}
	return c.JSON(fiber.Map{"success": true, "data": urls})
}

func (h *Handler) Create(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := c.Params("shopId")
	var req CreateMapRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	m, err := h.service.Create(c.UserContext(), shopID, req, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": m})
}

func (h *Handler) Activate(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := c.Params("shopId")
	mapID := c.Params("mapId")
	if err := h.service.Activate(c.UserContext(), shopID, mapID, user.Role, user.ShopID); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) SaveLayout(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := c.Params("shopId")
	mapID := c.Params("mapId")
	var req SaveLayoutRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	m, err := h.service.SaveLayout(c.UserContext(), shopID, mapID, req, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": m})
}

func (h *Handler) Analyze(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := c.Params("shopId")
	var req AnalyzeRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	result, err := h.service.Analyze(c.UserContext(), shopID, req, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
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
