package accounting

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/httpx"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler serves the accounting API routes.
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new accounting handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, config: cfg, validate: validator.New()}
}

// RegisterRoutes registers accounting routes under /accounting.
func (h *Handler) RegisterRoutes(app fiber.Router) {
	g := app.Group("/accounting")
	auth := middleware.RequireAuth(h.config)

	// Accounts (chart of accounts)
	g.Get("/accounts/shop/:shopId", auth, h.ListAccounts)
	g.Post("/accounts/shop/:shopId", auth, h.CreateAccount)
	g.Put("/accounts/:id", auth, h.UpdateAccount)
	g.Delete("/accounts/:id", auth, h.DeleteAccount)

	// Journal entries
	g.Get("/journal/shop/:shopId", auth, h.ListJournalEntries)
	g.Post("/journal/shop/:shopId", auth, h.CreateJournalEntry)
	g.Get("/journal/:id", auth, h.GetJournalEntry)
	g.Put("/journal/:id", auth, h.UpdateJournalEntry)
	g.Delete("/journal/:id", auth, h.DeleteJournalEntry)
	g.Post("/journal/:id/post", auth, h.PostJournalEntry)
	g.Post("/journal/:id/reverse", auth, h.ReverseJournalEntry)

	// Reports
	g.Get("/trial-balance/shop/:shopId", auth, h.TrialBalance)
	g.Get("/reports/income-statement/shop/:shopId", auth, h.IncomeStatement)
	g.Get("/reports/balance-sheet/shop/:shopId", auth, h.BalanceSheet)

	// Entities (customers / vendors)
	g.Get("/entities/shop/:shopId", auth, h.ListEntities)
	g.Post("/entities/shop/:shopId", auth, h.CreateEntity)
	g.Get("/entities/:id", auth, h.GetEntity)
	g.Put("/entities/:id", auth, h.UpdateEntity)
	g.Delete("/entities/:id", auth, h.DeleteEntity)

	// Invoices
	g.Get("/invoices/shop/:shopId", auth, h.ListInvoices)
	g.Post("/invoices/shop/:shopId", auth, h.CreateInvoice)
	g.Get("/invoices/:id", auth, h.GetInvoice)
	g.Put("/invoices/:id", auth, h.UpdateInvoice)
	g.Post("/invoices/:id/post", auth, h.PostInvoice)
	g.Post("/invoices/:id/cancel", auth, h.CancelInvoice)

	// Payments
	g.Get("/payments/shop/:shopId", auth, h.ListPayments)
	g.Post("/payments/shop/:shopId", auth, h.CreatePayment)
	g.Get("/payments/:id", auth, h.GetPayment)
	g.Post("/payments/:id/post", auth, h.PostPayment)

	// Aging
	g.Get("/aging/shop/:shopId", auth, h.AgingReport)

	// Phase 3: Tax rates
	g.Get("/tax-rates/shop/:shopId", auth, h.ListTaxRates)
	g.Post("/tax-rates/shop/:shopId", auth, h.CreateTaxRate)
	g.Put("/tax-rates/:id", auth, h.UpdateTaxRate)
	g.Delete("/tax-rates/:id", auth, h.DeleteTaxRate)

	// Phase 3: Fiscal periods
	g.Get("/fiscal-periods/shop/:shopId", auth, h.ListFiscalPeriods)
	g.Post("/fiscal-periods/shop/:shopId", auth, h.CreateFiscalPeriod)
	g.Post("/fiscal-periods/:id/close", auth, h.CloseFiscalPeriod)
	g.Post("/fiscal-periods/:id/reopen", auth, h.ReopenFiscalPeriod)

	// Phase 3: Tax returns (VAT)
	g.Get("/tax-returns/shop/:shopId", auth, h.ListTaxReturns)
	g.Post("/tax-returns/shop/:shopId/generate", auth, h.GenerateTaxReturn)
	g.Post("/tax-returns/:id/submit", auth, h.SubmitTaxReturn)

	// Phase 3: Audit log
	g.Get("/audit-log/shop/:shopId", auth, h.ListAuditLog)
}

