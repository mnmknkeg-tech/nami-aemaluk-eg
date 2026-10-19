package middleware

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const requestIDHeader = "X-Request-Id"

// RequestID attaches a unique request id to the request context and response.
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Get(requestIDHeader)
		if id == "" {
			id = uuid.Must(uuid.NewV7()).String()
		}

		c.Locals(logger.RequestIDContextKey(), id)
		c.Set(requestIDHeader, id)

		ctx := logger.SetRequestID(c.UserContext(), id)
		c.SetUserContext(ctx)

		return c.Next()
	}
}
