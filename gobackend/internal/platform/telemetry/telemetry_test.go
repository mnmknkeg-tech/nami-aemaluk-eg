package telemetry

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testToken(t *testing.T, secret, typ string) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "user-1",
		"typ": typ,
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	signed, err := token.SignedString([]byte(secret))
	require.NoError(t, err)
	return signed
}

// newProbeMetrics builds the same vectors Register() creates, without touching
// the default registry (which would make repeated runs in one process panic).
func newProbeMetrics() *Metrics {
	return &Metrics{
		HTTPRequestDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name: "probe_duration_seconds", Help: "probe",
		}, []string{"method", "route", "status"}),
		HTTPRequestTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "probe_requests_total", Help: "probe",
		}, []string{"method", "route", "status"}),
		HTTPAuthSourceTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "probe_auth_source_total", Help: "probe",
		}, []string{"method", "route", "auth_source"}),
	}
}

func newProbeApp(t *testing.T, metrics *Metrics, authed bool) *fiber.App {
	t.Helper()
	cfg := &config.Config{
		App:  config.AppConfig{Env: "development"},
		Auth: config.AuthConfig{JWTSecret: "dev-secret-32-chars-long-minimum"},
	}
	app := fiber.New(fiber.Config{ErrorHandler: middleware.NewErrorHandler()})
	if authed {
		app.Use(middleware.RequireAuth(cfg))
	}
	// Registered last, exactly like App.registerMiddleware, so its c.Next()
	// wraps the route chain that records the credential source.
	app.Use(metrics.FiberMiddleware())
	app.Get("/me", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"success": true})
	})
	return app
}

func TestFiberMiddleware_RecordsBearerSource(t *testing.T) {
	m := newProbeMetrics()
	app := newProbeApp(t, m, true)

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("Authorization", "Bearer "+testToken(t, "dev-secret-32-chars-long-minimum", "access"))
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	assert.Equal(t, float64(1), testutil.ToFloat64(m.HTTPAuthSourceTotal.WithLabelValues("GET", "/me", "bearer")))
	assert.Equal(t, float64(1), testutil.ToFloat64(m.HTTPRequestTotal.WithLabelValues("GET", "/me", "200")))
}

// This is the metric that decides when the ray_session compatibility bridge can
// be retired, so it must be reported separately from the access cookie.
func TestFiberMiddleware_RecordsSessionCookieBridge(t *testing.T) {
	m := newProbeMetrics()
	app := newProbeApp(t, m, true)

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.AddCookie(&http.Cookie{
		Name:  "ray_session",
		Value: testToken(t, "dev-secret-32-chars-long-minimum", "refresh"),
	})
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	assert.Equal(t, float64(1), testutil.ToFloat64(m.HTTPAuthSourceTotal.WithLabelValues("GET", "/me", "session_cookie")))
	assert.Equal(t, float64(0), testutil.ToFloat64(m.HTTPAuthSourceTotal.WithLabelValues("GET", "/me", "bearer")))
}

func TestFiberMiddleware_RecordsAnonymousSource(t *testing.T) {
	m := newProbeMetrics()
	app := newProbeApp(t, m, false)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/me", nil))
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	assert.Equal(t, float64(1), testutil.ToFloat64(m.HTTPAuthSourceTotal.WithLabelValues("GET", "/me", middleware.AuthSourceAnonymous)))
}
