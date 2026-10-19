package media

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes media HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a media handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the media endpoints under the provided router.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/media", middleware.RequireAuth(h.cfg))

	g.Post("/presign", requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.PresignUpload)
	g.Post("/complete", requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.CompleteUpload)
	g.Get("/", requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.List)
	g.Get("/:id", requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.GetByID)
}

func (h *Handler) PresignUpload(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	var req PresignUploadRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	resp, err := h.service.PresignUpload(c.UserContext(), user.ID, user.Role, user.ShopID, req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": resp})
}

func (h *Handler) CompleteUpload(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	var req CompleteUploadRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	media, err := h.service.CompleteUpload(c.UserContext(), user.ID, user.Role, user.ShopID, req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": media})
}

func (h *Handler) List(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	req := parseListMediaRequest(c)
	if err := validate.Struct(req); err != nil {
		return err
	}

	media, err := h.service.ListMedia(c.UserContext(), user.Role, user.ShopID, req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": media})
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	media, err := h.service.GetMedia(c.UserContext(), id, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": media})
}

func parseListMediaRequest(c *fiber.Ctx) ListMediaRequest {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	return ListMediaRequest{
		ShopID:  c.Query("shopId"),
		Purpose: c.Query("purpose"),
		Page:    page,
		Limit:   limit,
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