func fail(c *fiber.Ctx, status int, msg string) error {
	return httpx.Fail(c, status, msg)
}

// resolveShop mirrors dashboard scoping: non-admins only access their own shop.
func resolveShop(c *fiber.Ctx) (string, bool) {
	return httpx.ResolveShop(c)
}

// ownerShop resolves the shop a by-id mutation must be scoped to. The
// /accounting routes that carry :id (and no :shopId) can otherwise be pointed
// at any row in the database — a merchant editing another merchant's journal
// entry. ADMINS keep cross-shop access; everyone else is pinned to their own
// shop and the repository adds `AND shop_id = $n` to the statement.
func ownerShop(c *fiber.Ctx) (string, bool) {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		_ = fail(c, fiber.StatusUnauthorized, "Unauthorized")
		return "", false
	}
	if strings.EqualFold(user.Role, "ADMIN") {
		return "", true // admin: no shop scoping (platform-wide access)
	}
	if user.ShopID == "" {
		_ = fail(c, fiber.StatusForbidden, "Forbidden")
		return "", false
	}
	return user.ShopID, true
}

// ------------------------------- Accounts ---------------------------------

func (h *Handler) ListAccounts(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	accounts, err := h.service.ListAccounts(c.Context(), shopID)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": accounts})
}

func (h *Handler) CreateAccount(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	var dto CreateAccountDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	acc, err := h.service.CreateAccount(c.Context(), shopID, &dto)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(map[string]any{"success": true, "data": acc})
}

func (h *Handler) UpdateAccount(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	var dto UpdateAccountDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	acc, err := h.service.UpdateAccount(c.Context(), c.Params("id"), shopID, &dto)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": acc})
}

func (h *Handler) DeleteAccount(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	if err := h.service.DeleteAccount(c.Context(), c.Params("id"), shopID); err != nil {
		if err == ErrAccountInUse {
			return fail(c, fiber.StatusConflict, err.Error())
		}
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true})
}

// ------------------------------- Journal ----------------------------------

func (h *Handler) ListJournalEntries(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	entries, err := h.service.ListJournalEntries(c.Context(), shopID, c.Query("status"), c.Query("from"), c.Query("to"))
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": entries})
}

func (h *Handler) GetJournalEntry(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	entry, err := h.service.GetJournalEntry(c.Context(), c.Params("id"), shopID)
	if err != nil {
		return fail(c, fiber.StatusNotFound, "القيد غير موجود")
	}
	return c.JSON(map[string]any{"success": true, "data": entry})
}

func (h *Handler) CreateJournalEntry(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	var dto CreateJournalEntryDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	entry, err := h.service.CreateJournalEntry(c.Context(), shopID, user.ID, &dto)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(map[string]any{"success": true, "data": entry})
}

func (h *Handler) UpdateJournalEntry(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	var dto UpdateJournalEntryDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	entry, err := h.service.UpdateJournalEntry(c.Context(), c.Params("id"), shopID, &dto)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": entry})
}

func (h *Handler) PostJournalEntry(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	entry, err := h.service.PostJournalEntry(c.Context(), c.Params("id"), shopID, user.ID)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": entry})
}

func (h *Handler) ReverseJournalEntry(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	entry, err := h.service.ReverseJournalEntry(c.Context(), c.Params("id"), shopID, user.ID)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": entry})
}

func (h *Handler) DeleteJournalEntry(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	if err := h.service.DeleteJournalEntry(c.Context(), c.Params("id"), shopID); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true})
}

// ------------------------------- Reports ----------------------------------

func (h *Handler) TrialBalance(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	tb, err := h.service.TrialBalance(c.Context(), shopID, c.Query("from"), c.Query("to"))
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": tb})
}

func (h *Handler) IncomeStatement(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	is, err := h.service.IncomeStatement(c.Context(), shopID, c.Query("from"), c.Query("to"))
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": is})
}

