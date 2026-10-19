package reservation

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for reservations
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new reservation handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers reservation routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	reservations := app.Group("/reservations")

	// Public routes (for creating reservations)
	reservations.Post("/", h.CreateReservation)
	reservations.Get("/:id", h.GetReservationByID)

	// Protected routes
	reservations.Get("/", middleware.RequireAuth(h.config), h.ListReservations)
	reservations.Patch("/:id/status", middleware.RequireAuth(h.config), h.UpdateReservationStatus)
	reservations.Get("/analytics", middleware.RequireAuth(h.config), h.GetReservationAnalytics)
}

// CreateReservation handles creating a new reservation
func (h *Handler) CreateReservation(c *fiber.Ctx) error {
	var req CreateReservationDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ReservationResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ReservationResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	reservation, err := h.service.CreateReservation(c.Context(), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ReservationResponse{
			Success: false,
			Error:   "Failed to create reservation",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(ReservationResponse{
		Success: true,
		Data:    reservation,
	})
}

// GetReservationByID handles retrieving a reservation by ID
func (h *Handler) GetReservationByID(c *fiber.Ctx) error {
	id := c.Params("id")

	reservation, err := h.service.GetReservationByID(c.Context(), id)
	if err != nil {
		if err.Error() == "reservation not found" {
			return c.Status(fiber.StatusNotFound).JSON(ReservationResponse{
				Success: false,
				Error:   "Reservation not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ReservationResponse{
			Success: false,
			Error:   "Failed to retrieve reservation",
		})
	}

	return c.JSON(ReservationResponse{
		Success: true,
		Data:    reservation,
	})
}

// ListReservations handles listing reservations with filters
func (h *Handler) ListReservations(c *fiber.Ctx) error {
	var req ListReservationsDTO
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ReservationsListResponse{
			Success: false,
			Error:   "Invalid query parameters",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ReservationsListResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Check authorization
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ReservationsListResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Admin can access all, others can only access their own
	if user.Role != "admin" && user.Role != "ADMIN" {
		if req.ShopID != nil && *req.ShopID != user.ShopID {
			return c.Status(fiber.StatusForbidden).JSON(ReservationsListResponse{
				Success: false,
				Error:   "Unauthorized",
			})
		}
		if req.UserID != nil && *req.UserID != user.ID {
			return c.Status(fiber.StatusForbidden).JSON(ReservationsListResponse{
				Success: false,
				Error:   "Unauthorized",
			})
		}

		// If no filters provided, default to user's own reservations
		if req.ShopID == nil && req.UserID == nil {
			req.UserID = &user.ID
		}
	}

	reservations, total, err := h.service.ListReservations(c.Context(), req.ShopID, req.UserID, req.Status, req.Limit, req.Offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ReservationsListResponse{
			Success: false,
			Error:   "Failed to retrieve reservations",
		})
	}

	return c.JSON(ReservationsListResponse{
		Success: true,
		Data:    reservations,
		Total:   total,
	})
}

// UpdateReservationStatus handles updating reservation status
func (h *Handler) UpdateReservationStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req UpdateStatusDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ReservationResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ReservationResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Check authorization
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ReservationResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Get reservation to check ownership
	reservation, err := h.service.GetReservationByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(ReservationResponse{
			Success: false,
			Error:   "Reservation not found",
		})
	}

	// Check if user can modify this reservation
	if user.Role != "admin" && user.Role != "ADMIN" {
		if reservation.ShopID != user.ShopID && reservation.CustomerID != nil && *reservation.CustomerID != user.ID {
			return c.Status(fiber.StatusForbidden).JSON(ReservationResponse{
				Success: false,
				Error:   "Unauthorized",
			})
		}
	}

	err = h.service.UpdateReservationStatus(c.Context(), id, req.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ReservationResponse{
			Success: false,
			Error:   "Failed to update reservation status",
		})
	}

	return c.JSON(ReservationResponse{Success: true})
}

// GetReservationAnalytics handles retrieving reservation analytics
func (h *Handler) GetReservationAnalytics(c *fiber.Ctx) error {
	shopID := c.Query("shop_id")

	// Check authorization
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(AnalyticsResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Admin can access all, merchants can only access their own
	var shopIDPtr *string
	if shopID != "" {
		if user.Role != "admin" && user.Role != "ADMIN" && user.ShopID != shopID {
			return c.Status(fiber.StatusForbidden).JSON(AnalyticsResponse{
				Success: false,
				Error:   "Unauthorized",
			})
		}
		shopIDPtr = &shopID
	} else if user.Role == "merchant" || user.Role == "MERCHANT" {
		shopIDPtr = &user.ShopID
	}

	analytics, err := h.service.GetReservationAnalytics(c.Context(), shopIDPtr)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(AnalyticsResponse{
			Success: false,
			Error:   "Failed to retrieve reservation analytics",
		})
	}

	return c.JSON(AnalyticsResponse{
		Success: true,
		Data:    analytics,
	})
}
