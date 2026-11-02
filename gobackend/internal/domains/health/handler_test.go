package health

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func newTestApp(h *Handler) *fiber.App {
	app := fiber.New()
	h.RegisterRoutes(app)
	return app
}

func TestLiveAlwaysReportsOK(t *testing.T) {
	h := &Handler{logger: zap.NewNop()}
	app := newTestApp(h)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/monitoring/live", nil))
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

// TestReadyFailsWithoutDatabasePool guards the regression that hid the real
// cause of production failures: with no DATABASE_URL the API used to answer
// 200 "ok" on /monitoring/ready while every /api/v1 request returned an opaque
// 500 "internal server error".
func TestReadyFailsWithoutDatabasePool(t *testing.T) {
	h := &Handler{logger: zap.NewNop()}
	app := newTestApp(h)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/monitoring/ready", nil))
	require.NoError(t, err)
	assert.Equal(t, http.StatusServiceUnavailable, resp.StatusCode)

	var body struct {
		Status string            `json:"status"`
		Checks map[string]string `json:"checks"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "degraded", body.Status)
	assert.Equal(t, "not_configured", body.Checks["database"])
	assert.Equal(t, "unknown", body.Checks["schema"])
}

// TestReadyReportsRedisAsMissingNotSilentlyOK documents that a missing Redis is
// surfaced rather than omitted from the payload.
func TestReadyReportsRedisAsMissingNotSilentlyOK(t *testing.T) {
	h := &Handler{logger: zap.NewNop()}
	app := newTestApp(h)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/monitoring/ready", nil))
	require.NoError(t, err)

	var body struct {
		Checks map[string]string `json:"checks"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "not_configured", body.Checks["redis"])
}

// TestVerifySchemaCacheSkipsRepeatedChecks verifies the readiness probe does not
// hit the database on every single request once a check succeeded.
func TestVerifySchemaCacheSkipsRepeatedChecks(t *testing.T) {
	h := &Handler{logger: zap.NewNop()}

	// A nil pool would panic inside VerifySchema, which is exactly what proves
	// the cache short-circuits before touching the database.
	h.schemaVerified = time.Now()

	err := h.verifySchema(httptest.NewRequest(http.MethodGet, "/", nil).Context())
	assert.NoError(t, err, "expected the cached schema result to short-circuit the DB check")
}
