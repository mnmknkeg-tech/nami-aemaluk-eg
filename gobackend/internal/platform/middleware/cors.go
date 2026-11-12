package middleware

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// normalizeOrigin strips surrounding whitespace and quotes from an origin
// string. Railway and similar platforms sometimes embed quotes in
// environment variable values (e.g. CORS_ORIGIN="https://example.com"),
// which would otherwise cause origin matching to fail because browsers
// send the Origin header without quotes.
func normalizeOrigin(s string) string {
	return strings.Trim(strings.TrimSpace(s), `"'`)
}

// CORS returns a Fiber CORS middleware configured from the application config.
// In development all origins are allowed; in production only the configured
// origins (no wildcards) are accepted.
func CORS(cfg *config.Config) fiber.Handler {
	origins := cfg.Security.CORSOrigins
	if len(origins) == 0 && cfg.App.FrontendURL != "" {
		origins = []string{cfg.App.FrontendURL}
	}

	// Sanitize: reject wildcard in production.
	if cfg.IsProduction() {
		for i, o := range origins {
			if normalizeOrigin(o) == "*" {
				origins = append(origins[:i], origins[i+1:]...)
				break
			}
		}
	}

	// Pre-normalize all allowed origins so comparisons are reliable even if
	// config normalization was bypassed (defence in depth).
	normalized := make([]string, len(origins))
	for i, o := range origins {
		normalized[i] = normalizeOrigin(o)
	}

	return cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			if cfg.IsDevelopment() {
				return true
			}
			// In production an empty/missing Origin (curl, server-to-server)
			// gets no CORS headers, and browsers never treat it as an
			// allowed origin — never combine AllowCredentials with a wildcard.
			if origin == "" {
				return false
			}
			normOrigin := normalizeOrigin(origin)
			for _, allowed := range normalized {
				if strings.EqualFold(allowed, normOrigin) {
					return true
				}
			}
			return false
		},
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Request-Id,X-Idempotency-Key,X-CSRF-Token,X-App-Scope",
		// Deprecation/Sunset/Link are exposed so browser clients can detect a
		// scheduled API retirement without a CORS error (see middleware.Deprecated).
		ExposeHeaders:    "X-CSRF-Token,X-Request-Id,Deprecation,Sunset,Link",
		AllowCredentials: true,
		MaxAge:           86400,
	})
}
