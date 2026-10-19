package publicinbox

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes the public inbox endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a public inbox handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the endpoints:
//   - POST /contact, POST /suggestions  → public (marketplace forms)
//   - GET  /public-messages             → admin inbox
//   - PATCH /public-messages/:id/handled → admin
func (h *Handler) RegisterRoutes(r fiber.Router) {
	r.Post("/contact", h.SubmitContact)
	r.Post("/suggestions", h.SubmitSuggestion)

	admin := middleware.RequireAuth(h.cfg)
	r.Get("/public-messages", admin, requireRoles(h.service), h.List)
	r.Patch("/public-messages/:id/handled", admin, requireRoles(h.service), h.MarkHandled)
}

func requireRoles(_ *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
		}
		if auth.Role(user.Role) != auth.RoleAdmin {
			return errors.Forbidden("forbidden", "هذه الصفحة للمشرفين فقط")
		}
		return c.Next()
	}
}

func (h *Handler) SubmitContact(c *fiber.Ctx) error {
	return h.submit(c, "contact")
}

func (h *Handler) SubmitSuggestion(c *fiber.Ctx) error {
	return h.submit(c, "suggestion")
}

func (h *Handler) submit(c *fiber.Ctx, kind string) error {
	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	var (
		msg *PublicMessage
		err error
	)
	if kind == "suggestion" {
		msg, err = h.service.SubmitSuggestion(c.UserContext(), req)
	} else {
		msg, err = h.service.SubmitContact(c.UserContext(), req)
	}
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": msg})
}

func (h *Handler) List(c *fiber.Ctx) error {
	kind := c.Query("kind")
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page < 1 {
		page = 1
	}
	messages, total, err := h.service.List(c.UserContext(), kind, limit, (page-1)*max(limit, 1))
	if err != nil {
		return err
	}
	return c.JSON(ListResponse{Success: true, Data: messages, Total: total})
}

func (h *Handler) MarkHandled(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.MarkHandled(c.UserContext(), id); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true})
}
