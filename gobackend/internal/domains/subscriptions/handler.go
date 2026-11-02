package subscriptions

import (
	"strconv"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes subscription HTTP endpoints
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a new subscriptions handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires subscription endpoints
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/shops/:shopId/subscriptions", middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience))

	// Stats
	g.Get("/stats", h.GetStats)

	// Plans CRUD
	g.Get("/plans", h.ListPlans)
	g.Post("/plans", h.CreatePlan)
	g.Get("/plans/:planId", h.GetPlan)
	g.Patch("/plans/:planId", h.UpdatePlan)
	g.Delete("/plans/:planId", h.DeletePlan)

	// Member subscriptions CRUD
	g.Get("/", h.ListSubscriptions)
	g.Post("/", h.CreateSubscription)
	g.Get("/:id", h.GetSubscription)
	g.Patch("/:id", h.UpdateSubscription)
	g.Post("/:id/renew", h.RenewSubscription)

	// Customer-specific subscriptions
	r.Get("/shops/:shopId/customers/:customerId/subscriptions",
		middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience), h.GetCustomerSubscriptions)

	// Public storefront routes (unauthenticated)
	r.Get("/public/shops/:shopId/subscriptions/plans", h.PublicListPlans)
	r.Post("/public/shops/:shopId/subscriptions/subscribe", h.PublicSubscribe)
	r.Get("/shops/:shopId/subscriptions/plans/public", h.PublicListPlans)
	r.Post("/shops/:shopId/subscriptions/public", h.PublicSubscribe)
}

// ============================================================
// AUTH HELPER
// ============================================================

func (h *Handler) shopIDFromContext(c *fiber.Ctx) (string, error) {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return "", errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := c.Params("shopId")
	if shopID == "" {
		shopID = user.ShopID
	}
	// Admin can access any shop (case-insensitive)
	if strings.EqualFold(user.Role, "admin") {
		return shopID, nil
	}
	// Merchant must own the shop (case-insensitive comparison)
	if !strings.EqualFold(user.ShopID, shopID) {
		return "", errors.Forbidden("forbidden", "ليس لديك صلاحية للوصول لهذا المتجر")
	}
	return shopID, nil
}

func (h *Handler) userID(c *fiber.Ctx) string {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return ""
	}
	return user.ID
}

// ============================================================
// PLANS
// ============================================================

func (h *Handler) ListPlans(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	plans, err := h.service.ListPlans(c.UserContext(), shopID)
	if err != nil {
		return errors.Internal("db_error", err)
	}
	return c.JSON(fiber.Map{"success": true, "data": plans, "total": len(plans)})
}

func (h *Handler) GetPlan(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	plan, err := h.service.GetPlanByID(c.UserContext(), c.Params("planId"), shopID)
	if err != nil {
		return errors.NotFound("plan", c.Params("planId"))
	}
	return c.JSON(fiber.Map{"success": true, "data": plan})
}

func (h *Handler) CreatePlan(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	var req CreatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة البيانات")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	plan, err := h.service.CreatePlan(c.UserContext(), shopID, req)
	if err != nil {
		return errors.Internal("create_failed", err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": plan})
}

func (h *Handler) UpdatePlan(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	var req UpdatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة البيانات")
	}
	plan, err := h.service.UpdatePlan(c.UserContext(), c.Params("planId"), shopID, req)
	if err != nil {
		return errors.Internal("update_failed", err)
	}
	return c.JSON(fiber.Map{"success": true, "data": plan})
}

func (h *Handler) DeletePlan(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	if err := h.service.DeletePlan(c.UserContext(), c.Params("planId"), shopID); err != nil {
		return errors.Validation("delete_failed", err.Error())
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم حذف الباقة"})
}

// ============================================================
// SUBSCRIPTIONS
// ============================================================

func (h *Handler) ListSubscriptions(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}

	filters := map[string]string{}
	for _, key := range []string{"status", "payment_status", "plan_id", "expiring_days", "search"} {
		if v := c.Query(key); v != "" {
			filters[key] = v
		}
	}

	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	subs, total, err := h.service.ListSubscriptions(c.UserContext(), shopID, filters, limit, offset)
	if err != nil {
		return errors.Internal("db_error", err)
	}
	return c.JSON(fiber.Map{"success": true, "data": subs, "total": total})
}

func (h *Handler) GetSubscription(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	sub, err := h.service.GetSubscriptionByID(c.UserContext(), c.Params("id"), shopID)
	if err != nil {
		return errors.NotFound("subscription", c.Params("id"))
	}
	return c.JSON(fiber.Map{"success": true, "data": sub})
}

func (h *Handler) CreateSubscription(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	var req CreateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة البيانات")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	sub, err := h.service.CreateSubscription(c.UserContext(), shopID, h.userID(c), req)
	if err != nil {
		return errors.Internal("create_failed", err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": sub})
}

func (h *Handler) UpdateSubscription(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	var req UpdateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة البيانات")
	}
	sub, err := h.service.UpdateSubscription(c.UserContext(), c.Params("id"), shopID, req)
	if err != nil {
		return errors.Internal("update_failed", err)
	}
	return c.JSON(fiber.Map{"success": true, "data": sub})
}

func (h *Handler) RenewSubscription(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	var req RenewSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة البيانات")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	sub, err := h.service.RenewSubscription(c.UserContext(), c.Params("id"), shopID, h.userID(c), req)
	if err != nil {
		return errors.Internal("renew_failed", err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": sub})
}

func (h *Handler) GetStats(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	stats, err := h.service.GetStats(c.UserContext(), shopID)
	if err != nil {
		return errors.Internal("db_error", err)
	}
	return c.JSON(fiber.Map{"success": true, "data": stats})
}

func (h *Handler) GetCustomerSubscriptions(c *fiber.Ctx) error {
	shopID, err := h.shopIDFromContext(c)
	if err != nil {
		return err
	}
	customerID := c.Params("customerId")
	subs, err := h.service.GetCustomerSubscriptions(c.UserContext(), customerID, shopID)
	if err != nil {
		return errors.Internal("db_error", err)
	}
	return c.JSON(fiber.Map{"success": true, "data": subs})
}

// ============================================================
// PUBLIC STOREFRONT HANDLERS
// ============================================================

func (h *Handler) PublicListPlans(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if shopID == "" {
		return errors.Validation("missing_shop_id", "معرف المتجر مطلوب")
	}
	plans, err := h.service.ListPublicPlans(c.UserContext(), shopID)
	if err != nil {
		return errors.Internal("failed_to_list_plans", err)
	}
	return c.JSON(fiber.Map{
		"success": true,
		"data":    plans,
		"total":   len(plans),
	})
}

func (h *Handler) PublicSubscribe(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if shopID == "" {
		return errors.Validation("missing_shop_id", "معرف المتجر مطلوب")
	}
	var req PublicSubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_request", "بيانات غير صالحة")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	sub, err := h.service.PublicSubscribe(c.UserContext(), shopID, req)
	if err != nil {
		return errors.Internal("failed_to_subscribe", err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    sub,
		"message": "تم تسجيل الاشتراك بنجاح",
	})
}

