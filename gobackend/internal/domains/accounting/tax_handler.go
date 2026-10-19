package accounting

import (
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// ---------------------------------------------------------------------------
// Phase 3 Handlers: Tax rates
// ---------------------------------------------------------------------------

func (h *Handler) ListTaxRates(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	rates, err := h.service.ListTaxRates(c.Context(), shopID)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": rates})
}

func (h *Handler) CreateTaxRate(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	var dto CreateTaxRateDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	rate, err := h.service.CreateTaxRate(c.Context(), shopID, user.ID, &dto)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(map[string]any{"success": true, "data": rate})
}

func (h *Handler) UpdateTaxRate(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	var dto UpdateTaxRateDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	rate, err := h.service.UpdateTaxRate(c.Context(), c.Params("id"), shopID, user.ID, &dto)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": rate})
}

func (h *Handler) DeleteTaxRate(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	if err := h.service.DeleteTaxRate(c.Context(), c.Params("id"), shopID, user.ID); err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true})
}

// ---------------------------------------------------------------------------
// Phase 3 Handlers: Fiscal periods
// ---------------------------------------------------------------------------

func (h *Handler) ListFiscalPeriods(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	periods, err := h.service.ListFiscalPeriods(c.Context(), shopID)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": periods})
}

func (h *Handler) CreateFiscalPeriod(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	var dto CreateFiscalPeriodDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	period, err := h.service.CreateFiscalPeriod(c.Context(), shopID, user.ID, dto.Year, dto.Month)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(map[string]any{"success": true, "data": period})
}

func (h *Handler) CloseFiscalPeriod(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	period, err := h.service.CloseFiscalPeriod(c.Context(), c.Params("id"), shopID, user.ID)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": period})
}

func (h *Handler) ReopenFiscalPeriod(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	period, err := h.service.ReopenFiscalPeriod(c.Context(), c.Params("id"), shopID, user.ID)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": period})
}

// ---------------------------------------------------------------------------
// Phase 3 Handlers: Tax returns (VAT)
// ---------------------------------------------------------------------------

func (h *Handler) ListTaxReturns(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	returns, err := h.service.ListTaxReturns(c.Context(), shopID)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": returns})
}

func (h *Handler) GenerateTaxReturn(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	var dto GenerateTaxReturnDTO
	if err := c.BodyParser(&dto); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := dto.Validate(h.validate); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	tr, err := h.service.GenerateTaxReturn(c.Context(), shopID, user.ID, dto.Year, dto.Month)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(map[string]any{"success": true, "data": tr})
}

func (h *Handler) SubmitTaxReturn(c *fiber.Ctx) error {
	shopID, ok := ownerShop(c)
	if !ok {
		return nil
	}
	user, _ := middleware.AuthUserFromContext(c)
	if err := h.service.SubmitTaxReturn(c.Context(), c.Params("id"), shopID, user.ID); err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(map[string]any{"success": true})
}

// ---------------------------------------------------------------------------
// Phase 3 Handlers: Audit log
// ---------------------------------------------------------------------------

func (h *Handler) ListAuditLog(c *fiber.Ctx) error {
	shopID, ok := resolveShop(c)
	if !ok {
		return nil
	}
	limit := c.QueryInt("limit", 200)
	entries, err := h.service.ListAuditLog(c.Context(), shopID, c.Query("type"), c.Query("action"), limit)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(map[string]any{"success": true, "data": entries})
}
