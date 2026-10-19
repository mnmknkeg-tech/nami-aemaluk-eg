package middleware

import (
	"net/netip"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/gofiber/fiber/v2"
)

var adminPathPrefixes = []string{
	"/api/v1/admin",
	"/api/v1/shops/admin",
	"/api/v1/users/admin",
	"/api/v1/products/admin",
	"/api/v1/orders/admin",
}

// AdminIPAllowlist blocks admin endpoints when the client IP is not in the
// configured allowlist. In non-production environments this middleware is a no-op.
func AdminIPAllowlist(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !cfg.IsProduction() {
			return c.Next()
		}

		if len(cfg.Security.AdminIPAllowlist) == 0 {
			return c.Next()
		}

		path := c.Path()
		if !isAdminPath(path) {
			return c.Next()
		}

		clientIP := normalizeIP(c.IP())
		for _, allowed := range cfg.Security.AdminIPAllowlist {
			if matchIP(clientIP, normalizeIP(allowed)) {
				return c.Next()
			}
		}

		return errors.Forbidden("admin_ip_denied", "عنوان IP غير مصرح به للوصول إلى لوحة الإدارة")
	}
}

// ClientIPAllowed reports whether ip passes the configured admin IP allowlist.
// An empty allowlist means "no IPs allowed" (deny by default) — callers decide
// the fallback (e.g. disable the endpoint) instead of silently opening it.
func ClientIPAllowed(cfg *config.Config, ip string) bool {
	if len(cfg.Security.AdminIPAllowlist) == 0 {
		return false
	}
	clientIP := normalizeIP(ip)
	for _, allowed := range cfg.Security.AdminIPAllowlist {
		if matchIP(clientIP, normalizeIP(allowed)) {
			return true
		}
	}
	return false
}

func isAdminPath(path string) bool {
	for _, p := range adminPathPrefixes {
		if strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}

func normalizeIP(ip string) string {
	return strings.TrimPrefix(strings.TrimSpace(ip), "::ffff:")
}

// matchIP compares the client IP against one allowlist entry. Supported entry
// forms: exact IP ("203.0.113.7"), CIDR range ("203.0.113.0/24"), or a dotted
// prefix ending with a dot for a /24-style range ("10.0.0." -> 10.0.0.0/24).
// The old strings.HasSuffix fallback is intentionally gone: suffix matching
// would accept "91.2.3.4" for an "1.2.3.4" entry.
func matchIP(client, allowed string) bool {
	client = normalizeIP(client)
	allowed = normalizeIP(allowed)
	if client == "" || allowed == "" {
		return false
	}
	if client == allowed {
		return true
	}
	clientAddr, err := netip.ParseAddr(client)
	if err != nil {
		return false
	}
	if prefix, err := netip.ParsePrefix(allowed); err == nil {
		return prefix.Contains(clientAddr)
	}
	if strings.HasSuffix(allowed, ".") {
		if prefix, err := netip.ParsePrefix(allowed + "0/24"); err == nil {
			return prefix.Contains(clientAddr)
		}
	}
	return false
}
