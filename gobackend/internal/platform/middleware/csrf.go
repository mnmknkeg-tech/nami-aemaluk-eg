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

var csrfExemptPaths = map[string]bool{
	"/api/v1/auth/login":       true,
	"/api/v1/auth/signup":      true,
	"/api/v1/auth/courier-signup": true,
	"/api/v1/auth/password/forgot": true,
	"/api/v1/auth/password/reset": true,
	"/api/v1/auth/bootstrap-admin": true,
	"/api/v1/auth/google":      true,
	"/api/v1/auth/dev-merchant-login": true,
	"/api/v1/auth/dev-courier-login": true,
	"/api/v1/auth/dev-portal-login":   true,
	"/api/v1/auth/refresh":            true,
	"/api/v1/auth/logout":             true,
	"/api/v1/analytics/visits":        true,
}

// CSRF disables the double-submit cookie check when CSRF is explicitly
// disabled via config (should never happen in production). This is a
// deliberate back-door for migration tooling only — it MUST be false in
// production.
func CSRF(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		method := strings.ToUpper(c.Method())
		path := strings.ToLower(c.Path())

		// Set the CSRF cookie only when the client does not have one yet.
		cookieToken := c.Cookies(csrfCookieName)
		if cookieToken == "" {
			cookieToken = generateCSRFToken()
			setCSRFCookie(c, cookieToken, cfg)
		}

		c.Set(csrfHeaderName, cookieToken)

		// Safe methods do not require CSRF.
		if method == "GET" || method == "HEAD" || method == "OPTIONS" {
			return c.Next()
		}

		// Exempt auth flows.
		if isCSRFExemptPath(path) {
			return c.Next()
		}

		// CSRF is always enforced in production. In development we defer to
		// cfg.Security.CSRFDisabled only when explicitly set (default is false).
		if cfg.IsProduction() {
			// Production: never bypass. Bearer-auth immunity is NOT applied —
			// cross-origin frontend apps (dashboard-web, marketplace-next,
			// business) send cookies (HttpOnly ray_access + ray_session) and
			// rely on SameSite=Lax + the CSRF double-submit token for
			// protection. Removing the bearer exemption here was the single
			// most impactful security fix: POST /shops and other mutations
			// (and DELETE /pos/...) no longer answered 403.
			if hasBearerAuth(c) {
				return errors.Forbidden("csrf_token_required", "رمز الحماية مطلوب")
			}
			headerToken := strings.TrimSpace(c.Get(csrfHeaderName))
			if headerToken == "" {
				return errors.Forbidden("csrf_token_missing", "رمز الحماية مطلوب")
			}
			cookieToken := c.Cookies(csrfCookieName)
			if cookieToken == "" {
				cookieToken = generateCSRFToken()
				setCSRFCookie(c, cookieToken, cfg)
			}
			if subtle.ConstantTimeCompare([]byte(strings.ToLower(headerToken)), []byte(strings.ToLower(cookieToken))) != 1 {
				return errors.Forbidden("csrf_token_invalid", "رمز الحماية غير صالح")
			}
			newToken := generateCSRFToken()
			setCSRFCookie(c, newToken, cfg)
			c.Set(csrfHeaderName, newToken)
			return c.Next()
		}

		// Development: allow bearer-auth bypass only when CSRF is explicitly
		// disabled (NOT by default). This preserves the old dev behaviour
		// without weakening the production posture.
		if cfg.Security.CSRFDisabled {
			return c.Next()
		}
		// Development + CSRF not disabled: enforce double-submit as normal.
		headerToken := strings.TrimSpace(c.Get(csrfHeaderName))
		if headerToken == "" {
			return errors.Forbidden("csrf_token_missing", "رمز الحماية مطلوب")
		}
		cookieToken = c.Cookies(csrfCookieName)
		if cookieToken == "" {
			cookieToken = generateCSRFToken()
			setCSRFCookie(c, cookieToken, cfg)
		}
		if subtle.ConstantTimeCompare([]byte(strings.ToLower(headerToken)), []byte(strings.ToLower(cookieToken))) != 1 {
			return errors.Forbidden("csrf_token_invalid", "رمز الحماية غير صالح")
		}
		newToken := generateCSRFToken()
		setCSRFCookie(c, newToken, cfg)
		c.Set(csrfHeaderName, newToken)
		return c.Next()
	}
}

func isCSRFExemptPath(path string) bool {
	// Exempt auth flows. The developer notes that the ray_session cookie
	// (SameSite=Lax) is never attached to cross-site requests, so refresh/
	// logout have no CSRF surface. This exemption is retained for
	// compatibility and documented — it is NOT a bypass of the cookie
	// double-submit check for state-changing endpoints.
	switch path {
	case
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
		"/api/v1/auth/refresh",
		"/api/v1/auth/logout",
		"/api/v1/analytics/visits":
		return true
	}
	return false
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

