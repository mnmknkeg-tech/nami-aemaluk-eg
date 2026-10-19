package analytics

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// visitsTestConfig builds a minimal config; only the JWT secret matters for
// the auth chain exercised here.
func visitsTestConfig() *config.Config {
	return &config.Config{
		App:  config.AppConfig{Env: "development"},
		Auth: config.AuthConfig{JWTSecret: "dev-secret-32-chars-long-minimum"},
	}
}

// visitsTestToken signs a JWT exactly like the auth domain does.
func visitsTestToken(t *testing.T, secret, role string) string {
	t.Helper()
	claims := jwt.MapClaims{
		"sub":   "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
		"email": "user@example.com",
		"role":  role,
		"typ":   "access",
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	require.NoError(t, err)
	return signed
}

// visitsProbeHandler never touches the database: it only proves that the
// auth + RBAC chain let the request through to the guarded handler.
func visitsProbeHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true, "reached": true})
}

func newVisitsGuardApp(cfg *config.Config) *fiber.App {
	app := fiber.New(fiber.Config{ErrorHandler: middleware.NewErrorHandler()})
	app.Get("/api/v1/analytics/visits",
		middleware.RequireAuth(cfg), RequireVisitAdmin(), visitsProbeHandler)
	return app
}

// The reporting endpoints must be admin-only: unauthenticated → 401.
func TestVisitReportRequiresAuthentication(t *testing.T) {
	cfg := visitsTestConfig()
	app := newVisitsGuardApp(cfg)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/analytics/visits", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

// A valid non-admin token (merchant) is rejected with 403.
func TestVisitReportBlocksNonAdminRole(t *testing.T) {
	cfg := visitsTestConfig()
	app := newVisitsGuardApp(cfg)

	token := visitsTestToken(t, cfg.Auth.JWTSecret, middleware.RoleMerchant)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/analytics/visits", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

// An admin token passes the guard and reaches the handler.
func TestVisitReportAllowsAdminRole(t *testing.T) {
	cfg := visitsTestConfig()
	app := newVisitsGuardApp(cfg)

	token := visitsTestToken(t, cfg.Auth.JWTSecret, middleware.RoleAdmin)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/analytics/visits", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

// RecordVisit validates the payload: a malformed JSON body must be rejected
// with a validation error (400) before any database access is attempted.
func TestRecordVisitRejectsInvalidBody(t *testing.T) {
	h := &Handler{config: visitsTestConfig()}
	app := fiber.New(fiber.Config{ErrorHandler: middleware.NewErrorHandler()})
	app.Post("/api/v1/analytics/visits", h.RecordVisit)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/analytics/visits",
		strings.NewReader(`{"path": `))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}