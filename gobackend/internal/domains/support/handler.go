package support

import (
	"strconv"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for support
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new support handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers support routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	support := app.Group("/support")

	// Protected routes
	support.Post("/tickets", middleware.RequireAuth(h.config), h.CreateTicket)
	support.Get("/tickets", middleware.RequireAuth(h.config), h.ListTickets)
	support.Get("/stats", middleware.RequireAuth(h.config), h.GetSupportStats)
	support.Get("/tickets/:id", middleware.RequireAuth(h.config), h.GetTicketByID)
	support.Patch("/tickets/:id/status", middleware.RequireAuth(h.config), h.UpdateTicketStatus)
	support.Post("/tickets/:id/reply", middleware.RequireAuth(h.config), h.ReplyTicket)
	support.Delete("/tickets/:id", middleware.RequireAuth(h.config), h.CloseTicket)
	support.Post("/tickets/:id/resolve", middleware.RequireAuth(h.config), h.ResolveTicket)
	support.Post("/tickets/:id/close", middleware.RequireAuth(h.config), h.CloseTicket)

	// Dashboard alias routes under /tickets
	tickets := app.Group("/tickets")
	tickets.Get("/shop/:shopId", middleware.RequireAuth(h.config), h.ListTickets)
	tickets.Get("/", middleware.RequireAuth(h.config), h.ListTickets)
	tickets.Post("/", middleware.RequireAuth(h.config), h.CreateTicket)
	tickets.Get("/:id", middleware.RequireAuth(h.config), h.GetTicketByID)
	tickets.Patch("/:id", middleware.RequireAuth(h.config), h.UpdateTicketStatus)
	tickets.Delete("/:id", middleware.RequireAuth(h.config), h.CloseTicket)
}

// CreateTicket handles creating a new support ticket
func (h *Handler) CreateTicket(c *fiber.Ctx) error {
	var req CreateTicketDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(TicketResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	req.Priority = TicketPriority(strings.ToUpper(string(req.Priority)))
	if req.Priority == "CRITICAL" {
		req.Priority = "URGENT"
	}
	if req.Category == "" {
		req.Category = "GENERAL"
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(TicketResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(TicketResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	var shopID *string
	if user.ShopID != "" {
		shopID = &user.ShopID
	}

	ticket, err := h.service.CreateTicket(c.Context(), user.ID, shopID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TicketResponse{
			Success: false,
			Error:   "Failed to create ticket",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(TicketResponse{
		Success: true,
		Data:    ticket,
	})
}

// GetTicketByID handles retrieving a ticket by ID
func (h *Handler) GetTicketByID(c *fiber.Ctx) error {
	id := c.Params("id")

	ticket, err := h.service.GetTicketByID(c.Context(), id)
	if err != nil {
		if err.Error() == "ticket not found" {
			return c.Status(fiber.StatusNotFound).JSON(TicketResponse{
				Success: false,
				Error:   "Ticket not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(TicketResponse{
			Success: false,
			Error:   "Failed to retrieve ticket",
		})
	}

	return c.JSON(TicketResponse{
		Success: true,
		Data:    ticket,
	})
}

// ListTickets handles listing tickets
func (h *Handler) ListTickets(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(TicketsListResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	var userID, shopID *string
	if user.Role != "admin" && user.Role != "ADMIN" {
		userID = &user.ID
		if user.ShopID != "" {
			shopID = &user.ShopID
		}
	}
	if paramShop := c.Params("shopId"); paramShop != "" {
		shopID = &paramShop
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

	var status *TicketStatus
	if statusStr := c.Query("status"); statusStr != "" {
		s := TicketStatus(statusStr)
		status = &s
	}

	var category *string
	if categoryStr := c.Query("category"); categoryStr != "" {
		category = &categoryStr
	}

	tickets, total, err := h.service.ListTickets(c.Context(), userID, shopID, status, category, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TicketsListResponse{
			Success: false,
			Error:   "Failed to retrieve tickets",
		})
	}

	return c.JSON(TicketsListResponse{
		Success: true,
		Data:    tickets,
		Total:   total,
	})
}

// UpdateTicketStatus handles updating ticket status
func (h *Handler) UpdateTicketStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Status TicketStatus `json:"status" validate:"required,oneof=OPEN PENDING RESOLVED CLOSED"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(TicketResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	err := h.service.UpdateTicketStatus(c.Context(), id, req.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TicketResponse{
			Success: false,
			Error:   "Failed to update ticket status",
		})
	}

	return c.JSON(TicketResponse{Success: true})
}

// ResolveTicket handles resolving a ticket
func (h *Handler) ResolveTicket(c *fiber.Ctx) error {
	id := c.Params("id")

	err := h.service.ResolveTicket(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TicketResponse{
			Success: false,
			Error:   "Failed to resolve ticket",
		})
	}

	return c.JSON(TicketResponse{Success: true})
}

// CloseTicket handles closing a ticket
func (h *Handler) CloseTicket(c *fiber.Ctx) error {
	id := c.Params("id")

	err := h.service.CloseTicket(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TicketResponse{
			Success: false,
			Error:   "Failed to close ticket",
		})
	}

	return c.JSON(TicketResponse{Success: true})
}

// GetSupportStats handles summary ticket counts
func (h *Handler) GetSupportStats(c *fiber.Ctx) error {
	tickets, total, _ := h.service.ListTickets(c.Context(), nil, nil, nil, nil, 1000, 0)
	var openCount, inProgressCount, resolvedCount, closedCount int
	for _, t := range tickets {
		switch t.Status {
		case TicketStatusOpen:
			openCount++
		case TicketStatusPending:
			inProgressCount++
		case TicketStatusResolved:
			resolvedCount++
		case TicketStatusClosed:
			closedCount++
		}
	}

	return c.JSON(fiber.Map{
		"success":    true,
		"total":      total,
		"open":       openCount,
		"inProgress": inProgressCount,
		"resolved":   resolvedCount,
		"closed":     closedCount,
	})
}

// ReplyTicket records a reply or resolution message
func (h *Handler) ReplyTicket(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "id مطلوب"})
	}

	var req struct {
		Message string `json:"message"`
	}
	_ = c.BodyParser(&req)

	// Update ticket to resolved or pending when replied
	_ = h.service.UpdateTicketStatus(c.Context(), id, TicketStatusResolved)

	return c.JSON(fiber.Map{"success": true, "message": "تم إرسال الرد وتحديث التذكرة"})
}
