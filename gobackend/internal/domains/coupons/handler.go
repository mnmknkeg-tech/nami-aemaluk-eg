package coupons

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	appErrors "github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
	"strings"
	"time"
)

type Handler struct {
	repo *Repository
	cfg  *config.Config
}

func NewHandler(repo *Repository, cfg *config.Config) *Handler { return &Handler{repo: repo, cfg: cfg} }
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/coupons")
	g.Post("/validate", h.Validate)
	authz := middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience)
	g.Get("/shop/:shopId", authz, h.requireMerchant, h.List)
	g.Post("/", authz, h.requireMerchant, h.Create)
	g.Put("/:id", authz, h.requireMerchant, h.Update)
	g.Delete("/:id", authz, h.requireMerchant, h.Delete)
}
func (h *Handler) requireMerchant(c *fiber.Ctx) error {
	u, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return appErrors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	if u.Role != string(auth.RoleMerchant) && u.Role != string(auth.RoleAdmin) {
		return appErrors.Forbidden("insufficient_role", "ليس لديك صلاحية")
	}
	return c.Next()
}
func (h *Handler) Validate(c *fiber.Ctx) error {
	var q ValidateRequest
	if e := c.BodyParser(&q); e != nil {
		return appErrors.Validation("invalid_body", "تعذر قراءة بيانات الكوبون")
	}
	q.Code = strings.TrimSpace(q.Code)
	if q.ShopID == "" || q.Code == "" || q.Subtotal < 0 {
		return appErrors.Validation("coupon_input_invalid", "بيانات الكوبون غير صحيحة")
	}
	x, e := h.repo.Find(c.UserContext(), q.ShopID, q.Code)
	if e != nil {
		return appErrors.Validation("coupon_invalid", "الكوبون غير صالح أو منتهي")
	}
	d, e := Validate(*x, q.Subtotal, time.Now())
	if e != nil {
		return e
	}
	return c.JSON(fiber.Map{"success": true, "data": ValidateResponse{Coupon: *x, DiscountAmount: d, FinalTotal: q.Subtotal - d}})
}
func (h *Handler) List(c *fiber.Ctx) error {
	u, _ := middleware.AuthUserFromContext(c)
	sid := c.Params("shopId")
	if u.Role == string(auth.RoleMerchant) && u.ShopID != sid {
		return appErrors.Forbidden("shop_ownership", "لا يمكنك الوصول إلى كوبونات متجر آخر")
	}
	x, e := h.repo.List(c.UserContext(), sid)
	if e != nil {
		return e
	}
	return c.JSON(fiber.Map{"success": true, "data": x})
}
func (h *Handler) Create(c *fiber.Ctx) error {
	u, _ := middleware.AuthUserFromContext(c)
	var q WriteRequest
	if e := c.BodyParser(&q); e != nil {
		return appErrors.Validation("invalid_body", "تعذر قراءة بيانات الكوبون")
	}
	if u.Role == string(auth.RoleMerchant) {
		q.ShopID = u.ShopID
	}
	if e := validateWrite(q); e != nil {
		return e
	}
	x, e := h.repo.Create(c.UserContext(), q)
	if e != nil {
		return e
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": x})
}
func (h *Handler) Update(c *fiber.Ctx) error {
	u, _ := middleware.AuthUserFromContext(c)
	var q WriteRequest
	if e := c.BodyParser(&q); e != nil {
		return appErrors.Validation("invalid_body", "تعذر قراءة بيانات الكوبون")
	}
	if u.Role == string(auth.RoleMerchant) {
		q.ShopID = u.ShopID
	}
	if e := validateWrite(q); e != nil {
		return e
	}
	x, e := h.repo.Update(c.UserContext(), c.Params("id"), q)
	if e != nil {
		return e
	}
	return c.JSON(fiber.Map{"success": true, "data": x})
}
func (h *Handler) Delete(c *fiber.Ctx) error {
	u, _ := middleware.AuthUserFromContext(c)
	sid := c.Query("shopId")
	if u.Role == string(auth.RoleMerchant) {
		sid = u.ShopID
	}
	if sid == "" {
		return appErrors.Validation("shopId_required", "shopId مطلوب")
	}
	if e := h.repo.Delete(c.UserContext(), c.Params("id"), sid); e != nil {
		return e
	}
	return c.JSON(fiber.Map{"success": true})
}
func validateWrite(q WriteRequest) error {
	q.Code = strings.TrimSpace(q.Code)
	if q.ShopID == "" || q.Code == "" || q.Value < 0 || q.MinOrderValue < 0 || q.MaxDiscountValue < 0 || q.UsageLimit < 0 {
		return appErrors.Validation("coupon_invalid", "بيانات الكوبون غير صحيحة")
	}
	if q.Type != "percentage" && q.Type != "fixed" && q.Type != "free_shipping" && q.Type != "buy_x_get_y" {
		return appErrors.Validation("coupon_type_invalid", "نوع الكوبون غير صحيح")
	}
	if q.Type == "percentage" && q.Value > 100 {
		return appErrors.Validation("coupon_invalid", "النسبة يجب أن تكون بين 0 و100")
	}
	return nil
}
