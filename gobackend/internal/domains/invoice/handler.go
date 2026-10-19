package invoice

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for invoice
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new invoice handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers invoice routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	invoice := app.Group("/invoices")

	// Protected routes
	invoice.Post("/", middleware.RequireAuth(h.config), h.CreateInvoice)
	invoice.Get("/", middleware.RequireAuth(h.config), h.ListInvoices)
	invoice.Get("/shop/:shopId", middleware.RequireAuth(h.config), h.ListInvoices)
	invoice.Get("/:id", middleware.RequireAuth(h.config), h.GetInvoiceByID)
	invoice.Patch("/:id/status", middleware.RequireAuth(h.config), h.UpdateInvoiceStatus)
	invoice.Post("/:id/pay", middleware.RequireAuth(h.config), h.MarkAsPaid)
	invoice.Post("/:id/cancel", middleware.RequireAuth(h.config), h.CancelInvoice)
	invoice.Post("/:id/send", middleware.RequireAuth(h.config), h.SendInvoice)
}

// SendInvoice handles POST /invoices/:id/send — marks the invoice as sent.
func (h *Handler) SendInvoice(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.service.SendInvoice(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(InvoiceResponse{
			Success: false,
			Error:   "Failed to send invoice",
		})
	}

	return c.JSON(InvoiceResponse{Success: true})
}

// CreateInvoice handles creating a new invoice
func (h *Handler) CreateInvoice(c *fiber.Ctx) error {
	var req CreateInvoiceDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(InvoiceResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(InvoiceResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	invoice, err := h.service.CreateInvoice(c.Context(), req.OrderID, req.ShopID, req.DueDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(InvoiceResponse{
			Success: false,
			Error:   "Failed to create invoice",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(InvoiceResponse{
		Success: true,
		Data:    invoice,
	})
}

// GetInvoiceByID handles retrieving an invoice by ID
func (h *Handler) GetInvoiceByID(c *fiber.Ctx) error {
	id := c.Params("id")

	invoice, err := h.service.GetInvoiceByID(c.Context(), id)
	if err != nil {
		if err.Error() == "invoice not found" {
			return c.Status(fiber.StatusNotFound).JSON(InvoiceResponse{
				Success: false,
				Error:   "Invoice not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(InvoiceResponse{
			Success: false,
			Error:   "Failed to retrieve invoice",
		})
	}

	return c.JSON(InvoiceResponse{
		Success: true,
		Data:    invoice,
	})
}

// ListInvoices handles listing invoices
func (h *Handler) ListInvoices(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(InvoicesListResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	var shopID, customerID *string
	if paramShop := c.Params("shopId"); paramShop != "" {
		shopID = &paramShop
	} else if user.ShopID != "" {
		shopID = &user.ShopID
	} else {
		customerID = &user.ID
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

	invoices, total, err := h.service.ListInvoices(c.Context(), shopID, customerID, nil, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(InvoicesListResponse{
			Success: false,
			Error:   "Failed to retrieve invoices",
		})
	}

	return c.JSON(InvoicesListResponse{
		Success: true,
		Data:    invoices,
		Total:   total,
	})
}

// UpdateInvoiceStatus handles updating invoice status
func (h *Handler) UpdateInvoiceStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Status InvoiceStatus `json:"status" validate:"required,oneof=DRAFT PENDING PAID OVERDUE CANCELLED"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(InvoiceResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	err := h.service.UpdateInvoiceStatus(c.Context(), id, req.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(InvoiceResponse{
			Success: false,
			Error:   "Failed to update invoice status",
		})
	}

	return c.JSON(InvoiceResponse{Success: true})
}

// MarkAsPaid handles marking an invoice as paid
func (h *Handler) MarkAsPaid(c *fiber.Ctx) error {
	id := c.Params("id")

	err := h.service.MarkInvoiceAsPaid(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(InvoiceResponse{
			Success: false,
			Error:   "Failed to mark invoice as paid",
		})
	}

	return c.JSON(InvoiceResponse{Success: true})
}

// CancelInvoice handles canceling an invoice
func (h *Handler) CancelInvoice(c *fiber.Ctx) error {
	id := c.Params("id")

	err := h.service.CancelInvoice(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(InvoiceResponse{
			Success: false,
			Error:   "Failed to cancel invoice",
		})
	}

	return c.JSON(InvoiceResponse{Success: true})
}
