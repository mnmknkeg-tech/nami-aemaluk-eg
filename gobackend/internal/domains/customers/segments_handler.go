package customers

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

type segmentBody struct {
	Name        string                 `json:"name"`
	NameAr      string                 `json:"nameAr"`
	Description string                 `json:"description"`
	Criteria    map[string]interface{} `json:"criteria"`
	IsActive    *bool                  `json:"isActive"`
}

type tagBody struct {
	Name        string `json:"name"`
	NameAr      string `json:"nameAr"`
	Color       string `json:"color"`
	Description string `json:"description"`
	IsActive    *bool  `json:"isActive"`
}

func (h *Handler) shopIDAndUser(c *fiber.Ctx) (string, bool, error) {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return "", false, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "error": "Unauthorized"})
	}
	shopID := c.Params("shopId")
	if shopID == "" {
		shopID = user.ShopID
	}
	if !h.shopAllowed(user, shopID) {
		return "", false, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"success": false, "error": "Forbidden"})
	}
	return shopID, true, nil
}

// ListSegmentsHandler handles GET /shops/:shopId/segments
func (h *Handler) ListSegmentsHandler(c *fiber.Ctx) error {
	shopID, ok, err := h.shopIDAndUser(c)
	if err != nil || !ok {
		return err
	}
	segments, err := h.service.ListSegments(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to retrieve segments"})
	}
	return c.JSON(fiber.Map{"success": true, "data": segments})
}

// CreateSegmentHandler handles POST /shops/:shopId/segments
func (h *Handler) CreateSegmentHandler(c *fiber.Ctx) error {
	shopID, ok, err := h.shopIDAndUser(c)
	if err != nil || !ok {
		return err
	}
	var body segmentBody
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	if body.Criteria == nil {
		body.Criteria = map[string]interface{}{}
	}
	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}
	seg, err := h.service.CreateSegment(c.Context(), shopID, body.Name, body.NameAr, body.Description, body.Criteria, active)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to create segment"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": seg})
}

// UpdateSegmentHandler handles PATCH /shops/:shopId/segments/:id
func (h *Handler) UpdateSegmentHandler(c *fiber.Ctx) error {
	shopID, ok, err := h.shopIDAndUser(c)
	if err != nil || !ok {
		return err
	}
	id := c.Params("id")
	var body segmentBody
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	if body.Criteria == nil {
		body.Criteria = map[string]interface{}{}
	}
	seg, err := h.service.UpdateSegment(c.Context(), shopID, id, body.Name, body.NameAr, body.Description, body.Criteria, body.IsActive)
	if err != nil {
		if err.Error() == "segment not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "Segment not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to update segment"})
	}
	return c.JSON(fiber.Map{"success": true, "data": seg})
}

// DeleteSegmentHandler handles DELETE /shops/:shopId/segments/:id
func (h *Handler) DeleteSegmentHandler(c *fiber.Ctx) error {
	shopID, ok, err := h.shopIDAndUser(c)
	if err != nil || !ok {
		return err
	}
	id := c.Params("id")
	if err := h.service.DeleteSegment(c.Context(), shopID, id); err != nil {
		if err.Error() == "segment not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "Segment not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to delete segment"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "cleared"})
}