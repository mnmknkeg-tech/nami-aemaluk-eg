package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequireAuth_ExtractsUserFromHeader(t *testing.T) {
	cfg := testConfig(t)
	token := buildToken(t, cfg.Auth.JWTSecret, jwt.MapClaims{
		"sub":    "user-123",
		"email":  "test@example.com",
		"role":   "merchant",
		"shopId": "shop-456",
		"typ":    "access",
	})

	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(RequireAuth(cfg))
	app.Get("/me", func(c *fiber.Ctx) error {
		u, ok := AuthUserFromContext(c)
		require.True(t, ok)
		return c.JSON(u)
	})

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestRequireAuth_RejectsInvalidToken(t *testing.T) {
	cfg := testConfig(t)
	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(RequireAuth(cfg))
	app.Get("/me", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

// One-time tokens (password reset, email verification) are signed with the
// same key as access tokens — they must never authenticate a request.
func TestRequireAuth_RejectsOneTimeTokenTypes(t *testing.T) {
	cfg := testConfig(t)
	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(RequireAuth(cfg))
	app.Get("/me", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	for _, typ := range []string{"password_reset", "email_verification", ""} {
		token := buildToken(t, cfg.Auth.JWTSecret, jwt.MapClaims{
			"sub":   "user-123",
			"email": "test@example.com",
			"typ":   typ,
		})
		req := httptest.NewRequest(http.MethodGet, "/me", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err, "typ=%q", typ)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode, "typ=%q must not authenticate", typ)
	}
}

// The session cookie stores the refresh token — cookie-sourced refresh tokens
// keep working for the httpOnly-cookie auth flow.
func TestRequireAuth_AcceptsRefreshTokenFromSessionCookie(t *testing.T) {
	cfg := testConfig(t)
	token := buildToken(t, cfg.Auth.JWTSecret, jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"typ":   "refresh",
	})

	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(RequireAuth(cfg))
	app.Get("/me", func(c *fiber.Ctx) error {
		u, ok := AuthUserFromContext(c)
		require.True(t, ok)
		return c.JSON(u)
	})

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.AddCookie(&http.Cookie{Name: "ray_session", Value: token})
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

// A refresh token presented via the Authorization header is rejected — that
// would let a leaked long-lived refresh token bypass the cookie protections.
func TestRequireAuth_RejectsRefreshTokenFromHeader(t *testing.T) {
	cfg := testConfig(t)
	token := buildToken(t, cfg.Auth.JWTSecret, jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"typ":   "refresh",
	})

	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(RequireAuth(cfg))
	app.Get("/me", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func buildToken(t *testing.T, secret string, claims jwt.MapClaims) string {
	t.Helper()
	if _, ok := claims["exp"]; !ok {
		claims["exp"] = time.Now().Add(time.Hour).Unix()
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := token.SignedString([]byte(secret))
	require.NoError(t, err)
	return s
}
