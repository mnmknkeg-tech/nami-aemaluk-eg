package customers

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// RegisterSegmentsTagsRoutes adds segment & tag routing. Called from the
// customers RegisterRoutes so the dashboard CRM works end-to-end.
func (h *Handler) RegisterSegmentsTagsRoutes(app fiber.Router) {
	seg := app.Group("/shops/:shopId/segments")
	seg.Get("/", middleware.RequireAuth(h.config), h.ListSegmentsHandler)
	seg.Post("/", middleware.RequireAuth(h.config), h.CreateSegmentHandler)
	seg.Patch("/:id", middleware.RequireAuth(h.config), h.UpdateSegmentHandler)
	seg.Delete("/:id", middleware.RequireAuth(h.config), h.DeleteSegmentHandler)

	tag := app.Group("/shops/:shopId/tags")
	tag.Get("/", middleware.RequireAuth(h.config), h.ListTagsHandler)
	tag.Post("/", middleware.RequireAuth(h.config), h.CreateTagHandler)
	tag.Patch("/:id", middleware.RequireAuth(h.config), h.UpdateTagHandler)
	tag.Delete("/:id", middleware.RequireAuth(h.config), h.DeleteTagHandler)
}

func (h *Handler) shopAllowed(user middleware.AuthUser, shopID string) bool {
	if strings.EqualFold(user.Role, "ADMIN") {
		return true
	}
	return user.ShopID == shopID
}