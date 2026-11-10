package complaints

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for complaints.
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new complaints handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers complaints routes. Paths mirror exactly what the
// dashboard CRM complaints page calls:
//   GET    /complaints/shop/:shopId
//   POST   /complaints
//   GET    /complaints/:id
//   PUT    /complaints/:id
//   DELETE /complaints/:id
//   POST   /complaints/bulk-delete
func (h *Handler) RegisterRoutes(app fiber.Router) {
	complaints := app.Group("/complaints")

	auth := middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience)

	complaints.Get("/shop/:shopId", auth, h.ListByShop)
	complaints.Post("/bulk-delete", auth, h.BulkDelete)
	complaints.Post("/", auth, h.Create)
	complaints.Get("/:id", auth, h.GetByID)
	complaints.Put("/:id", auth, h.Update)
	complaints.Patch("/:id", auth, h.Update)
	complaints.Delete("/:id", auth, h.Delete)
}

// Create handles POST /complaints
func (h *Handler) Create(c *fiber.Ctx) error {
	var req CreateComplaintDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ComplaintResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}
	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ComplaintResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	complaint, err := h.service.Create(c.Context(), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ComplaintResponse{
			Success: false,
			Error:   "Failed to create complaint",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(ComplaintResponse{
		Success: true,
		Data:    complaint,
	})
}

// GetByID handles GET /complaints/:id
func (h *Handler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")

	complaint, err := h.service.GetByID(c.Context(), id)
	if err != nil {
		if err.Error() == "complaint not found" {
			return c.Status(fiber.StatusNotFound).JSON(ComplaintResponse{
				Success: false,
				Error:   "Complaint not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ComplaintResponse{
			Success: false,
			Error:   "Failed to retrieve complaint",
		})
	}

	return c.JSON(ComplaintResponse{
		Success: true,
		Data:    complaint,
	})
}

// ListByShop handles GET /complaints/shop/:shopId
func (h *Handler) ListByShop(c *fiber.Ctx) error {
	shopID := c.Params("shopId")

	limit := 50
	offset := 0
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	var status *string
	if statusStr := c.Query("status"); statusStr != "" {
		s := statusStr
		status = &s
	}

	list, total, err := h.service.ListByShop(c.Context(), shopID, status, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ComplaintsListResponse{
			Success: false,
			Error:   "Failed to retrieve complaints",
		})
	}

	return c.JSON(ComplaintsListResponse{
		Success: true,
		Data:    list,
		Total:   total,
	})
}

// Update handles PUT/PATCH /complaints/:id
func (h *Handler) Update(c *fiber.Ctx) error {
	id := c.Params("id")

	var req UpdateComplaintDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ComplaintResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}
	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ComplaintResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	complaint, err := h.service.Update(c.Context(), id, &req)
	if err != nil {
		if err.Error() == "complaint not found" {
			return c.Status(fiber.StatusNotFound).JSON(ComplaintResponse{
				Success: false,
				Error:   "Complaint not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ComplaintResponse{
			Success: false,
			Error:   "Failed to update complaint",
		})
	}

	return c.JSON(ComplaintResponse{
		Success: true,
		Data:    complaint,
	})
}

// Delete handles DELETE /complaints/:id
func (h *Handler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ComplaintResponse{
			Success: false,
			Error:   "id مطلوب",
		})
	}

	if err := h.service.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ComplaintResponse{
			Success: false,
			Error:   "فشل الحذف",
		})
	}

	return c.JSON(fiber.Map{"success": true, "message": "تم الحذف بنجاح"})
}

// BulkDelete handles POST /complaints/bulk-delete
func (h *Handler) BulkDelete(c *fiber.Ctx) error {
	var req BulkDeleteDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(BulkDeleteResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}
	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(BulkDeleteResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	deleted, err := h.service.BulkDelete(c.Context(), req.IDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(BulkDeleteResponse{
			Success: false,
			Error:   "فشل الحذف الجماعي",
		})
	}

	return c.JSON(BulkDeleteResponse{
		Success: true,
		Deleted: deleted,
	})
}
