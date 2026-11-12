package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func readBody(t *testing.T, resp *http.Response) string {
	t.Helper()
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	return string(body)
}

// newSourceProbeApp serves GET /me and echoes the recorded credential source so
// the tests can assert exactly what telemetry would record.
func newSourceProbeApp(t *testing.T, authed bool) *fiber.App {
	t.Helper()
	cfg := testConfig(t)
	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	if authed {
		app.Use(RequireAuth(cfg))
	} else {
		app.Use(OptionalAuth(cfg))
	}
	app.Get("/me", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"source": AuthSourceFromContext(c)})
	})
	return app
}

func TestAuthSource_BearerHeader(t *testing.T) {
	cfg := testConfig(t)
	token := buildToken(t, cfg.Auth.JWTSecret, jwt.MapClaims{
		"sub": "user-123",
		"typ": "access",
	})

	app := newSourceProbeApp(t, true)
	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Contains(t, readBody(t, resp), `"source":"bearer"`)
}

// The scoped ray_access cookie is the modern browser credential.
func TestAuthSource_AccessCookie(t *testing.T) {
	cfg := testConfig(t)
	token := buildToken(t, cfg.Auth.JWTSecret, jwt.MapClaims{
		"sub": "user-123",
		"typ": "access",
	})

	app := newSourceProbeApp(t, true)
	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("X-App-Scope", "dashboard")
	req.AddCookie(&http.Cookie{Name: "ray_access-DASHBOARD", Value: token})

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Contains(t, readBody(t, resp), `"source":"cookie"`)
}

// The ray_session refresh-token cookie is the compatibility bridge that must be
// measured before it is retired.
func TestAuthSource_SessionCookieBridge(t *testing.T) {
	cfg := testConfig(t)
	token := buildToken(t, cfg.Auth.JWTSecret, jwt.MapClaims{
		"sub": "user-123",
		"typ": "refresh",
	})

	app := newSourceProbeApp(t, true)
	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.AddCookie(&http.Cookie{Name: "ray_session", Value: token})

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Contains(t, readBody(t, resp), `"source":"session_cookie"`)
}

// Anonymous requests through OptionalAuth record no source at all — telemetry
// renders that as "anonymous".
func TestAuthSource_AnonymousWithOptionalAuth(t *testing.T) {
	app := newSourceProbeApp(t, false)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/me", nil))
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Contains(t, readBody(t, resp), `"source":""`)

	emptyApp := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	emptyApp.Get("/me", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"source": AuthSourceFromContext(c)})
	})
	plain, err := emptyApp.Test(httptest.NewRequest(http.MethodGet, "/me", nil))
	require.NoError(t, err)
	assert.Equal(t, "anonymous", AuthSourceAnonymous)
	assert.Contains(t, readBody(t, plain), `"source":""`)
}
