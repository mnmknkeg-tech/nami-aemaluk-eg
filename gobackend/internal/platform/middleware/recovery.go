package middleware

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// Recovery recovers from panics, logs them, and returns a graceful 500.
func Recovery() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				log := logger.WithRequestID(c.UserContext())
				log.Error("panic recovered",
					zap.Any("panic", r),
					zap.String("path", c.Path()),
					zap.String("method", c.Method()),
				)

				_ = c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"error":   "internal_server_error",
					"message": "Service temporarily unavailable",
				})
			}
		}()
		return c.Next()
	}
}
