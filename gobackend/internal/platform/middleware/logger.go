package middleware

import (
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// Logger returns a Fiber middleware that logs every request using zap.
func Logger(skipPaths ...string) fiber.Handler {
	skip := make(map[string]struct{}, len(skipPaths))
	for _, p := range skipPaths {
		skip[p] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		duration := time.Since(start)

		path := c.Path()
		if _, ok := skip[path]; ok {
			return err
		}

		status := c.Response().StatusCode()
		if status == 0 {
			status = fiber.StatusOK
		}

		log := logger.WithRequestID(c.UserContext())
		log.Info("http request",
			zap.String("method", c.Method()),
			zap.String("path", path),
			zap.Int("status", status),
			zap.Duration("latency", duration),
			zap.String("ip", c.IP()),
			zap.String("user_agent", c.Get("User-Agent")),
			zap.Error(err),
		)

		return err
	}
}
