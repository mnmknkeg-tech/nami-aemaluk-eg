package customers

import (
	"github.com/gofiber/fiber/v2"
)

// ListTagsHandler handles GET /shops/:shopId/tags
func (h *Handler) ListTagsHandler(c *fiber.Ctx) error {
	shopID, ok, err := h.shopIDAndUser(c)
	if err != nil || !ok {
		return err
	}
	tags, err := h.service.ListTags(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to retrieve tags"})
	}
	return c.JSON(fiber.Map{"success": true, "data": tags})
}

// CreateTagHandler handles POST /shops/:shopId/tags
func (h *Handler) CreateTagHandler(c *fiber.Ctx) error {
	shopID, ok, err := h.shopIDAndUser(c)
	if err != nil || !ok {
		return err
	}
	var body tagBody
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}
	tag, err := h.service.CreateTag(c.Context(), shopID, body.Name, body.NameAr, body.Color, body.Description, active)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to create tag"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": tag})
}

// UpdateTagHandler handles PATCH /shops/:shopId/tags/:id
func (h *Handler) UpdateTagHandler(c *fiber.Ctx) error {
	shopID, ok, err := h.shopIDAndUser(c)
	if err != nil || !ok {
		return err
	}
	id := c.Params("id")
	var body tagBody
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	tag, err := h.service.UpdateTag(c.Context(), shopID, id, body.Name, body.NameAr, body.Color, body.Description, body.IsActive)
	if err != nil {
		if err.Error() == "tag not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "Tag not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to update tag"})
	}
	return c.JSON(fiber.Map{"success": true, "data": tag})
}

// DeleteTagHandler handles DELETE /shops/:shopId/tags/:id
func (h *Handler) DeleteTagHandler(c *fiber.Ctx) error {
	shopID, ok, err := h.shopIDAndUser(c)
	if err != nil || !ok {
		return err
	}
	id := c.Params("id")
	if err := h.service.DeleteTag(c.Context(), shopID, id); err != nil {
		if err.Error() == "tag not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "Tag not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to delete tag"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "cleared"})
}