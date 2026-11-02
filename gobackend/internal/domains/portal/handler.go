package portal

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes portal HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a portal handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the portal endpoints.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/portal")

	g.Post("/register", h.Register)
	g.Post("/login", h.Login)
	g.Post("/otp/request", h.RequestOtp)
	g.Post("/otp/verify", h.VerifyOtp)
	g.Post("/change-password", h.ChangePassword)
}

func (h *Handler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	result, err := h.service.RegisterWithPassword(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	result, err := h.service.LoginWithPassword(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) RequestOtp(c *fiber.Ctx) error {
	var req RequestOtpRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	result, err := h.service.RequestOtp(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) VerifyOtp(c *fiber.Ctx) error {
	var req VerifyOtpRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	result, err := h.service.VerifyOtp(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	ownerID := c.Query("ownerId")
	if ownerID == "" {
		return errors.Validation("ownerId_required", "ownerId مطلوب")
	}
	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}
	if err := h.service.ChangePassword(c.UserContext(), ownerID, req); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true})
}
