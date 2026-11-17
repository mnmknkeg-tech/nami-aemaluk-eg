package auth

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLogoutClearsCookieAndReturnsSuccess(t *testing.T) {
	h := &Handler{
		cfg: AuthCookieConfig{
			Name:     "ray_session",
			MaxAge:   7 * 24 * time.Hour,
			SameSite: "Lax",
		},
	}

	app := fiber.New()
	app.Post("/logout", h.Logout)

	req := httptest.NewRequest(http.MethodPost, "/logout", nil)
	req.Header.Set("Authorization", "Bearer test-access-token")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	setCookie := resp.Header.Get("Set-Cookie")
	assert.Contains(t, setCookie, "ray_session=")
	// Fiber serializes the expiry attribute with a lowercase key ("expires=");
	// compare case-insensitively so the assertion matches either casing.
	assert.Contains(t, strings.ToLower(setCookie), "expires=thu, 01 jan 1970")
}
func TestGetRefreshTokenRespectsAppScope(t *testing.T) {
	handler := &Handler{cfg: AuthCookieConfig{Name: "ray_session"}}
	app := fiber.New()
	app.Get("/refresh", func(c *fiber.Ctx) error {
		return c.SendString(handler.getRefreshToken(c))
	})

	tests := []struct {
		name string
		scope string
		cookies map[string]string
		want string
	}{
		{name: "matching scoped cookie", scope: "business", cookies: map[string]string{"ray_session-BUSINESS": "business-token"}, want: "business-token"},
		{name: "other app cookie rejected", scope: "business", cookies: map[string]string{"ray_session-DASHBOARD": "dashboard-token"}, want: ""},
		{name: "legacy cookie rejected for scoped request", scope: "business", cookies: map[string]string{"ray_session": "legacy-token"}, want: ""},
		{name: "legacy cookie allowed without scope", cookies: map[string]string{"ray_session": "legacy-token"}, want: "legacy-token"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/refresh", nil)
			if tc.scope != "" {
				req.Header.Set("X-App-Scope", tc.scope)
			}
			for name, value := range tc.cookies {
				req.AddCookie(&http.Cookie{Name: name, Value: value})
			}
			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, http.StatusOK, resp.StatusCode)
			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)
			assert.Equal(t, tc.want, string(body))
			resp.Body.Close()
		})
	}
}
