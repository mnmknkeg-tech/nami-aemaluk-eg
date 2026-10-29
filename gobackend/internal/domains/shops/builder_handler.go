package shops

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// BuilderHandler exposes builder configuration HTTP endpoints.
type BuilderHandler struct {
	service *BuilderService
}

// NewBuilderHandler creates a new builder handler.
func NewBuilderHandler(service *BuilderService) *BuilderHandler {
	return &BuilderHandler{service: service}
}

// RegisterBuilderRoutes wires the builder endpoints under the provided router.
// All routes require authentication and shop ownership (or admin role).
func (h *BuilderHandler) RegisterBuilderRoutes(r fiber.Router, authMW fiber.Handler) {
	g := r.Group("/builder", authMW)

	g.Get("/:shopId/config", h.GetBuilderConfig)
	g.Put("/:shopId/config", h.SaveDraftConfig)
	g.Patch("/:shopId/config", h.SaveDraftConfig)
	g.Post("/:shopId/publish", h.PublishBuilderConfigV2)

	// Versioning endpoints
	g.Get("/:shopId/versions", h.ListVersions)
	g.Get("/:shopId/versions/:versionId", h.GetVersion)
	g.Post("/:shopId/versions/:versionId/rollback", h.RollbackVersion)
}

// RegisterPublicRoutes wires public (no-auth) storefront endpoints.
// GET /shops/:slug/website serves the published website config.
// GET /shops/published-slugs lists published site slugs for sitemaps.
func (h *BuilderHandler) RegisterPublicRoutes(r fiber.Router) {
	g := r.Group("/shops")
	g.Get("/published-slugs", h.GetPublishedSlugs)
	g.Get("/:slug/website", h.GetPublicWebsite)
}

// GetPublishedSlugs handles GET /shops/published-slugs (public).
// Returns the slugs of approved shops with a published website — used by the
// frontend sitemap to index /site/:slug pages.
func (h *BuilderHandler) GetPublishedSlugs(c *fiber.Ctx) error {
	slugs, err := h.service.ListPublishedSlugs(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": slugs})
}

// GetPublicWebsite handles GET /shops/:slug/website (public).
func (h *BuilderHandler) GetPublicWebsite(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return errors.Validation("slug_required", "slug مطلوب")
	}

	site, err := h.service.GetPublicWebsiteBySlug(c.UserContext(), slug)
	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    site,
	})
}

// GetBuilderConfig handles GET /builder/:shopId/config
// Requires authentication and shop ownership or admin role.
func (h *BuilderHandler) GetBuilderConfig(c *fiber.Ctx) error {
	req := GetBuilderConfigRequest{
		ShopID: c.Params("shopId"),
	}

	if err := validate.Struct(req); err != nil {
		return errors.Validation("invalid_request", err.Error())
	}

	// Get authenticated user
	actor, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthorized", "غير مصرح")
	}

	// Check if user has access to this shop (resolves by DB owner when JWT shopID is absent)
	if _, err := h.service.CheckActorShopAccess(c.UserContext(), actor, req.ShopID); err != nil {
		return err
	}

	config, err := h.service.GetBuilderConfig(c.UserContext(), req.ShopID)
	if err != nil {
		return err
	}

	return c.JSON(config)
}

// UpdateBuilderConfig handles PATCH/PUT /builder/:shopId/config
// Requires authentication and shop ownership or admin role.
func (h *BuilderHandler) UpdateBuilderConfig(c *fiber.Ctx) error {
	var req UpdateBuilderConfigRequest
	req.ShopID = c.Params("shopId")

	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", err.Error())
	}

	if err := validate.Struct(req); err != nil {
		return errors.Validation("invalid_request", err.Error())
	}

	// Get authenticated user
	actor, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthorized", "غير مصرح")
	}

	// Check if user has access to this shop (resolves by DB owner when JWT shopID is absent)
	if _, err := h.service.CheckActorShopAccess(c.UserContext(), actor, req.ShopID); err != nil {
		return err
	}

	// Delegate to versioned save with default visual mode and no concurrency check.
	config, _, _, err := h.service.SaveDraftVersion(
		c.UserContext(), req.ShopID, ModeVisual, &req.Config, 0)
	if err != nil {
		return err
	}

	return c.JSON(config)
}

// PublishBuilderConfig handles POST /builder/:shopId/publish
// Requires authentication and shop ownership or admin role.
func (h *BuilderHandler) PublishBuilderConfig(c *fiber.Ctx) error {
	req := PublishBuilderConfigRequest{
		ShopID: c.Params("shopId"),
	}

	if err := validate.Struct(req); err != nil {
		return errors.Validation("invalid_request", err.Error())
	}

	// Get authenticated user
	actor, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthorized", "غير مصرح")
	}

	// Check if user has access to this shop (resolves by DB owner when JWT shopID is absent)
	if _, err := h.service.CheckActorShopAccess(c.UserContext(), actor, req.ShopID); err != nil {
		return err
	}

	if err := h.service.PublishBuilderConfig(c.UserContext(), req.ShopID); err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "تم نشر التكوين بنجاح",
	})
}

