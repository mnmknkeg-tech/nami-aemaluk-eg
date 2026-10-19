package auth

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/password"
	"github.com/gofiber/fiber/v2"
)

// ChangePasswordRequest is the body for POST /auth/change-password.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" validate:"required"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

// ChangePassword handles POST /auth/change-password — verifies the current
// password then stores the new hash. Called by the dashboard security settings.
func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if strings.TrimSpace(req.NewPassword) == "" || len(req.NewPassword) < 8 {
		return errors.Validation("password_too_short", "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل")
	}

	existing, err := h.service.repo.FindByID(c.UserContext(), user.ID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.NotFound("user", user.ID)
	}

	okVerify, err := password.Verify(req.CurrentPassword, existing.Password)
	if err != nil {
		return errors.Internal("password_verify_failed", err)
	}
	if !okVerify {
		return errors.Validation("current_password_wrong", "كلمة المرور الحالية غير صحيحة")
	}

	hashed, err := password.Hash(req.NewPassword)
	if err != nil {
		return errors.Internal("password_hash_failed", err)
	}
	if err := h.service.repo.UpdatePassword(c.UserContext(), user.ID, hashed); err != nil {
		return err
	}

	return c.JSON(fiber.Map{"success": true, "message": "تم تحديث كلمة المرور"})
}
