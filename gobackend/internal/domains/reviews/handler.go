package reviews

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for reviews
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new reviews handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers review routes on the existing product and shop groups
func (h *Handler) RegisterProductRoutes(r fiber.Router) {
	g := r.Group("/products")
	g.Get("/:id/reviews", h.ListProductReviews)
	g.Post("/:id/reviews", middleware.RequireAuth(h.config), h.CreateProductReview)
	g.Delete("/:id/reviews/:reviewId", middleware.RequireAuth(h.config), h.DeleteReview)
}

// RegisterShopRoutes registers review routes on the shop group
func (h *Handler) RegisterShopRoutes(r fiber.Router) {
	g := r.Group("/shops")
	g.Get("/:id/reviews", h.ListShopReviews)
	g.Post("/:id/reviews", middleware.RequireAuth(h.config), h.CreateShopReview)
	g.Delete("/:id/reviews/:reviewId", middleware.RequireAuth(h.config), h.DeleteReview)
}

// ListProductReviews handles listing reviews for a product
func (h *Handler) ListProductReviews(c *fiber.Ctx) error {
	targetID := c.Params("id")
	if targetID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ReviewListResponse{Success: false, Error: "Product ID is required"})
	}

	limit, offset := parsePagination(c)

	reviews, total, avg, err := h.service.ListReviews(c.Context(), ReviewTargetProduct, targetID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ReviewListResponse{Success: false, Error: "Failed to retrieve reviews"})
	}

	return c.JSON(ReviewListResponse{
		Success: true,
		Data:    reviews,
		Total:   total,
		Average: avg,
	})
}

// CreateProductReview handles creating a review for a product
func (h *Handler) CreateProductReview(c *fiber.Ctx) error {
	targetID := c.Params("id")
	if targetID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ReviewResponse{Success: false, Error: "Product ID is required"})
	}

	return h.createReview(c, ReviewTargetProduct, targetID)
}

// ListShopReviews handles listing reviews for a shop
func (h *Handler) ListShopReviews(c *fiber.Ctx) error {
	targetID := c.Params("id")
	if targetID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ReviewListResponse{Success: false, Error: "Shop ID is required"})
	}

	limit, offset := parsePagination(c)

	reviews, total, avg, err := h.service.ListReviews(c.Context(), ReviewTargetShop, targetID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ReviewListResponse{Success: false, Error: "Failed to retrieve reviews"})
	}

	return c.JSON(ReviewListResponse{
		Success: true,
		Data:    reviews,
		Total:   total,
		Average: avg,
	})
}

// CreateShopReview handles creating a review for a shop
func (h *Handler) CreateShopReview(c *fiber.Ctx) error {
	targetID := c.Params("id")
	if targetID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ReviewResponse{Success: false, Error: "Shop ID is required"})
	}

	return h.createReview(c, ReviewTargetShop, targetID)
}

// DeleteReview handles deleting a review
func (h *Handler) DeleteReview(c *fiber.Ctx) error {
	reviewID := c.Params("reviewId")
	if reviewID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ReviewResponse{Success: false, Error: "Review ID is required"})
	}

	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ReviewResponse{Success: false, Error: "Unauthorized"})
	}

	if err := h.service.DeleteReview(c.Context(), reviewID, user.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ReviewResponse{Success: false, Error: "Failed to delete review"})
	}

	return c.JSON(ReviewResponse{Success: true})
}

func (h *Handler) createReview(c *fiber.Ctx, targetType ReviewTarget, targetID string) error {
	var req CreateReviewDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ReviewResponse{Success: false, Error: "Invalid request body"})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ReviewResponse{Success: false, Error: err.Error()})
	}

	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ReviewResponse{Success: false, Error: "Unauthorized"})
	}

	review, err := h.service.CreateReview(c.Context(), user.ID, targetType, targetID, &req)
	if err != nil {
		if err.Error() == "you have already reviewed this" {
			return c.Status(fiber.StatusConflict).JSON(ReviewResponse{Success: false, Error: err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ReviewResponse{Success: false, Error: "Failed to create review"})
	}

	return c.Status(fiber.StatusCreated).JSON(ReviewResponse{Success: true, Data: review})
}

func parsePagination(c *fiber.Ctx) (int, int) {
	limit := 20
	offset := 0

	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 {
		limit = l
	}
	if o, err := strconv.Atoi(c.Query("offset")); err == nil && o >= 0 {
		offset = o
	}

	return limit, offset
}
