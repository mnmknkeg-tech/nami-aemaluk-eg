package dashboard

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// LowStockList handles GET /inventory/low-stock/shop/:shopId.
func (h *Handler) LowStockList(c *fiber.Ctx) error {
	_, shopID, ok := h.resolveShop(c, "")
	if !ok {
		return nil
	}
	rows, err := h.pool.Query(c.Context(), `
		SELECT id, name, category, stock,
		       COALESCE(min_stock, 5), COALESCE(max_stock, 0),
		       COALESCE(reorder_point, COALESCE(min_stock, 5)), COALESCE(reorder_quantity, 0),
		       updated_at, created_at
		FROM products
		WHERE shop_id = $1 AND is_active AND track_stock
		  AND stock <= COALESCE(NULLIF(reorder_point, 0), NULLIF(min_stock, 0), 5)
		ORDER BY stock ASC LIMIT 200`,
		shopID,
	)
	if err != nil {
		return handleErr(c, err)
	}
	defer rows.Close()

	out := []map[string]any{}
	for rows.Next() {
		var (
			id              string
			name            string
			category        *string
			stock           int
			minStock        int
			maxStock        int
			reorderPoint    int
			reorderQuantity int
			updatedAt       time.Time
			createdAt       time.Time
		)
		if err := rows.Scan(&id, &name, &category, &stock, &minStock, &maxStock,
			&reorderPoint, &reorderQuantity, &updatedAt, &createdAt); err != nil {
			continue
		}
		status := "warning"
		if minStock > 0 && stock <= minStock/2 {
			status = "critical"
		}
		cat := ""
		if category != nil {
			cat = *category
		}
		out = append(out, map[string]any{
			"id":              id,
			"productId":       id,
			"productName":     name,
			"sku":             id[:8],
			"currentStock":    stock,
			"minStock":        minStock,
			"maxStock":        maxStock,
			"reorderPoint":    reorderPoint,
			"reorderQuantity": reorderQuantity,
			"category":        cat,
			"supplier":        "",
			"lastRestockDate": updatedAt.UTC().Format(time.RFC3339),
			"status":          status,
			"createdAt":       createdAt.UTC().Format(time.RFC3339),
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": out})
}

// LowStockUpdate handles PUT /inventory/low-stock/:productId — updates thresholds.
func (h *Handler) LowStockUpdate(c *fiber.Ctx) error {
	user, ok := authUser(c)
	if !ok {
		return fail(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	body, ok := parseBody(c)
	if !ok {
		return nil
	}

	minStock := intPtrFromAny(body["minStock"])
	maxStock := intPtrFromAny(body["maxStock"])
	reorderPoint := intPtrFromAny(body["reorderPoint"])
	reorderQty := intPtrFromAny(body["reorderQuantity"])

	tag, err := h.pool.Exec(c.Context(), `
		UPDATE products SET
			min_stock = COALESCE($1, min_stock),
			max_stock = COALESCE($2, max_stock),
			reorder_point = COALESCE($3, reorder_point),
			reorder_quantity = COALESCE($4, reorder_quantity),
			updated_at = NOW()
		WHERE id = $5 AND shop_id = $6`,
		minStock, maxStock, reorderPoint, reorderQty, c.Params("productId"), user.ShopID,
	)
	if err != nil {
		return handleErr(c, err)
	}
	if tag.RowsAffected() == 0 {
		return fail(c, fiber.StatusNotFound, "Product not found")
	}
	return c.JSON(fiber.Map{"success": true})
}
