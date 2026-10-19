package dashboard

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

var errNotFound = errors.New("entity not found")

// RegisterRoutes wires the generic entity CRUD plus computed analytics routes.
func (h *Handler) RegisterRoutes(app fiber.Router) {
	register := func(route string, spec kindSpec) {
		g := app.Group("/" + route)
		auth := middleware.RequireAuth(h.config)

		g.Get("/", auth, h.handleList(spec))
		g.Get("/shop/:shopId", auth, h.handleList(spec))
		g.Post("/", auth, h.handleCreate(spec))
		g.Post("/shop/:shopId", auth, h.handleCreateWithShopParam(spec))
		g.Get("/:id", auth, h.handleGet(spec))
		g.Put("/:id", auth, h.handleUpdate(spec))
		g.Patch("/:id", auth, h.handleUpdate(spec))
		g.Delete("/:id", auth, h.handleDelete(spec))
		g.Put("/:id/status", auth, h.handleStatus(spec))
		g.Patch("/:id/status", auth, h.handleStatus(spec))
		g.Put("/:id/post", auth, h.handlePostAction(spec))

		// Nested create under /shop/:shopId for clients that include the shop in the path.
		_ = g
	}

	for route := range entityKinds {
		spec := entityKinds[route] // capture per iteration
		register(route, spec)
	}
	for _, alias := range aliasGroups {
		if spec, ok := entityKinds[alias.Target]; ok {
			register(alias.Route, spec)
		}
	}

	// Computed finance endpoints.
	app.Get("/revenue/shop/:shopId", middleware.RequireAuth(h.config), h.Revenue)
	app.Get("/cashflow/shop/:shopId", middleware.RequireAuth(h.config), h.Cashflow)
	app.Get("/finance/profits/shop/:shopId", middleware.RequireAuth(h.config), h.Profits)
	app.Get("/finance/reports/shop/:shopId", middleware.RequireAuth(h.config), h.FinancialReports)
	app.Get("/marketing/hub/shop/:shopId", middleware.RequireAuth(h.config), h.MarketingHub)
	app.Get("/inventory/low-stock/shop/:shopId", middleware.RequireAuth(h.config), h.LowStockList)
	app.Put("/inventory/low-stock/:productId", middleware.RequireAuth(h.config), h.LowStockUpdate)

	// Marketing push notifications (create + send).
	app.Post("/notifications", middleware.RequireAuth(h.config), h.CreateNotification)
}

func (h *Handler) resolveShop(c *fiber.Ctx, bodyShopID string) (string, string, bool) {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		fail(c, fiber.StatusUnauthorized, "Unauthorized")
		return "", "", false
	}
	shopID := c.Params("shopId")
	if shopID == "" {
		shopID = bodyShopID
	}
	if shopID == "" {
		shopID = user.ShopID
	}
	if !strings.EqualFold(user.Role, "ADMIN") && shopID != user.ShopID {
		fail(c, fiber.StatusForbidden, "Forbidden")
		return "", "", false
	}
	return user.ID, shopID, true
}

func parseBody(c *fiber.Ctx) (map[string]any, bool) {
	body := map[string]any{}
	raw := c.Body()
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &body); err != nil {
			fail(c, fiber.StatusBadRequest, "Invalid request body")
			return nil, false
		}
	}
	return body, true
}

func handleErr(c *fiber.Ctx, err error) error {
	if errors.Is(err, errNotFound) {
		return fail(c, fiber.StatusNotFound, "Not found")
	}
	// Never expose raw driver/DB messages to clients; the central error
	// handler logs the root cause server-side.
	return fail(c, fiber.StatusInternalServerError, "internal server error")
}

// handleList serves GET /{route}/shop/:shopId and also GET /{route} when the
// caller is a merchant (shop resolved from token).
func (h *Handler) handleList(spec kindSpec) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return fail(c, fiber.StatusUnauthorized, "Unauthorized")
		}
		shopID := c.Params("shopId")
		if shopID == "" {
			shopID = user.ShopID
		} else if !strings.EqualFold(user.Role, "ADMIN") && shopID != user.ShopID {
			return fail(c, fiber.StatusForbidden, "Forbidden")
		}
		limit := c.QueryInt("limit", 500)
		offset := c.QueryInt("offset", 0)
		items, _, err := h.listEntities(c.Context(), spec, shopID, limit, offset)
		if err != nil {
			return handleErr(c, err)
		}
		return c.JSON(fiber.Map{"success": true, "data": items})
	}
}

