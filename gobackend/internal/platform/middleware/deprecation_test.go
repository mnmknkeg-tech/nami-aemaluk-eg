package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	deprecationSince  = time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC)
	deprecationSunset = time.Date(2027, time.January, 1, 0, 0, 0, 0, time.UTC)
)

// The headers must follow the published RFCs so generic clients can read them.
func TestDeprecation_HeaderValues(t *testing.T) {
	headers := Deprecation{
		Since:       deprecationSince,
		Sunset:      deprecationSunset,
		DocURL:      "https://docs.ray.eg/migrations/orders",
		Replacement: "/api/v1/orders",
	}.HeaderValues()

	assert.Equal(t, deprecationSince.Format(http.TimeFormat), headers["Deprecation"])
	assert.Equal(t, deprecationSunset.Format(http.TimeFormat), headers["Sunset"])
	assert.Contains(t, headers[fiber.HeaderLink], `<https://docs.ray.eg/migrations/orders>; rel="deprecation"`)
	assert.Contains(t, headers[fiber.HeaderLink], `</api/v1/orders>; rel="successor-version"`)
}

// A deprecation without an approved sunset must not promise a shutdown date, and
// must never emit an empty Link header.
func TestDeprecation_HeaderValuesWithoutDates(t *testing.T) {
	headers := Deprecation{}.HeaderValues()

	assert.Equal(t, "true", headers["Deprecation"])
	assert.NotContains(t, headers, "Sunset")
	assert.NotContains(t, headers, fiber.HeaderLink)
}

// The middleware only annotates responses: status code and body stay untouched
// so a running client keeps working during the sunset window.
func TestDeprecated_KeepsRouteBehavior(t *testing.T) {
	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Get("/legacy", Deprecated(Deprecation{
		Since:       deprecationSince,
		Sunset:      deprecationSunset,
		DocURL:      "https://docs.ray.eg/migrations/legacy",
		Replacement: "/api/v1/current",
	}), func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"success": true})
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/legacy", nil))
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, deprecationSince.Format(http.TimeFormat), resp.Header.Get("Deprecation"))
	assert.Equal(t, deprecationSunset.Format(http.TimeFormat), resp.Header.Get("Sunset"))
	assert.Contains(t, resp.Header.Get(fiber.HeaderLink), "successor-version")
}

// Error responses of a deprecated route are annotated too, so a client that only
// sees failures still learns about the migration.
func TestDeprecated_AnnotatesErrorResponses(t *testing.T) {
	app := fiber.New(fiber.Config{ErrorHandler: NewErrorHandler()})
	app.Get("/legacy", Deprecated(Deprecation{}), func(c *fiber.Ctx) error {
		return fiber.ErrNotFound
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/legacy", nil))
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	assert.Equal(t, "true", resp.Header.Get("Deprecation"))
	assert.Empty(t, resp.Header.Get("Sunset"))
}