// saveConfigRequest is the request body for versioned draft save.
type saveConfigRequest struct {
	ShopID       string `json:"-"`
	Config       BuilderConfig `json:"config" validate:"required"`
	Mode         string        `json:"mode"` // editing mode for capability policy
	ClientVersion int64        `json:"clientVersion"` // optimistic concurrency version
}

// SaveDraftConfig handles PUT/PATCH /builder/:shopId/config with mode-aware
// validation and optimistic concurrency. Returns the new draft version number
// and checksum for ETag-based concurrency control.
func (h *BuilderHandler) SaveDraftConfig(c *fiber.Ctx) error {
	req := saveConfigRequest{}
	req.ShopID = c.Params("shopId")

	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", err.Error())
	}
	if err := validate.Struct(req); err != nil {
		return errors.Validation("invalid_request", err.Error())
	}

	actor, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthorized", "غير مصرح")
	}
	// Check if user has access to this shop (resolves by DB owner when JWT shopID is absent)
	if _, err := h.service.CheckActorShopAccess(c.UserContext(), actor, req.ShopID); err != nil {
		return err
	}

	mode := EditingMode(strings.ToLower(strings.TrimSpace(req.Mode)))
	if mode == "" {
		mode = ModeVisual
	}

	config, version, checksum, err := h.service.SaveDraftVersion(
		c.UserContext(), req.ShopID, mode, &req.Config, req.ClientVersion)
	if err != nil {
		return err
	}

	c.Set("ETag", checksum)
	c.Set("X-Draft-Version", strconv.FormatInt(version, 10))
	return c.JSON(fiber.Map{
		"success":          true,
		"draftVersion":     version,
		"checksum":         checksum,
		"savedAt":          config.UpdatedAt,
	})
}

// PublishBuilderConfigV2 handles POST /builder/:shopId/publish with
// optimistic concurrency and returns the published version info.
func (h *BuilderHandler) PublishBuilderConfigV2(c *fiber.Ctx) error {
	req := PublishBuilderConfigRequest{
		ShopID: c.Params("shopId"),
	}
	if err := validate.Struct(req); err != nil {
		return errors.Validation("invalid_request", err.Error())
	}

	actor, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthorized", "غير مصرح")
	}
	if actor.Role != "ADMIN" && actor.ShopID != req.ShopID {
		return errors.Forbidden("access_denied", "لا تملك صلاحية الوصول لهذا المتجر")
	}

	var body struct {
		ClientVersion int64 `json:"clientVersion"`
	}
	_ = c.BodyParser(&body)

	result, err := h.service.PublishDraft(c.UserContext(), req.ShopID, body.ClientVersion)
	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"success":       true,
		"message":       "تم نشر التكوين بنجاح",
		"versionId":     result.VersionID,
		"versionNumber": result.VersionNumber,
		"checksum":      result.Checksum,
		"publishedAt":   result.PublishedAt,
	})
}

// ListVersions handles GET /builder/:shopId/versions.
func (h *BuilderHandler) ListVersions(c *fiber.Ctx) error {
	shopID := c.Params("shopId")

	actor, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthorized", "غير مصرح")
	}
	if actor.Role != "ADMIN" && actor.ShopID != shopID {
		return errors.Forbidden("access_denied", "لا تملك صلاحية الوصول لهذا المتجر")
	}

	limit := 50
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}

	versions, err := h.service.ListVersions(c.UserContext(), shopID, limit)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": versions})
}

// GetVersion handles GET /builder/:shopId/versions/:versionId.
func (h *BuilderHandler) GetVersion(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	versionID := c.Params("versionId")

	actor, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthorized", "غير مصرح")
	}
	if actor.Role != "ADMIN" && actor.ShopID != shopID {
		return errors.Forbidden("access_denied", "لا تملك صلاحية الوصول لهذا المتجر")
	}

	config, err := h.service.GetVersion(c.UserContext(), shopID, versionID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": config})
}

// RollbackVersion handles POST /builder/:shopId/versions/:versionId/rollback.
func (h *BuilderHandler) RollbackVersion(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	versionID := c.Params("versionId")

	actor, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthorized", "غير مصرح")
	}
	if actor.Role != "ADMIN" && actor.ShopID != shopID {
		return errors.Forbidden("access_denied", "لا تملك صلاحية الوصول لهذا المتجر")
	}

	config, err := h.service.RollbackToVersion(c.UserContext(), shopID, versionID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{
		"success": true,
		"message":   "تم التراجع إلى النسخة المحددة",
		"data":      config,
	})
}

// MarshalBuilderConfig is a helper used by the GetBuilderConfig response.
func MarshalBuilderConfig(config *BuilderConfig) ([]byte, error) {
	return json.Marshal(config)
}
