package middleware

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/gofiber/fiber/v2"
)

// Role constants matching the auth domain roles.
const (
	RoleAdmin    = "admin"
	RoleMerchant = "merchant"
	RoleCourier  = "courier"
	RoleCustomer = "customer"
)

// RequireRole returns a middleware that restricts access to the given roles.
// It must be used AFTER RequireAuth so that AuthUser is available in Locals.
// Admin always has access to every endpoint.
func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]bool, len(roles)+1)
	allowed[RoleAdmin] = true // admin bypasses all role checks
	for _, r := range roles {
		allowed[strings.ToLower(r)] = true
	}

	return func(c *fiber.Ctx) error {
		user, ok := AuthUserFromContext(c)
		if !ok {
			return errors.Unauthorized("missing_auth", "Authentication required")
		}

		role := strings.ToLower(user.Role)
		if !allowed[role] {
			return errors.Forbidden("insufficient_permissions", "غير مصرح لك بالوصول إلى هذا المورد")
		}

		// Also populate the legacy Locals keys for handlers that use them.
		c.Locals("user_id", user.ID)
		c.Locals("email", user.Email)
		c.Locals("role", user.Role)
		if user.ShopID != "" {
			c.Locals("shop_id", user.ShopID)
		}

		return c.Next()
	}
}

// RequireAdmin is a convenience wrapper for admin-only endpoints.
func RequireAdmin() fiber.Handler {
	return RequireRole(RoleAdmin)
}

// RequireMerchant is a convenience wrapper for merchant-only endpoints.
func RequireMerchant() fiber.Handler {
	return RequireRole(RoleMerchant)
}

// RequireMerchantOrAdmin allows both merchants and admins.
func RequireMerchantOrAdmin() fiber.Handler {
	return RequireRole(RoleMerchant, RoleAdmin)
}

// RequireCourier is a convenience wrapper for courier-only endpoints.
func RequireCourier() fiber.Handler {
	return RequireRole(RoleCourier)
}

// RequireAnyAuthenticated allows any authenticated user (customer, merchant,
// courier, admin). It is equivalent to AuthRequired but also validates that
// the user is active (non-empty ID).
func RequireAnyAuthenticated() fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := AuthUserFromContext(c)
		if !ok || user.ID == "" {
			return errors.Unauthorized("missing_auth", "Authentication required")
		}
		c.Locals("user_id", user.ID)
		c.Locals("email", user.Email)
		c.Locals("role", user.Role)
		if user.ShopID != "" {
			c.Locals("shop_id", user.ShopID)
		}
		return c.Next()
	}
}

// RequireShopOwner ensures the authenticated user owns the shop identified by
// the :shopId route parameter. Admins bypass the ownership check.
func RequireShopOwner() fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := AuthUserFromContext(c)
		if !ok {
			return errors.Unauthorized("missing_auth", "Authentication required")
		}

		// Admin bypasses ownership checks.
		if strings.EqualFold(user.Role, RoleAdmin) {
			return c.Next()
		}

		// Only merchants can own shops.
		if !strings.EqualFold(user.Role, RoleMerchant) {
			return errors.Forbidden("insufficient_permissions", "غير مصرح لك بالوصول إلى هذا المورد")
		}

		shopID := c.Params("shopId")
		if shopID == "" {
			shopID = c.Params("id")
		}
		if shopID == "" {
			return errors.Validation("missing_shop_id", "معرف المتجر مطلوب")
		}

		if user.ShopID == "" || !strings.EqualFold(user.ShopID, shopID) {
			return errors.Forbidden("shop_ownership", "غير مصرح لك بالوصول إلى هذا المتجر")
		}

		c.Locals("user_id", user.ID)
		c.Locals("email", user.Email)
		c.Locals("role", user.Role)
		c.Locals("shop_id", user.ShopID)

		return c.Next()
	}
}
