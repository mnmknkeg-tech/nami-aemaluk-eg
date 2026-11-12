package ai

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for AI insights.
type Handler struct {
	service *Service
	config  *config.Config
}

// NewHandler creates a new AI handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, config: cfg}
}

// RegisterRoutes registers AI routes. Paths mirror exactly what the dashboard
// AI pages call:
//
//	GET /ai/analysis/shop/:shopId
//	GET /ai/insights/shop/:shopId
//	GET /ai/seo/shop/:shopId
//	GET /ai/images/shop/:shopId
//	GET /ai/automations/shop/:shopId
func (h *Handler) RegisterRoutes(app fiber.Router) {
	ai := app.Group("/ai")
	auth := middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience)

	ai.Get("/analysis/shop/:shopId", auth, h.GetAnalysis)
	ai.Get("/insights/shop/:shopId", auth, h.GetInsights)
	ai.Get("/seo/shop/:shopId", auth, h.GetSEO)
	ai.Get("/images/shop/:shopId", auth, h.ListImages)
	ai.Get("/automations/shop/:shopId", auth, h.ListAutomations)
}

// shopScope mirrors the cartevent domain rule: merchants may only read their
// own shop data; admins may read any shop.
func (h *Handler) shopScope(c *fiber.Ctx, shopID string) bool {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return false
	}
	if strings.EqualFold(user.Role, "ADMIN") {
		return true
	}
	return user.ShopID == shopID
}

func (h *Handler) forbidden(c *fiber.Ctx) error {
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
		"success": false, "error": "ليس لديك صلاحية للوصول إلى بيانات هذا المتجر",
	})
}

// GetAnalysis handles GET /ai/analysis/shop/:shopId
func (h *Handler) GetAnalysis(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScope(c, shopID) {
		return h.forbidden(c)
	}
	items, err := h.service.BuildAnalysis(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "error": "فشل تحليل بيانات المتجر",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": items})
}

// GetInsights handles GET /ai/insights/shop/:shopId
func (h *Handler) GetInsights(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScope(c, shopID) {
		return h.forbidden(c)
	}
	insights, err := h.service.BuildInsights(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "error": "فشل توليد الرؤى",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": insights})
}

// GetSEO handles GET /ai/seo/shop/:shopId
func (h *Handler) GetSEO(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScope(c, shopID) {
		return h.forbidden(c)
	}
	items, err := h.service.BuildSEOAudit(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "error": "فشل تدقيق الـ SEO",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": items})
}

// ListImages handles GET /ai/images/shop/:shopId
func (h *Handler) ListImages(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScope(c, shopID) {
		return h.forbidden(c)
	}
	images, err := h.service.ListImages(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "error": "فشل تحميل الصور المولدة",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": images})
}

// ListAutomations handles GET /ai/automations/shop/:shopId
func (h *Handler) ListAutomations(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScope(c, shopID) {
		return h.forbidden(c)
	}
	automations, err := h.service.ListAutomations(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "error": "فشل تحميل الأتمتة",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": automations})
}
