package auth

import (
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Deactivate handles POST /auth/deactivate — schedules the account for deletion
// (soft deactivate now, purge after 30 days) exactly like the settings page expects.
func (h *Handler) Deactivate(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	now := time.Now().UTC()
	purgeAt := now.AddDate(0, 0, 30)
	tag, err := h.service.repo.pool.Exec(c.Context(),
		`UPDATE users SET deactivated_at = $1, scheduled_purge_at = $2 WHERE id = $3`,
		now, purgeAt, user.ID,
	)
	if err != nil {
		return errors.Internal("db_error", err)
	}
	if tag.RowsAffected() == 0 {
		return errors.NotFound("user", user.ID)
	}
	return c.JSON(fiber.Map{
		"success": true,
		"message": "تم جدولة حذف الحساب",
		"data": fiber.Map{
			"scheduledPurgeAt": purgeAt,
		},
	})
}
