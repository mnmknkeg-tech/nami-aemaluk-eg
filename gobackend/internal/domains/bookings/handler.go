package bookings

import (
	"strconv"
	"strings"

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

	// Public storefront (no auth): published shop services, real slots,
	// and guest-safe lookup by booking number.
	p := r.Group("/bookings/public")
	p.Get("/services", h.PublicServices)
	p.Get("/slots", h.PublicSlots)
	p.Get("/lookup", h.PublicLookup)

	// Merchant service management (bookable offerings CRUD)
	svcAuth := middleware.RequireAuth(h.cfg, h.cfg.Auth.Issuer, h.cfg.Auth.Audience)
	g.Get("/services", svcAuth, requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.ListServices)
	g.Post("/services", svcAuth, requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.CreateService)
	g.Patch("/services/:id", svcAuth, requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.UpdateService)
	g.Delete("/services/:id", svcAuth, requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.DeleteService)

	// Authenticated routes
	g.Post("/", svcAuth, h.Create)
	g.Get("/me", svcAuth, h.ListMine)
	g.Get("/", svcAuth, requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.ListByShop)
	g.Patch("/:id/status", svcAuth, requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.UpdateStatus)
	g.Patch("/:id", svcAuth, requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.Reschedule)

	// Availability routes
	g.Get("/availability/slot", svcAuth, h.CheckSlotAvailability)
	g.Get("/availability/resource", svcAuth, h.CheckResourceAvailability)
	g.Get("/slots/available", svcAuth, h.GetAvailableSlots)
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
	// Merchants can only create bookings for their own shop — ignore any
	// shopId they send in the body. Admins and customers may target the
	// shop they pass.
	if strings.EqualFold(user.Role, string(auth.RoleMerchant)) {
		req.ShopID = user.ShopID
	}
	// Dashboard bookings may omit shopId — default it from the token claims
	// so merchants never need to know their own shop id. Tokens minted
	// during signup carry no shopId claim (the shop does not exist yet at
	// that point), so re-resolve from the database before giving up —
	// otherwise manual bookings fail with a validator dump until the user
	// logs out and back in.
	if req.ShopID == "" {
		req.ShopID = user.ShopID
	}
	if req.ShopID == "" {
		shopID, err := h.service.ResolveUserShopID(c.UserContext(), user.ID)
		if err != nil {
			return err
		}
		req.ShopID = shopID
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	// Manual dashboard bookings (merchant/admin — the secretary registering a
	// walk-in) carry full permissions: no time-window restrictions and busy
	// windows are auto-queued after the last booking. Customer-token creates
	// stay under the strict public rules.
	manual := !strings.EqualFold(user.Role, string(auth.RoleCustomer))
	booking, err := h.service.CreateForUser(c.UserContext(), req, user.ID, manual)
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
	filter := &BookingListFilter{
		From:   c.Query("from"),
		To:     c.Query("to"),
		Status: c.Query("status"),
		Order:  strings.ToLower(c.Query("order")),
	}
	bookings, err := h.service.ListByShop(c.UserContext(), shopID, page, limit, filter)
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

// Reschedule handles PATCH /bookings/:id — move an appointment to a new
// Cairo wall-clock time (dashboard reschedule / drag-and-drop source).
func (h *Handler) Reschedule(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	var req RescheduleBookingRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	booking, err := h.service.Reschedule(c.UserContext(), id, req.BookingDate, req.BookingTime, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": booking})
}

// ---------------------------------------------------------------------------
// Booking services (merchant CRUD).
// ---------------------------------------------------------------------------

func (h *Handler) ListServices(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := user.ShopID
	if isAdmin(user.Role) && c.Query("shopId") != "" {
		shopID = c.Query("shopId")
	}
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}
	services, err := h.service.ListServices(c.UserContext(), shopID, c.Query("includeInactive") == "true")
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": services})
}

func (h *Handler) CreateService(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	var req CreateBookingServiceRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	svc, err := h.service.CreateService(c.UserContext(), user.ShopID, req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": svc})
}

func (h *Handler) UpdateService(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	var req UpdateBookingServiceRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	svc, err := h.service.UpdateService(c.UserContext(), id, req, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": svc})
}

func (h *Handler) DeleteService(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	svc, err := h.service.DeactivateService(c.UserContext(), id, user.Role, user.ShopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": svc})
}

// ---------------------------------------------------------------------------
// Public storefront endpoints (no auth).
// ---------------------------------------------------------------------------

// PublicServices handles GET /bookings/public/services?slug=&productId= —
// the published shop's active bookable services for the public booking page.
func (h *Handler) PublicServices(c *fiber.Ctx) error {
	slug := c.Query("slug")
	if slug == "" {
		return errors.Validation("slug_required", "slug مطلوب")
	}
	data, err := h.service.PublicListServicesBySlug(c.UserContext(), slug, c.Query("productId"))
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": data})
}

// PublicSlots handles GET /bookings/public/slots?serviceId=&date= — real
// available slots for one service on one Cairo date, no auth required.
func (h *Handler) PublicSlots(c *fiber.Ctx) error {
	serviceID := c.Query("serviceId")
	date := c.Query("date")
	duration, _ := strconv.Atoi(c.Query("duration"))
	slots, err := h.service.PublicAvailableSlots(c.UserContext(), serviceID, date, duration)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": slots})
}

// PublicLookup handles GET /bookings/public/lookup?number=BK-…&phone= —
// guest-safe booking tracking by public number (phone verified when given).
func (h *Handler) PublicLookup(c *fiber.Ctx) error {
	result, err := h.service.PublicLookup(c.UserContext(), c.Query("number"), c.Query("phone"))
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
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
			if strings.EqualFold(user.Role, string(r)) {
				return c.Next()
			}
		}
		return errors.Forbidden("insufficient_role", "ليس لديك صلاحية للوصول")
	}
}
