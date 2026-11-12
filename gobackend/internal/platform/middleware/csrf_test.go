package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCSRF_SafeMethodsAreExempt(t *testing.T) {
	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(CSRF(testConfig(t)))
	app.Get("/api/v1/test", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	cookie := findCookie(resp, csrfCookieName)
	assert.NotNil(t, cookie)
	assert.NotEmpty(t, resp.Header.Get(csrfHeaderName))
}

func TestCSRF_ExemptAuthPath(t *testing.T) {
	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(CSRF(testConfig(t)))
	app.Post("/api/v1/auth/login", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestCSRF_RequiresToken(t *testing.T) {
	cfg := testConfig(t)
	cfg.App.Env = "production"
	cfg.Security.CSRFDisabled = false

	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(CSRF(cfg))
	app.Post("/api/v1/shops", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	// First request to obtain the CSRF cookie and header.
	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/shops", nil)
	resp, err := app.Test(getReq)
	require.NoError(t, err)
	body, _ := io.ReadAll(resp.Body)
	_ = body

	cookie := findCookie(resp, csrfCookieName)
	require.NotNil(t, cookie)
	token := resp.Header.Get(csrfHeaderName)

	// Subsequent POST with matching header succeeds.
	postReq := httptest.NewRequest(http.MethodPost, "/api/v1/shops", nil)
	postReq.Header.Set(csrfHeaderName, token)
	postReq.AddCookie(cookie)
	resp2, err := app.Test(postReq)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp2.StatusCode)

	// POST without token is rejected.
	postReq2 := httptest.NewRequest(http.MethodPost, "/api/v1/shops", nil)
	resp3, err := app.Test(postReq2)
	require.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, resp3.StatusCode)
}

func TestCSRF_BearerTokenRequestsAreExempt(t *testing.T) {
	cfg := testConfig(t)
	cfg.App.Env = "production"
	cfg.Security.CSRFDisabled = false

	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Use(CSRF(cfg))
	app.Post("/api/v1/shops", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	// Cross-origin frontends authenticate with a bearer token and can never
	// read this API's CSRF cookie, so their mutations must pass without the
	// double-submit header (the merchant signup flow creates POST /shops).
	req := httptest.NewRequest(http.MethodPost, "/api/v1/shops", nil)
	req.Header.Set(fiber.HeaderAuthorization, "Bearer test-access-token")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// A blank bearer value must not bypass the check.
	blank := httptest.NewRequest(http.MethodPost, "/api/v1/shops", nil)
	blank.Header.Set(fiber.HeaderAuthorization, "Bearer    ")
	respBlank, err := app.Test(blank)
	require.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, respBlank.StatusCode)

	// Cookie-authenticated requests (no bearer header) keep the full check.
	noAuth := httptest.NewRequest(http.MethodPost, "/api/v1/shops", nil)
	respNoAuth, err := app.Test(noAuth)
	require.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, respNoAuth.StatusCode)
}

func findCookie(resp *http.Response, name string) *http.Cookie {
	for _, c := range resp.Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}
