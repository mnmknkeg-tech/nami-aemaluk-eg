package users

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes user HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a users handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the user endpoints under the provided router.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/users")

	g.Get("/me", middleware.RequireAuth(h.cfg), h.GetMe)
	g.Patch("/me", middleware.RequireAuth(h.cfg), h.UpdateMe)
	g.Put("/me/addresses", middleware.RequireAuth(h.cfg), h.ReplaceMyAddresses)

	admin := g.Group("", middleware.RequireAuth(h.cfg), requireRoleMiddleware(auth.RoleAdmin))
	admin.Get("/", h.ListUsers)
	admin.Get("/couriers", h.ListCouriers)
	admin.Post("/couriers", h.CreateCourier)
	admin.Get("/couriers/pending", h.ListPendingCouriers)
	admin.Patch("/couriers/:id/approve", h.ApproveCourier)
	admin.Patch("/couriers/:id/reject", h.RejectCourier)
	admin.Get("/couriers/:id", h.GetCourierDetails)
	admin.Patch("/couriers/:id/status", h.SetCourierStatus)
	admin.Patch("/:id/role", h.SetUserRole)
	admin.Patch("/:id", h.UpdateUserAsAdmin)
	admin.Delete("/:id", h.DeleteUser)

	// Top-level /couriers routes for dashboard delivery page compatibility
	cGroup := r.Group("/couriers", middleware.RequireAuth(h.cfg), requireRoleMiddleware(auth.RoleAdmin))
	cGroup.Get("/", h.ListCouriers)
	cGroup.Post("/", h.CreateCourier)
	cGroup.Get("/pending", h.ListPendingCouriers)
	cGroup.Post("/:id/approve", h.ApproveCourier)
	cGroup.Patch("/:id/approve", h.ApproveCourier)
	cGroup.Post("/:id/reject", h.RejectCourier)
	cGroup.Patch("/:id/reject", h.RejectCourier)
	cGroup.Get("/:id/admin-details", h.GetCourierDetails)
	cGroup.Get("/:id", h.GetCourierDetails)
	cGroup.Patch("/:id/status", h.SetCourierStatus)
}

// GetMe returns the authenticated user's profile (including extra phones).
func (h *Handler) GetMe(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	profile, err := h.service.GetMe(c.UserContext(), user.ID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": profile})
}

func (h *Handler) UpdateMe(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var req UpdateMeRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	updated, err := h.service.UpdateMe(c.UserContext(), user.ID, req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": updated})
}

// ReplaceMyAddresses overwrites the saved address book with the posted list.
func (h *Handler) ReplaceMyAddresses(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var req ReplaceAddressesRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	addresses, err := h.service.ReplaceMyAddresses(c.UserContext(), user.ID, req.Addresses)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": addresses})
}

func (h *Handler) ListCouriers(c *fiber.Ctx) error {
	req, err := parseCourierListRequest(c)
	if err != nil {
		return err
	}
	couriers, err := h.service.ListCouriers(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": couriers})
}

func (h *Handler) CreateCourier(c *fiber.Ctx) error {
	var req CreateCourierRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	created, err := h.service.CreateCourier(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": created})
}

func (h *Handler) ListPendingCouriers(c *fiber.Ctx) error {
	req, err := parseCourierListRequest(c)
	if err != nil {
		return err
	}
	couriers, err := h.service.ListPendingCouriers(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": couriers})
}

func (h *Handler) ApproveCourier(c *fiber.Ctx) error {
	id := c.Params("id")
	courier, err := h.service.ApproveCourier(c.UserContext(), id)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": courier})
}

func (h *Handler) RejectCourier(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.RejectCourier(c.UserContext(), id); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم رفض المندوب"})
}

func (h *Handler) GetCourierDetails(c *fiber.Ctx) error {
	id := c.Params("id")
	details, err := h.service.GetCourierDetails(c.UserContext(), id)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": details})
}

func (h *Handler) SetCourierStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		IsActive bool `json:"isActive"`
	}
	if err := c.BodyParser(&body); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	courier, err := h.service.SetCourierActiveStatus(c.UserContext(), id, body.IsActive)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": courier})
}

func parseCourierListRequest(c *fiber.Ctx) (CourierListRequest, error) {
	take, _ := strconv.Atoi(c.Query("take", "50"))
	skip, _ := strconv.Atoi(c.Query("skip", "0"))
	return CourierListRequest{
		Take:     take,
		Skip:     skip,
		Search:   c.Query("search"),
		IsActive: c.Query("isActive"),
	}, nil
}

func requireRoleMiddleware(allowed auth.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
		}
		if auth.Role(user.Role) != allowed {
			return errors.Forbidden("insufficient_role", "ليس لديك صلاحية للوصول")
		}
		return c.Next()
	}
}

func (h *Handler) ListUsers(c *fiber.Ctx) error {
	take, _ := strconv.Atoi(c.Query("take", "50"))
	skip, _ := strconv.Atoi(c.Query("skip", "0"))
	search := c.Query("search", c.Query("q", ""))
	role := c.Query("role", "")

	users, err := h.service.ListAll(c.UserContext(), take, skip, search, role)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": users})
}

// UpdateUserAsAdmin lets an admin update another user's profile fields
// (name / phone). Reuses the same validation as UpdateMe.
func (h *Handler) UpdateUserAsAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}

	var req UpdateMeRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات التحديث")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	user, err := h.service.UpdateMe(c.UserContext(), id, req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": user})
}

func (h *Handler) SetUserRole(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}

	var req struct {
		Role string `json:"role"`
	}
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}

	user, err := h.service.SetRole(c.UserContext(), id, req.Role)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": user})
}

func (h *Handler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}

	if err := h.service.DeleteUser(c.UserContext(), id); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم حذف المستخدم بنجاح"})
}
