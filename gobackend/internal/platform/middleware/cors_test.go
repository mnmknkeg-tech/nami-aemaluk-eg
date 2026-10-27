package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testCORSConfig(t *testing.T, env string, origins []string) *config.Config {
	t.Helper()
	cfg := &config.Config{
		App: config.AppConfig{
			Env:           env,
			FrontendURL:   "https://app.example.com",
			PublicURL:     "https://api.example.com",
		},
		Auth: config.AuthConfig{
			JWTSecret: "dev-secret-32-chars-long-minimum",
		},
		Security: config.Security{
			CORSOrigins: origins,
		},
	}
	return cfg
}

func setupCORSApp(t *testing.T, cfg *config.Config) *fiber.App {
	t.Helper()
	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(CORS(cfg))
	app.Get("/api/v1/test", func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})
	return app
}

func TestCORS_DevelopmentAllowsAllOrigins(t *testing.T) {
	cfg := testCORSConfig(t, "development", nil)
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	req.Header.Set("Origin", "https://any-origin.com")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "https://any-origin.com", resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionMatchesExactOrigin(t *testing.T) {
	cfg := testCORSConfig(t, "production", []string{"https://app.example.com"})
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	req.Header.Set("Origin", "https://app.example.com")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "https://app.example.com", resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionRejectsUnlistedOrigin(t *testing.T) {
	cfg := testCORSConfig(t, "production", []string{"https://app.example.com"})
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	req.Header.Set("Origin", "https://evil.com")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Empty(t, resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionStripsEmbeddedQuotes(t *testing.T) {
	cfg := testCORSConfig(t, "production", []string{`"https://app.example.com"`})
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	req.Header.Set("Origin", "https://app.example.com")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "https://app.example.com", resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionStripsWhitespace(t *testing.T) {
	cfg := testCORSConfig(t, "production", []string{"  https://app.example.com  "})
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	req.Header.Set("Origin", "https://app.example.com")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "https://app.example.com", resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionCaseInsensitiveMatch(t *testing.T) {
	cfg := testCORSConfig(t, "production", []string{"HTTPS://APP.EXAMPLE.COM"})
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	req.Header.Set("Origin", "https://app.example.com")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "https://app.example.com", resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionRejectsEmptyOrigin(t *testing.T) {
	cfg := testCORSConfig(t, "production", []string{"https://app.example.com"})
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Empty(t, resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionRejectsWildcard(t *testing.T) {
	cfg := testCORSConfig(t, "production", []string{"*"})
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	req.Header.Set("Origin", "https://any-origin.com")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Empty(t, resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionMultipleOrigins(t *testing.T) {
	cfg := testCORSConfig(t, "production", []string{"https://app.example.com", "https://dashboard.example.com"})
	app := setupCORSApp(t, cfg)

	for _, origin := range []string{"https://app.example.com", "https://dashboard.example.com"} {
		t.Run(origin, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
			req.Header.Set("Origin", origin)
			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, http.StatusOK, resp.StatusCode)
			assert.Equal(t, origin, resp.Header.Get("Access-Control-Allow-Origin"))
		})
	}
}

func TestCORS_ProductionQuotedAndWhitespaceCombined(t *testing.T) {
	cfg := testCORSConfig(t, "production", []string{`  "https://app.example.com"  `})
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	req.Header.Set("Origin", "https://app.example.com")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "https://app.example.com", resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionFallsBackToFrontendURL(t *testing.T) {
	cfg := testCORSConfig(t, "production", nil)
	cfg.Security.CORSOrigins = nil
	app := setupCORSApp(t, cfg)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v1/test", nil)
	req.Header.Set("Origin", "https://app.example.com")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "https://app.example.com", resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestNormalizeOrigin_StripsQuotesAndWhitespace(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{`"https://example.com"`, "https://example.com"},
		{`'https://example.com'`, "https://example.com"},
		{`  https://example.com  `, "https://example.com"},
		{`  "https://example.com"  `, "https://example.com"},
		{`https://example.com`, "https://example.com"},
		{``, ""},
		{`*`, "*"},
	}
	for _, c := range cases {
		t.Run(c.input, func(t *testing.T) {
			assert.Equal(t, c.expected, normalizeOrigin(c.input))
		})
	}
}