// handleGet serves GET /{route}/:id.
func (h *Handler) handleGet(spec kindSpec) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return fail(c, fiber.StatusUnauthorized, "Unauthorized")
		}
		item, err := h.getEntity(c.Context(), spec, c.Params("id"), user.ShopID)
		if err != nil {
			return handleErr(c, err)
		}
		return c.JSON(fiber.Map{"success": true, "data": item})
	}
}

// handleCreate serves POST /{route}.
func (h *Handler) handleCreate(spec kindSpec) fiber.Handler {
	return func(c *fiber.Ctx) error {
		body, ok := parseBody(c)
		if !ok {
			return nil
		}
		bodyShopID, _ := body["shopId"].(string)
		_, shopID, ok := h.resolveShop(c, bodyShopID)
		if !ok {
			return nil
		}
		createdBy, _ := middleware.AuthUserFromContext(c)
		item, err := h.createEntity(c.Context(), spec, shopID, createdBy.ID, body)
		if err != nil {
			return handleErr(c, err)
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": item})
	}
}

// handleUpdate serves PUT/PATCH /{route}/:id.
func (h *Handler) handleUpdate(spec kindSpec) fiber.Handler {
	return func(c *fiber.Ctx) error {
		body, ok := parseBody(c)
		if !ok {
			return nil
		}
		bodyShopID, _ := body["shopId"].(string)
		_, shopID, ok := h.resolveShop(c, bodyShopID)
		if !ok {
			return nil
		}
		item, err := h.updateEntity(c.Context(), spec, c.Params("id"), shopID, body)
		if err != nil {
			return handleErr(c, err)
		}
		return c.JSON(fiber.Map{"success": true, "data": item})
	}
}

// handleDelete serves DELETE /{route}/:id.
func (h *Handler) handleDelete(spec kindSpec) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return fail(c, fiber.StatusUnauthorized, "Unauthorized")
		}
		if err := h.deleteEntity(c.Context(), spec, c.Params("id"), user.ShopID); err != nil {
			return handleErr(c, err)
		}
		return c.JSON(fiber.Map{"success": true})
	}
}

// handleCreateWithShopParam serves POST /{route}/shop/:shopId.
func (h *Handler) handleCreateWithShopParam(spec kindSpec) fiber.Handler {
	return func(c *fiber.Ctx) error {
		body, ok := parseBody(c)
		if !ok {
			return nil
		}
		_, shopID, ok := h.resolveShop(c, c.Params("shopId"))
		if !ok {
			return nil
		}
		createdBy, _ := middleware.AuthUserFromContext(c)
		item, err := h.createEntity(c.Context(), spec, shopID, createdBy.ID, body)
		if err != nil {
			return handleErr(c, err)
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": item})
	}
}

// handlePostAction serves PUT /{route}/:id/post — e.g. posting a journal entry.
func (h *Handler) handlePostAction(spec kindSpec) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return fail(c, fiber.StatusUnauthorized, "Unauthorized")
		}
		if err := h.updateEntityStatus(c.Context(), spec, c.Params("id"), user.ShopID, "posted"); err != nil {
			return handleErr(c, err)
		}
		return c.JSON(fiber.Map{"success": true})
	}
}

// handleStatus serves PUT/PATCH /{route}/:id/status.
func (h *Handler) handleStatus(spec kindSpec) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			Status string `json:"status"`
		}
		if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Status) == "" {
			req.Status = c.Query("status")
		}
		req.Status = strings.TrimSpace(req.Status)
		if req.Status == "" {
			return fail(c, fiber.StatusBadRequest, "status is required")
		}
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return fail(c, fiber.StatusUnauthorized, "Unauthorized")
		}
		if err := h.updateEntityStatus(c.Context(), spec, c.Params("id"), user.ShopID, req.Status); err != nil {
			return handleErr(c, err)
		}
		return c.JSON(fiber.Map{"success": true})
	}
}
