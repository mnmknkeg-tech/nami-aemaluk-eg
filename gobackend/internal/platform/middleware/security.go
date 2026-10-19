package middleware

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/gofiber/fiber/v2"
)

// publicCachePrefixes lists API path prefixes whose GET responses are public
// catalog data (marketplace homepage, shops, products, offers, blog, search).
// Everything else under /api/v1 keeps no-store.
var publicCachePrefixes = []string{
	"/api/v1/shops",
	"/api/v1/products",
	"/api/v1/offers",
	"/api/v1/marketing/seasonal-offers/public",
	"/api/v1/blog",
	"/api/v1/search",
	"/api/v1/productcategories",
	"/api/v1/builder/published-slugs",
}

func isPublicCachePath(path string) bool {
	for _, p := range publicCachePrefixes {
		if strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}

// SecurityHeaders applies a hardened set of HTTP response headers. CSP is kept
// permissive enough for SPAs and WebSocket connections, and tightened via env.
func SecurityHeaders(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		isDev := cfg.IsDevelopment()

		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Permissions-Policy", "geolocation=(self), microphone=(), camera=(), payment=(self)")
		c.Set("X-DNS-Prefetch-Control", "off")
		c.Set("Cross-Origin-Resource-Policy", "cross-origin")
		c.Set("Cross-Origin-Opener-Policy", "same-origin")

		if cfg.IsProduction() {
			c.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		}

		// Content-Security-Policy: allow self, the configured frontend, and common CDNs.
		frontend := cfg.App.FrontendURL
		csp := buildCSP(isDev, frontend)
		c.Set("Content-Security-Policy", csp)

		// X-Powered-By removal
		c.Set("X-Powered-By", "")

		// Cache-Control: anonymous GETs of public catalog paths get a short
		// shared-cache TTL; everything else (authenticated, mutations, cookies
		// in the response) must never be cached. Evaluated after the handler so
		// a Set-Cookie emitted downstream downgrades the response to no-store.
		path := c.Path()
		anonymousGET := c.Method() == fiber.MethodGet &&
			c.Get("Authorization") == "" &&
			c.Cookies("ray_session") == "" &&
			c.Cookies("ray_access") == ""
		cacheable := anonymousGET && isPublicCachePath(path)

		err := c.Next()

		if strings.HasPrefix(path, "/api/v1/") {
			if cacheable && c.GetRespHeader("Set-Cookie") == "" {
				c.Set("Cache-Control", "public, max-age=15, stale-while-revalidate=300")
			} else {
				c.Set("Cache-Control", "no-store")
			}
		}

		return err
	}
}

func buildCSP(isDev bool, frontend string) string {
	scriptSrc := "'self' https://cdn.jsdelivr.net"
	if isDev {
		scriptSrc += " 'unsafe-inline' 'unsafe-eval'"
	}

	styleSrc := "'self' 'unsafe-inline'"
	imgSrc := "'self' data: https:"
	connectSrc := "'self' wss: https:"
	if isDev {
		imgSrc += " http:"
		connectSrc += " http: ws:"
	}
	if frontend != "" {
		connectSrc += " " + frontend
	}

	return "default-src 'self'; " +
		"script-src " + scriptSrc + "; " +
		"style-src " + styleSrc + "; " +
		"img-src " + imgSrc + "; " +
		"connect-src " + connectSrc + "; " +
		"font-src 'self'; " +
		"frame-ancestors 'none'; " +
		"base-uri 'self'; " +
		"form-action 'self';"
}

