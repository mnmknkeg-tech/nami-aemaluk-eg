package bookings

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes booking HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a bookings handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the booking endpoints under the provided router.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/bookings")

	// Guest booking (no auth)
	g.Post("/guest", h.CreateGuest)

	// Authenticated routes
	g.Post("/", middleware.RequireAuth(h.cfg), h.Create)
	g.Get("/me", middleware.RequireAuth(h.cfg), h.ListMine)
	g.Get("/", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.ListByShop)
	g.Patch("/:id/status", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.UpdateStatus)

	// Availability routes
	g.Get("/availability/slot", middleware.RequireAuth(h.cfg), h.CheckSlotAvailability)
	g.Get("/availability/resource", middleware.RequireAuth(h.cfg), h.CheckResourceAvailability)
	g.Get("/slots/available", middleware.RequireAuth(h.cfg), h.GetAvailableSlots)
}

func (h *Handler) CreateGuest(c *fiber.Ctx) error {
	var req CreateBookingRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	booking, err := h.service.CreateForGuest(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": booking})
}

func (h *Handler) Create(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	var req CreateBookingRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	booking, err := h.service.CreateForUser(c.UserContext(), req, user.ID)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": booking})
}

func (h *Handler) ListMine(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	page := c.QueryInt("page")
	limit := c.QueryInt("limit")
	bookings, err := h.service.ListByUserID(c.UserContext(), user.ID, page, limit)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": bookings})
}

func (h *Handler) ListByShop(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := c.Query("shopId")
	if !isAdmin(user.Role) {
		shopID = user.ShopID
	}
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}
	page := c.QueryInt("page")
	limit := c.QueryInt("limit")
	bookings, err := h.service.ListByShop(c.UserContext(), shopID, page, limit)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": bookings})
}

func (h *Handler) UpdateStatus(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	var req UpdateBookingStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	booking, err := h.service.UpdateStatus(c.UserContext(), id, req.Status, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": booking})
}

func (h *Handler) CheckSlotAvailability(c *fiber.Ctx) error {
	serviceID := c.Query("serviceId")
	date := c.Query("date")
	startTime := c.Query("startTime")
	endTime := c.Query("endTime")
	excludeID := c.Query("excludeBookingId")
	result, err := h.service.CheckSlotAvailability(c.UserContext(), serviceID, date, startTime, endTime, excludeID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) CheckResourceAvailability(c *fiber.Ctx) error {
	resourceID := c.Query("resourceId")
	date := c.Query("date")
	startTime := c.Query("startTime")
	endTime := c.Query("endTime")
	excludeID := c.Query("excludeBookingId")
	result, err := h.service.CheckResourceAvailability(c.UserContext(), resourceID, date, startTime, endTime, excludeID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) GetAvailableSlots(c *fiber.Ctx) error {
	serviceID := c.Query("serviceId")
	date := c.Query("date")
	durationStr := c.Query("duration")
	duration, _ := strconv.Atoi(durationStr)
	slots, err := h.service.GetAvailableSlots(c.UserContext(), serviceID, date, duration)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": slots})
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
