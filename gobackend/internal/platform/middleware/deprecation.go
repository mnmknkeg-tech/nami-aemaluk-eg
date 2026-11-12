package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Deprecation describes a scheduled API contract retirement. It carries no
// behavior: it only advertises the lifecycle of a route so clients can migrate
// before the route disappears.
type Deprecation struct {
	// Since is when the route became deprecated. Zero means "deprecated now"
	// and is rendered as the boolean form of the header.
	Since time.Time
	// Sunset is when the route is planned to stop responding. Zero omits the
	// header entirely: never promise a shutdown date that has not been approved.
	Sunset time.Time
	// DocURL points at the migration guide (rendered as rel="deprecation").
	DocURL string
	// Replacement is the path of the successor endpoint, if one exists
	// (rendered as rel="successor-version").
	Replacement string
}

// HeaderValues renders the standard lifecycle headers for the deprecation:
//
//	Deprecation: <IMF-fixdate>|true            (RFC 9745)
//	Sunset:      <IMF-fixdate>                (RFC 8594)
//	Link:        <doc>; rel="deprecation", <replacement>; rel="successor-version" (RFC 8288)
//
// Exported so the API inventory report and tests describe exactly what the
// middleware emits.
func (d Deprecation) HeaderValues() map[string]string {
	headers := map[string]string{}

	if d.Since.IsZero() {
		headers["Deprecation"] = "true"
	} else {
		headers["Deprecation"] = d.Since.UTC().Format(http.TimeFormat)
	}

	if !d.Sunset.IsZero() {
		headers["Sunset"] = d.Sunset.UTC().Format(http.TimeFormat)
	}

	links := make([]string, 0, 2)
	if d.DocURL != "" {
		links = append(links, fmt.Sprintf("<%s>; rel=\"deprecation\"; type=\"text/html\"", d.DocURL))
	}
	if d.Replacement != "" {
		links = append(links, fmt.Sprintf("<%s>; rel=\"successor-version\"", d.Replacement))
	}
	if len(links) > 0 {
		headers[fiber.HeaderLink] = strings.Join(links, ", ")
	}

	return headers
}

// Deprecated returns a route-level middleware that advertises the deprecation of
// a single route through the Deprecation, Sunset and Link response headers.
//
// Register it after the auth middleware and immediately before the handler so
// the headers are attached to every response of that route, including errors:
//
//	legacy := api.Group("/legacy", middleware.RequireAuth(cfg))
//	legacy.Get("/orders", middleware.Deprecated(middleware.Deprecation{
//		Since:       time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC),
//		Sunset:      time.Date(2027, time.January, 1, 0, 0, 0, 0, time.UTC),
//		DocURL:      "https://docs.ray.eg/api/migrations/orders-v2",
//		Replacement: "/api/v1/orders",
//	}), h.ListLegacyOrders)
//
// The middleware never changes the status code or body of the route, so the
// contract stays intact until the sunset date is reached.
func Deprecated(dep Deprecation) fiber.Handler {
	headers := dep.HeaderValues()
	return func(c *fiber.Ctx) error {
		for name, value := range headers {
			c.Set(name, value)
		}
		return c.Next()
	}
}
