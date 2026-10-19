package feedback

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for feedback
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new feedback handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers feedback routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	feedback := app.Group("/feedback")

	// Public routes
	feedback.Get("/shop/:shopId", h.ListFeedbackByShop)

	// Protected routes
	feedback.Get("/", middleware.RequireAuth(h.config), h.ListAllFeedback)
	feedback.Post("/", middleware.RequireAuth(h.config), h.CreateFeedback)
	feedback.Get("/:id", middleware.RequireAuth(h.config), h.GetFeedbackByID)
	feedback.Patch("/:id/status", middleware.RequireAuth(h.config), h.UpdateFeedbackStatus)
	feedback.Delete("/:id", middleware.RequireAuth(h.config), h.DeleteFeedback)
	feedback.Post("/:id/approve", middleware.RequireAuth(h.config), h.ApproveFeedback)
	feedback.Post("/:id/reject", middleware.RequireAuth(h.config), h.RejectFeedback)
}

// CreateFeedback handles creating a new feedback
func (h *Handler) CreateFeedback(c *fiber.Ctx) error {
	var req CreateFeedbackDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(FeedbackResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(FeedbackResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(FeedbackResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	feedback, err := h.service.CreateFeedback(c.Context(), user.ID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(FeedbackResponse{
			Success: false,
			Error:   "Failed to create feedback",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(FeedbackResponse{
		Success: true,
		Data:    feedback,
	})
}

// GetFeedbackByID handles retrieving a feedback by ID
func (h *Handler) GetFeedbackByID(c *fiber.Ctx) error {
	id := c.Params("id")

	feedback, err := h.service.GetFeedbackByID(c.Context(), id)
	if err != nil {
		if err.Error() == "feedback not found" {
			return c.Status(fiber.StatusNotFound).JSON(FeedbackResponse{
				Success: false,
				Error:   "Feedback not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(FeedbackResponse{
			Success: false,
			Error:   "Failed to retrieve feedback",
		})
	}

	return c.JSON(FeedbackResponse{
		Success: true,
		Data:    feedback,
	})
}

// ListFeedbackByShop handles listing feedback for a shop
func (h *Handler) ListFeedbackByShop(c *fiber.Ctx) error {
	shopID := c.Params("shopId")

	limit := 20
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

	var feedbackType *FeedbackType
	if typeStr := c.Query("type"); typeStr != "" {
		t := FeedbackType(typeStr)
		feedbackType = &t
	}

	var rating *int
	if ratingStr := c.Query("rating"); ratingStr != "" {
		if r, err := strconv.Atoi(ratingStr); err == nil {
			rating = &r
		}
	}

	feedbackList, total, err := h.service.ListFeedback(c.Context(), &shopID, nil, feedbackType, rating, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(FeedbackListResponse{
			Success: false,
			Error:   "Failed to retrieve feedback",
		})
	}

	return c.JSON(FeedbackListResponse{
		Success: true,
		Data:    feedbackList,
		Total:   total,
	})
}

// UpdateFeedbackStatus handles updating feedback status
func (h *Handler) UpdateFeedbackStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Status string `json:"status" validate:"required,oneof=PENDING APPROVED REJECTED"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(FeedbackResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	err := h.service.UpdateFeedbackStatus(c.Context(), id, req.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(FeedbackResponse{
			Success: false,
			Error:   "Failed to update feedback status",
		})
	}

	return c.JSON(FeedbackResponse{Success: true})
}

// ApproveFeedback handles approving feedback
func (h *Handler) ApproveFeedback(c *fiber.Ctx) error {
	id := c.Params("id")

	err := h.service.ApproveFeedback(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(FeedbackResponse{
			Success: false,
			Error:   "Failed to approve feedback",
		})
	}

	return c.JSON(FeedbackResponse{Success: true})
}

// RejectFeedback handles rejecting feedback
func (h *Handler) RejectFeedback(c *fiber.Ctx) error {
	id := c.Params("id")

	err := h.service.RejectFeedback(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(FeedbackResponse{
			Success: false,
			Error:   "Failed to reject feedback",
		})
	}

	return c.JSON(FeedbackResponse{Success: true})
}

// ListAllFeedback handles listing all feedback with filters for admin
func (h *Handler) ListAllFeedback(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("take", c.Query("limit", "50")))
	offset, _ := strconv.Atoi(c.Query("skip", c.Query("offset", "0")))

	var feedbackType *FeedbackType
	if typeStr := c.Query("type"); typeStr != "" {
		t := FeedbackType(typeStr)
		feedbackType = &t
	}

	var rating *int
	if ratingStr := c.Query("rating"); ratingStr != "" {
		if r, err := strconv.Atoi(ratingStr); err == nil {
			rating = &r
		}
	}

	feedbackList, total, err := h.service.ListFeedback(c.Context(), nil, nil, feedbackType, rating, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(FeedbackListResponse{
			Success: false,
			Error:   "Failed to retrieve feedback: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    feedbackList,
		"total":   total,
	})
}

// DeleteFeedback handles deleting feedback by ID
func (h *Handler) DeleteFeedback(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(FeedbackResponse{
			Success: false,
			Error:   "id مطلوب",
		})
	}

	err := h.service.DeleteFeedback(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(FeedbackResponse{
			Success: false,
			Error:   "فشل الحذف",
		})
	}

	return c.JSON(fiber.Map{"success": true, "message": "تم الحذف بنجاح"})
}
