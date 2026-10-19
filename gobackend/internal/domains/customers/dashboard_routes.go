package customers

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// RegisterDashboardRoutes adds dashboard compatibility routes.
func (h *Handler) RegisterDashboardRoutes(app fiber.Router) {
	app.Get("/customers/shop/:shopId", middleware.RequireAuth(h.config), h.ListShopCustomersAlias)
	app.Post("/shops/:shopId/customers/:customerId/promote", middleware.RequireAuth(h.config), h.PromoteCustomer)
}

// ListShopCustomersAlias handles GET /customers/shop/:shopId.
func (h *Handler) ListShopCustomersAlias(c *fiber.Ctx) error {
	return h.ListCustomers(c)
}

// PromoteCustomer handles POST /shops/:shopId/customers/:customerId/promote —
// records a promotional notification addressed to the shop's customers.
func (h *Handler) PromoteCustomer(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "error": "Unauthorized"})
	}
	shopID := c.Params("shopId")
	if !strings.EqualFold(user.Role, "ADMIN") && user.ShopID != shopID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"success": false, "error": "Forbidden"})
	}
	customerID := c.Params("customerId")

	var req struct {
		Title   string `json:"title"`
		Message string `json:"message"`
		Body    string `json:"body"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "عرض ترويجي خاص"
	}
	message := strings.TrimSpace(req.Message)
	if message == "" {
		message = strings.TrimSpace(req.Body)
	}

	var customerName string
	err := h.service.repo.pool.QueryRow(c.Context(),
		`SELECT name FROM customers WHERE id = $1 AND shop_id = $2`, customerID, shopID,
	).Scan(&customerName)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "Customer not found"})
	}

	_, err = h.service.repo.pool.Exec(c.Context(),
		`INSERT INTO notifications (id, title, content, type, priority, shop_id, user_id, is_read, created_at, updated_at)
		 VALUES (gen_random_uuid()::text, $1, $2, 'PROMOTION', 'NORMAL', $3, NULL, false, NOW(), NOW())`,
		title, message, shopID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to record promotion"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "promotion sent to " + customerName})
}
