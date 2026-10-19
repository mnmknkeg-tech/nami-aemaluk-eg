package search

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for search
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new search handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers search routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	search := app.Group("/search")

	// Public search routes
	search.Get("/products", h.SearchProducts)
	search.Get("/shops", h.SearchShops)
	
	// Protected search routes
	search.Get("/orders", middleware.RequireAuth(h.config), h.SearchOrders)
}

// SearchProducts handles product search
func (h *Handler) SearchProducts(c *fiber.Ctx) error {
	var req SearchDTO
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ProductSearchResponse{
			Success: false,
			Error:   "Invalid query parameters",
		})
	}

	req.Query = c.Query("q")
	if req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ProductSearchResponse{
			Success: false,
			Error:   "Query parameter 'q' is required",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ProductSearchResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	results, total, err := h.service.SearchProducts(c.Context(), req.Query, req.ShopID, req.Category, req.MinPrice, req.MaxPrice, req.Limit, req.Offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ProductSearchResponse{
			Success: false,
			Error:   "Failed to search products",
		})
	}

	return c.JSON(ProductSearchResponse{
		Success: true,
		Data:    results,
		Total:   total,
	})
}

// SearchShops handles shop search
func (h *Handler) SearchShops(c *fiber.Ctx) error {
	var req SearchDTO
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ShopSearchResponse{
			Success: false,
			Error:   "Invalid query parameters",
		})
	}

	req.Query = c.Query("q")
	if req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ShopSearchResponse{
			Success: false,
			Error:   "Query parameter 'q' is required",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ShopSearchResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	results, total, err := h.service.SearchShops(c.Context(), req.Query, req.Category, req.Limit, req.Offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ShopSearchResponse{
			Success: false,
			Error:   "Failed to search shops",
		})
	}

	return c.JSON(ShopSearchResponse{
		Success: true,
		Data:    results,
		Total:   total,
	})
}

// SearchOrders handles order search
func (h *Handler) SearchOrders(c *fiber.Ctx) error {
	var req SearchDTO
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(OrderSearchResponse{
			Success: false,
			Error:   "Invalid query parameters",
		})
	}

	req.Query = c.Query("q")
	if req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(OrderSearchResponse{
			Success: false,
			Error:   "Query parameter 'q' is required",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(OrderSearchResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Check authorization
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(OrderSearchResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Set user ID for non-admin users
	if user.Role != "admin" && user.Role != "ADMIN" {
		req.UserID = &user.ID
		if user.ShopID != "" {
			req.ShopID = &user.ShopID
		}
	}

	results, total, err := h.service.SearchOrders(c.Context(), req.Query, req.ShopID, req.UserID, req.Limit, req.Offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(OrderSearchResponse{
			Success: false,
			Error:   "Failed to search orders",
		})
	}

	return c.JSON(OrderSearchResponse{
		Success: true,
		Data:    results,
		Total:   total,
	})
}
