package customers

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for customers
type Handler struct {
	service *Service
	config  *config.Config
}

// NewHandler creates a new customers handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service: service,
		config:  cfg,
	}
}

// RegisterRoutes registers customers routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	customers := app.Group("/customers")

	// Protected routes
	customers.Get("/", middleware.RequireAuth(h.config), h.ListCustomers)
	customers.Get("/:id", middleware.RequireAuth(h.config), h.GetCustomerByID)
	customers.Get("/:id/stats", middleware.RequireAuth(h.config), h.GetCustomerStats)

	// Dashboard CRM routes (segments & tags) under /shops/:shopId/...
	h.RegisterSegmentsTagsRoutes(app)
	// Dashboard compatibility routes: /customers/shop/:shopId + promote
	h.RegisterDashboardRoutes(app)
	// Unified customer CRUD / search / archive / profile / statement / loyalty
	h.RegisterShopCustomerRoutes(app)
}

// ListCustomers handles listing all customers
func (h *Handler) ListCustomers(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(CustomersListResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	var shopID *string
	if user.ShopID != "" {
		shopID = &user.ShopID
	} else if user.Role != "admin" && user.Role != "ADMIN" {
		return c.Status(fiber.StatusForbidden).JSON(CustomersListResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

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

	customers, total, err := h.service.ListCustomers(c.Context(), shopID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(CustomersListResponse{
			Success: false,
			Error:   "Failed to retrieve customers",
		})
	}

	return c.JSON(CustomersListResponse{
		Success: true,
		Data:    customers,
		Total:   total,
	})
}

// GetCustomerByID handles retrieving a customer by ID
func (h *Handler) GetCustomerByID(c *fiber.Ctx) error {
	id := c.Params("id")

	customer, err := h.service.GetCustomerByID(c.Context(), id)
	if err != nil {
		if err.Error() == "customer not found" {
			return c.Status(fiber.StatusNotFound).JSON(CustomerResponse{
				Success: false,
				Error:   "Customer not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(CustomerResponse{
			Success: false,
			Error:   "Failed to retrieve customer",
		})
	}

	return c.JSON(CustomerResponse{
		Success: true,
		Data:    customer,
	})
}

// GetCustomerStats handles retrieving customer statistics
func (h *Handler) GetCustomerStats(c *fiber.Ctx) error {
	id := c.Params("id")

	stats, err := h.service.GetCustomerStats(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(CustomerStatsResponse{
			Success: false,
			Error:   "Failed to retrieve customer stats",
		})
	}

	return c.JSON(CustomerStatsResponse{
		Success: true,
		Data:    stats,
	})
}
