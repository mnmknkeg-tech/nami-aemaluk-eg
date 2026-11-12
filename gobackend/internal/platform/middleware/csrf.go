package middleware

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/gofiber/fiber/v2"
)

const (
	csrfCookieName = "ray_csrf"
	csrfHeaderName = "X-CSRF-Token"
)

var csrfExemptPrefixes = []string{
	"/api/v1/auth/login",
		"/api/v1/auth/signup",
		"/api/v1/auth/courier-signup",
		"/api/v1/auth/password/forgot",
		"/api/v1/auth/password/reset",
		"/api/v1/auth/bootstrap-admin",
		"/api/v1/auth/google",
		"/api/v1/auth/dev-merchant-login",
		"/api/v1/auth/dev-courier-login",
		"/api/v1/auth/dev-portal-login",
		// Refresh/logout authenticate via the ray_session cookie, which is
		// SameSite=Lax and therefore never attached to cross-site requests —
		// there is no CSRF surface to protect. They were NOT exempt before,
		// and since clients call refresh without a bearer token (it just
		// expired) and historically without the CSRF header, every production
		// refresh answered 403. Development never noticed because CSRF is
		// bypassed when IsDevelopment().
		"/api/v1/auth/refresh",
		"/api/v1/auth/logout",
		"/api/v1/analytics/visits",
	}

// CSRF protects state-changing endpoints against cross-site request forgery.
// Safe methods and configured auth endpoints are exempt.
func CSRF(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		method := strings.ToUpper(c.Method())
		path := strings.ToLower(c.Path())

		// Set the CSRF cookie only when the client does not have one yet (or it
		// was rotated after a verified mutation). Re-issuing it on every response
		// would force Set-Cookie onto cacheable public GETs and defeat HTTP
		// caching; token verification is unaffected (dev/CSRF-disabled bypass it).
		cookieToken := c.Cookies(csrfCookieName)
		if cookieToken == "" {
			cookieToken = generateCSRFToken()
			setCSRFCookie(c, cookieToken, cfg)
		}

		c.Set(csrfHeaderName, cookieToken)

		// Safe methods do not require the CSRF header.
		if method == "GET" || method == "HEAD" || method == "OPTIONS" {
			return c.Next()
		}

		// Exempt auth flows.
		if isCSRFExempt(path) {
			return c.Next()
		}

		if cfg.IsDevelopment() || cfg.Security.CSRFDisabled {
			return c.Next()
		}

		// Bearer-authenticated requests are immune to CSRF: a cross-site page
		// cannot attach the victim's Authorization header (the browser only
		// adds cookies on its own). Cross-origin frontends such as the
		// business app talk to this API with a bearer token obtained from
		// /auth/signup and can never read the API's CSRF cookie, so requiring
		// the double-submit token there breaks every mutation — it left
		// merchants with an account but no shop (POST /shops answered 403).
		if hasBearerAuth(c) {
			return c.Next()
		}

		headerToken := strings.TrimSpace(c.Get(csrfHeaderName))
		if headerToken == "" {
			return errors.Forbidden("csrf_token_missing", "رمز الحماية مطلوب")
		}

		// Constant-time comparison prevents timing side-channels on token equality.
		if subtle.ConstantTimeCompare([]byte(strings.ToLower(headerToken)), []byte(strings.ToLower(cookieToken))) != 1 {
			return errors.Forbidden("csrf_token_invalid", "رمز الحماية غير صالح")
		}

		// Rotate token after successful verification.
		newToken := generateCSRFToken()
		setCSRFCookie(c, newToken, cfg)
		c.Set(csrfHeaderName, newToken)

		return c.Next()
	}
}

// hasBearerAuth reports whether the request carries a non-empty
// "Authorization: Bearer <token>" header. Cookie-authenticated requests are
// unaffected and keep the full double-submit verification.
func hasBearerAuth(c *fiber.Ctx) bool {
	const prefix = "bearer "
	auth := strings.TrimSpace(c.Get(fiber.HeaderAuthorization))
	if len(auth) <= len(prefix) {
		return false
	}
	if !strings.EqualFold(auth[:len(prefix)], prefix) {
		return false
	}
	return strings.TrimSpace(auth[len(prefix):]) != ""
}

func generateCSRFToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func setCSRFCookie(c *fiber.Ctx, value string, cfg *config.Config) {
	cookie := fiber.Cookie{
		Name:     csrfCookieName,
		Value:    value,
		Path:     "/",
		HTTPOnly: false, // Must be readable by frontend JS to send back in header.
		SameSite: "Lax",
		Secure:   cfg.IsProduction(),
		MaxAge:   24 * 60 * 60,
	}
	if cfg.App.FrontendURL != "" && cfg.IsProduction() {
		// Only set domain in production when a single domain is configured.
		cookie.Domain = cfg.Auth.CookieDomain
	}
	c.Cookie(&cookie)
}

func isCSRFExempt(path string) bool {
	path = strings.ToLower(path)
	for _, p := range csrfExemptPrefixes {
		if strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}
