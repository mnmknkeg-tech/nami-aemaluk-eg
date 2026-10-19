package middleware

import (
	stderrors "errors"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// NewErrorHandler returns a Fiber error handler that maps domain errors to a
// consistent JSON envelope. It should be wired into fiber.Config.ErrorHandler.
func NewErrorHandler() fiber.ErrorHandler {
	return func(c *fiber.Ctx, err error) error {
		if err == nil {
			return nil
		}

		// Handle Fiber built-in errors (404, 405, etc.).
		var fiberErr *fiber.Error
		if stderrors.As(err, &fiberErr) {
			return respond(c, fiberErr.Code, fiberErr.Message)
		}

		if appErr, ok := errors.IsAppError(err); ok {
			return handleAppError(c, appErr)
		}

		log := logger.WithRequestID(c.UserContext())
		log.Error("unhandled error", zap.Error(err), zap.String("path", c.Path()))
		return respond(c, fiber.StatusInternalServerError, "internal server error")
	}
}

func handleAppError(c *fiber.Ctx, appErr *errors.AppError) error {
	code := fiber.StatusInternalServerError
	switch appErr.Kind {
	case errors.KindValidation:
		code = fiber.StatusBadRequest
	case errors.KindAuthentication:
		code = fiber.StatusUnauthorized
	case errors.KindAuthorization:
		code = fiber.StatusForbidden
	case errors.KindNotFound:
		code = fiber.StatusNotFound
	case errors.KindConflict:
		code = fiber.StatusConflict
	case errors.KindRateLimit:
		code = fiber.StatusTooManyRequests
	case errors.KindServiceUnavailable:
		code = fiber.StatusServiceUnavailable
	}

	if appErr.Kind == errors.KindInternal || appErr.Kind == errors.KindUnknown {
		log := logger.WithRequestID(c.UserContext())
		// Log enough context to debug production issues from the platform log
		// viewer alone: the route, the domain error code and the unwrapped
		// driver error (e.g. Postgres reporting a missing relation/column).
		log.Error("internal app error",
			zap.String("method", c.Method()),
			zap.String("path", c.Path()),
			zap.String("kind", string(appErr.Kind)),
			zap.String("code", appErr.Code),
			zap.String("root_cause", rootCause(appErr)),
			zap.String("error", appErr.Error()),
		)
		return respond(c, code, "internal server error")
	}

	payload := fiber.Map{
		"success": false,
		"error":   appErr.Code,
		"message": appErr.Message,
	}
	if len(appErr.Fields) > 0 {
		payload["fields"] = appErr.Fields
	}

	return c.Status(code).JSON(payload)
}

func respond(c *fiber.Ctx, code int, message string) error {
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   fmt.Sprintf("http_%d", code),
		"message": message,
	})
}

// rootCause unwraps an application error down to the wrapped cause so logs show
// the underlying driver/database message (for example
// `pq: relation "users" does not exist`) instead of only the generic message.
func rootCause(err error) string {
	cause := stderrors.Unwrap(err)
	if cause == nil {
		return ""
	}
	return cause.Error()
}
