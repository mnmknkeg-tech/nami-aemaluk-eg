// Package httpx contains small HTTP helpers shared by domain handlers
// (previously copy-pasted between the finance and accounting domains).
package httpx

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Fail writes the standard error envelope used by domain handlers.
func Fail(c *fiber.Ctx, status int, msg string) error {
	return c.Status(status).JSON(map[string]any{"success": false, "error": msg})
}

// ResolveShop resolves the target shop from the path param, falling back to the
// authenticated user's shop. Only an ADMIN may act on a shop not their own.
// On failure it writes the error response and returns ok=false.
func ResolveShop(c *fiber.Ctx) (shopID string, ok bool) {
	user, uok := middleware.AuthUserFromContext(c)
	if !uok {
		_ = Fail(c, fiber.StatusUnauthorized, "Unauthorized")
		return "", false
	}
	shopID = c.Params("shopId")
	if shopID == "" {
		shopID = user.ShopID
	}
	if !strings.EqualFold(user.Role, "ADMIN") && shopID != user.ShopID {
		_ = Fail(c, fiber.StatusForbidden, "Forbidden")
		return "", false
	}
	return shopID, true
}
