package orders

import (
	"errors"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// RegisterReturnRoutes wires the dashboard order-return endpoints.
func (h *Handler) RegisterReturnRoutes(r fiber.Router) {
	r.Get("/shops/:shopId/orders/:orderId/returns", middleware.RequireAuth(h.cfg), h.ListOrderReturns)
	r.Post("/shops/:shopId/orders/:orderId/returns", middleware.RequireAuth(h.cfg), h.CreateOrderReturn)
	r.Patch("/shops/:shopId/orders/returns/:returnId/status", middleware.RequireAuth(h.cfg), h.UpdateOrderReturnStatus)
}

func returnFail(c *fiber.Ctx, status int, msg string) error {
	return c.Status(status).JSON(fiber.Map{"success": false, "error": msg})
}

func (h *Handler) canAccessShopID(c *fiber.Ctx, shopID string) bool {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return false
	}
	if strings.EqualFold(user.Role, "ADMIN") {
		return true
	}
	return user.ShopID != "" && user.ShopID == shopID
}

// ListOrderReturns handles GET /shops/:shopId/orders/:orderId/returns.
func (h *Handler) ListOrderReturns(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.canAccessShopID(c, shopID) {
		return returnFail(c, fiber.StatusForbidden, "Forbidden")
	}
	rets, err := h.service.ListOrderReturns(c.Context(), shopID, c.Params("orderId"))
	if err != nil {
		return returnFail(c, fiber.StatusInternalServerError, "Failed to list returns")
	}
	if rets == nil {
		rets = []*OrderReturn{}
	}
	return c.JSON(fiber.Map{"success": true, "data": rets, "returns": rets})
}

// CreateOrderReturn handles POST /shops/:shopId/orders/:orderId/returns.
func (h *Handler) CreateOrderReturn(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return returnFail(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	shopID := c.Params("shopId")
	if !h.canAccessShopID(c, shopID) {
		return returnFail(c, fiber.StatusForbidden, "Forbidden")
	}
	orderID := c.Params("orderId")

	var input CreateReturnInput
	if err := c.BodyParser(&input); err != nil {
		return returnFail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	input.OrderID = orderID
	input.ShopID = shopID
	input.CreatedByID = user.ID

	// Verify the order belongs to this shop before recording the return.
	order, err := h.service.repo.FindByID(c.Context(), orderID)
	if err != nil || order.ShopID != shopID {
		return returnFail(c, fiber.StatusNotFound, "Order not found")
	}

	ret, err := h.service.CreateOrderReturn(c.Context(), &input)
	if err != nil {
		return returnFail(c, fiber.StatusInternalServerError, "Failed to create return: "+err.Error())
	}

	// Keep legacy behavior: a full-return request also flips the order status.
	if strings.EqualFold(strings.TrimSpace(c.Query("markReturned")), "1") || input.MarkOrderReturned {
		status := OrderStatusRefunded
		if _, err := h.service.repo.UpdateStatus(c.Context(), orderID, status, nil); err != nil {
			// non-fatal: the return itself was recorded
			_ = err
		}
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": ret})
}

// UpdateOrderReturnStatus handles PATCH /shops/:shopId/orders/returns/:returnId/status.
func (h *Handler) UpdateOrderReturnStatus(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.canAccessShopID(c, shopID) {
		return returnFail(c, fiber.StatusForbidden, "Forbidden")
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Status) == "" {
		req.Status = c.Query("status")
	}
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	switch req.Status {
	case "pending", "approved", "rejected", "processed":
	default:
		return returnFail(c, fiber.StatusBadRequest, "status must be pending|approved|rejected|processed")
	}
	if err := h.service.UpdateOrderReturnStatus(c.Context(), shopID, c.Params("returnId"), req.Status); err != nil {
		if errors.Is(err, errReturnNotFound) {
			return returnFail(c, fiber.StatusNotFound, "Return not found")
		}
		return returnFail(c, fiber.StatusInternalServerError, "Failed to update return status")
	}
	return c.JSON(fiber.Map{"success": true})
}

// PatchShopOrder handles PATCH /shops/:shopId/orders/:orderId — used by the POS
// full-return flow to flip an order into RETURNED with an optional note.
func (h *Handler) PatchShopOrder(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.canAccessShopID(c, shopID) {
		return returnFail(c, fiber.StatusForbidden, "Forbidden")
	}
	orderID := c.Params("orderId")
	order, err := h.service.repo.FindByID(c.Context(), orderID)
	if err != nil || order.ShopID != shopID {
		return returnFail(c, fiber.StatusNotFound, "Order not found")
	}

	var req struct {
		Status *string `json:"status"`
		Note   *string `json:"note"`
	}
	if err := c.BodyParser(&req); err != nil {
		return returnFail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if req.Status != nil && *req.Status != "" {
		if _, err := h.service.repo.UpdateStatus(c.Context(), orderID, OrderStatus(strings.ToUpper(*req.Status)), req.Note); err != nil {
			return returnFail(c, fiber.StatusInternalServerError, "Failed to update order")
		}
	} else if req.Note != nil {
		if _, err := h.service.repo.UpdateNotes(c.Context(), orderID, req.Note); err != nil {
			return returnFail(c, fiber.StatusInternalServerError, "Failed to update order")
		}
	}
	updated, err := h.service.repo.FindByID(c.Context(), orderID)
	if err != nil {
		return returnFail(c, fiber.StatusInternalServerError, "Failed to reload order")
	}
	return c.JSON(fiber.Map{"success": true, "data": updated})
}