func (h *Handler) BalanceSheet(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	bs, err := h.service.BalanceSheet(c.Context(), shopID, c.Query("asOf"))
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": bs})
}

// ---------------------------------------------------------------------------
// Phase 2 Handlers: Entities
// ---------------------------------------------------------------------------

func (h *Handler) ListEntities(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	entities, err := h.service.ListEntities(c.Context(), shopID, c.Query("type"))
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": entities})
}

func (h *Handler) GetEntity(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	entity, err := h.service.GetEntity(c.Context(), c.Params("id"), shopID)
	if err != nil {
		return fail(c, fiber.StatusNotFound, ErrEntityNotFound.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": entity})
}

func (h *Handler) CreateEntity(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	var dto CreateEntityDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	entity, err := h.service.CreateEntity(c.Context(), shopID, user.ID, &dto)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(map[string]any{"success": true, "data": entity})
}

func (h *Handler) UpdateEntity(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	var dto UpdateEntityDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	entity, err := h.service.UpdateEntity(c.Context(), c.Params("id"), shopID, &dto)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": entity})
}

func (h *Handler) DeleteEntity(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	err := h.service.DeleteEntity(c.Context(), c.Params("id"), shopID)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": "deleted"})
}

// ---------------------------------------------------------------------------
// Phase 2 Handlers: Invoices
// ---------------------------------------------------------------------------

func (h *Handler) ListInvoices(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	inv, err := h.service.ListInvoices(c.Context(), shopID, c.Query("entityId"), c.Query("status"))
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": inv})
}

func (h *Handler) GetInvoice(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	inv, err := h.service.GetInvoice(c.Context(), c.Params("id"), shopID)
	if err != nil {
		return fail(c, fiber.StatusNotFound, ErrInvoiceNotFound.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": inv})
}

func (h *Handler) CreateInvoice(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	var dto CreateInvoiceDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	inv, err := h.service.CreateInvoice(c.Context(), shopID, user.ID, &dto)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(map[string]any{"success": true, "data": inv})
}

func (h *Handler) UpdateInvoice(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	var dto UpdateInvoiceDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	var number, dueDate string
	if dto.Number != nil {
		number = *dto.Number
	}
	if dto.DueDate != nil {
		dueDate = *dto.DueDate
	}
	inv, err := h.service.UpdateInvoice(c.Context(), c.Params("id"), shopID, number, dueDate)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": inv})
}

func (h *Handler) PostInvoice(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	inv, err := h.service.PostInvoice(c.Context(), c.Params("id"), shopID, user.ID)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": inv})
}

func (h *Handler) CancelInvoice(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	inv, err := h.service.CancelInvoice(c.Context(), c.Params("id"), shopID, user.ID)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": inv})
}

// ---------------------------------------------------------------------------
// Phase 2 Handlers: Payments
// ---------------------------------------------------------------------------

func (h *Handler) ListPayments(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	p, err := h.service.ListPayments(c.Context(), shopID, c.Query("entityId"))
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": p})
}

func (h *Handler) GetPayment(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	p, err := h.service.GetPayment(c.Context(), c.Params("id"), shopID)
	if err != nil {
		return fail(c, fiber.StatusNotFound, ErrPaymentNotFound.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": p})
}

func (h *Handler) CreatePayment(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	var dto CreatePaymentDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	p, err := h.service.CreatePayment(c.Context(), shopID, user.ID, &dto)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(map[string]any{"success": true, "data": p})
}

func (h *Handler) PostPayment(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	p, err := h.service.PostPayment(c.Context(), c.Params("id"), shopID, user.ID)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": p})
}

// ---------------------------------------------------------------------------
// Phase 2 Handlers: Aging
// ---------------------------------------------------------------------------

func (h *Handler) AgingReport(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	rows, err := h.service.CalculateAging(c.Context(), shopID, c.Query("type"), c.Query("asOf"))
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": rows})
}
