package media

import (
	"strconv"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"

	"go.uber.org/zap"
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
	// Direct multipart upload for clients that cannot use the presigned URL flow.
	g.Post("/upload", requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Upload)
	g.Get("/", requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.List)
	g.Get("/:id", requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.GetByID)
}

// Upload handles a multipart file upload sent directly to the API.
//
// The shop the file belongs to can be given two ways:
//
//	shopId query parameter — shopId=...
//	shopId multipart field  — form field "shopId"
//
// The form field matters because the dashboard is served from Vercel and
// proxies /api/* through a Next.js rewrite. Vercel's rewrite answers 500 for
// a multipart POST whose query string carries a dashed UUID, while the very
// same request without the query parameter reaches the API fine. Reading
// the shop id from the multipart body sidesteps the proxy bug entirely, and
// the query parameter stays supported for direct API calls.
//
// "purpose" is accepted the same way ("product_image", "gallery", …).
//
// It answers with the stored media row. The dashboard reads the "url" field
// from the unwrapped payload, so the response carries the public URL under
// both "url" and "originalUrl".
func (h *Handler) Upload(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	shopID := strings.TrimSpace(c.Query("shopId"))
	if shopID == "" {
		shopID = strings.TrimSpace(c.FormValue("shopId"))
	}
	if shopID == "" {
		return errors.Validation("shop_id_required", "معرف المتجر مطلوب")
	}
	purpose := strings.TrimSpace(c.Query("purpose"))
	if purpose == "" {
		purpose = strings.TrimSpace(c.FormValue("purpose"))
	}

	fh, err := c.FormFile("file")
	if err != nil {
		return errors.Validation("file_required", "الملف مطلوب")
	}

	media, err := h.service.DirectUpload(c.UserContext(), user.ID, user.Role, user.ShopID, shopID, purpose, fh)
	if err != nil {
		// Log the error with safe context (no secrets)
		logger.Global().Error("direct upload failed",
			zap.String("shop_id", shopID),
			zap.String("purpose", purpose),
			zap.String("filename", fh.Filename),
			zap.String("content_type", fh.Header.Get("Content-Type")),
			zap.String("size", strconv.FormatInt(fh.Size, 10)),
			zap.String("user_id", user.ID),
			zap.Error(err),
		)
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    media,
		// The dashboard's upload helper reads "url" off the unwrapped payload.
		"url": media.OriginalURL,
	})
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
		// Log the error with safe context (no secrets)
		logger.Global().Error("presign failed",
			zap.String("shop_id", req.ShopID),
			zap.String("filename", req.Filename),
			zap.String("content_type", req.ContentType),
			zap.String("purpose", req.Purpose),
			zap.String("user_id", user.ID),
			zap.Error(err),
		)
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
		// Log the error with safe context (no secrets)
		logger.Global().Error("complete upload failed",
			zap.String("shop_id", req.ShopID),
			zap.String("key", req.Key),
			zap.String("mime_type", req.MimeType),
			zap.String("purpose", req.Purpose),
			zap.String("user_id", user.ID),
			zap.Error(err),
		)
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
