package shops

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/google/uuid"
	"github.com/gofiber/fiber/v2"
)

// ModuleUpgradeRequest is one shop request to unlock extra modules.
type ModuleUpgradeRequest struct {
	ID               string    `json:"id"`
	ShopID           string    `json:"shopId"`
	Status           string    `json:"status"`
	RequestedModules []string  `json:"requestedModules"`
	Note             *string   `json:"note,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// ListMyModuleUpgradeRequests handles GET /shops/me/module-upgrade-requests.
func (h *Handler) ListMyModuleUpgradeRequests(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok || user.ShopID == "" {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	rows, err := h.service.repo.pool.Query(c.Context(),
		`SELECT id, shop_id, status::text, requested_modules, note, created_at, updated_at
		 FROM shop_module_upgrade_requests
		 WHERE shop_id = $1 AND status = 'PENDING'
		 ORDER BY created_at DESC`,
		user.ShopID,
	)
	if err != nil {
		return errors.Internal("db_error", err)
	}
	defer rows.Close()

	out := []ModuleUpgradeRequest{}
	for rows.Next() {
		var req ModuleUpgradeRequest
		var mods []string
		if err := rows.Scan(&req.ID, &req.ShopID, &req.Status, &mods, &req.Note, &req.CreatedAt, &req.UpdatedAt); err != nil {
			continue
		}
		req.RequestedModules = mods
		out = append(out, req)
	}
	return c.JSON(fiber.Map{"success": true, "data": out})
}

// CreateMyModuleUpgradeRequest handles POST /shops/me/module-upgrade-requests.
func (h *Handler) CreateMyModuleUpgradeRequest(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	shopID := user.ShopID
	if shopID == "" {
		// Fall back to the shop owned by this merchant.
		if err := h.service.repo.pool.QueryRow(c.Context(),
			`SELECT id FROM shops WHERE owner_id = $1 LIMIT 1`, user.ID,
		).Scan(&shopID); err != nil {
			return errors.Validation("no_shop", "لا يوجد متجر مرتبط بحسابك")
		}
	}

	var body struct {
		RequestedModules []string `json:"requestedModules"`
		Modules          []string `json:"modules"`
		Note             *string  `json:"note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	mods := body.RequestedModules
	if len(mods) == 0 {
		mods = body.Modules
	}
	cleaned := make([]string, 0, len(mods))
	for _, m := range mods {
		m = strings.TrimSpace(m)
		if m != "" {
			cleaned = append(cleaned, m)
		}
	}
	if len(cleaned) == 0 {
		return errors.Validation("no_modules", "لم يتم تحديد وحدات مطلوبة")
	}

	id := uuid.NewString()
	now := time.Now().UTC()
	_, err := h.service.repo.pool.Exec(c.Context(),
		`INSERT INTO shop_module_upgrade_requests (id, shop_id, status, requested_modules, note, requested_by_user_id, created_at, updated_at)
		 VALUES ($1,$2,'PENDING',$3,$4,$5,$6,$6)`,
		id, shopID, cleaned, body.Note, user.ID, now,
	)
	if err != nil {
		return errors.Internal("db_error", err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"id":               id,
			"shopId":           shopID,
			"status":           "PENDING",
			"requestedModules": cleaned,
			"createdAt":        now,
		},
	})
}

// AdminListModuleUpgradeRequests handles GET /shops/admin/module-upgrade-requests
func (h *Handler) AdminListModuleUpgradeRequests(c *fiber.Ctx) error {
	status := c.Query("status", "PENDING")
	take, _ := strconv.Atoi(c.Query("take", "50"))
	skip, _ := strconv.Atoi(c.Query("skip", "0"))
	shopID := c.Query("shopId")

	query := `SELECT id, shop_id, status::text, requested_modules, note, created_at, updated_at
	          FROM shop_module_upgrade_requests WHERE status = $1`
	args := []any{status}
	argIdx := 2

	if shopID != "" {
		query += fmt.Sprintf(" AND shop_id = $%d", argIdx)
		args = append(args, shopID)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, take, skip)

	rows, err := h.service.repo.pool.Query(c.Context(), query, args...)
	if err != nil {
		return errors.Internal("db_error", err)
	}
	defer rows.Close()

	out := []map[string]any{}
	for rows.Next() {
		var id, sid, status string
		var mods []string
		var note *string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&id, &sid, &status, &mods, &note, &createdAt, &updatedAt); err != nil {
			continue
		}
		// Get shop name/slug
		var shopName, shopSlug string
		h.service.repo.pool.QueryRow(c.Context(),
			`SELECT name, slug FROM shops WHERE id = $1`, sid,
		).Scan(&shopName, &shopSlug)

		out = append(out, map[string]any{
			"id": id, "shopId": sid, "status": status,
			"requestedModules": mods, "note": note,
			"createdAt": createdAt, "updatedAt": updatedAt,
			"shop": map[string]any{"name": shopName, "slug": shopSlug},
		})
	}
	return c.JSON(out)
}

// AdminApproveModuleUpgradeRequest handles POST /shops/admin/module-upgrade-requests/:id/approve
func (h *Handler) AdminApproveModuleUpgradeRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "معرّف الطلب مطلوب")
	}

	// Get request details
	var shopID string
	var mods []string
	err := h.service.repo.pool.QueryRow(c.Context(),
		`SELECT shop_id, requested_modules FROM shop_module_upgrade_requests WHERE id = $1 AND status = 'PENDING'`,
		id,
	).Scan(&shopID, &mods)
	if err != nil {
		return errors.NotFound("not_found", "الطلب غير موجود أو تم معالجته بالفعل")
	}

	// Get current layout_config
	var rawLayout []byte
	err = h.service.repo.pool.QueryRow(c.Context(),
		`SELECT COALESCE(layout_config, '{}'::jsonb) FROM shops WHERE id = $1`,
		shopID,
	).Scan(&rawLayout)
	if err != nil {
		rawLayout = []byte("{}")
	}

	layoutMap := make(map[string]any)
	_ = json.Unmarshal(rawLayout, &layoutMap)

	// Enabled modules set
	enabledModsSet := make(map[string]bool)
	if existingMods, ok := layoutMap["enabledModules"].([]any); ok {
		for _, m := range existingMods {
			if str, ok := m.(string); ok && str != "" {
				enabledModsSet[strings.ToLower(strings.TrimSpace(str))] = true
			}
		}
	}

	// Enabled features map: module -> []features
	enabledFeatsMap := make(map[string]map[string]bool)
	if existingFeats, ok := layoutMap["enabledFeatures"].(map[string]any); ok {
		for modKey, featList := range existingFeats {
			if fSlice, ok := featList.([]any); ok {
				if _, exists := enabledFeatsMap[modKey]; !exists {
					enabledFeatsMap[modKey] = make(map[string]bool)
				}
				for _, f := range fSlice {
					if fStr, ok := f.(string); ok && fStr != "" {
						enabledFeatsMap[modKey][fStr] = true
					}
				}
			}
		}
	}

	// Process each approved item
	for _, raw := range mods {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		if strings.Contains(raw, ":") {
			parts := strings.SplitN(raw, ":", 2)
			modKey := strings.ToLower(strings.TrimSpace(parts[0]))
			featKey := strings.TrimSpace(parts[1])
			if modKey != "" {
				enabledModsSet[modKey] = true
			}
			if modKey != "" && featKey != "" {
				if _, ok := enabledFeatsMap[modKey]; !ok {
					enabledFeatsMap[modKey] = make(map[string]bool)
				}
				enabledFeatsMap[modKey][featKey] = true
			}
		} else {
			modKey := strings.ToLower(raw)
			enabledModsSet[modKey] = true
		}
	}

	// Build updated slices
	finalMods := make([]string, 0, len(enabledModsSet))
	for m := range enabledModsSet {
		finalMods = append(finalMods, m)
	}

	finalFeats := make(map[string][]string)
	for modKey, fMap := range enabledFeatsMap {
		fList := make([]string, 0, len(fMap))
		for f := range fMap {
			fList = append(fList, f)
		}
		finalFeats[modKey] = fList
	}

	layoutMap["enabledModules"] = finalMods
	layoutMap["enabledFeatures"] = finalFeats

	updatedLayoutJSON, _ := json.Marshal(layoutMap)

	_, err = h.service.repo.pool.Exec(c.Context(),
		`UPDATE shops SET layout_config = $2::jsonb, updated_at = NOW() WHERE id = $1`,
		shopID, updatedLayoutJSON,
	)
	if err != nil {
		return errors.Internal("db_error", err)
	}

	// Update request status
	user, _ := middleware.AuthUserFromContext(c)
	_, err = h.service.repo.pool.Exec(c.Context(),
		`UPDATE shop_module_upgrade_requests
		 SET status = 'APPROVED', reviewed_by_admin_id = $2, reviewed_at = NOW(), updated_at = NOW()
		 WHERE id = $1`,
		id, user.ID,
	)
	if err != nil {
		return errors.Internal("db_error", err)
	}

	return c.JSON(fiber.Map{"success": true, "message": "تم قبول الطلب وتفعيل الوحدات والأزرار بنجاح"})
}

// AdminRejectModuleUpgradeRequest handles POST /shops/admin/module-upgrade-requests/:id/reject
func (h *Handler) AdminRejectModuleUpgradeRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "معرّف الطلب مطلوب")
	}

	var body struct {
		Note *string `json:"note"`
	}
	c.BodyParser(&body)

	user, _ := middleware.AuthUserFromContext(c)
	_, err := h.service.repo.pool.Exec(c.Context(),
		`UPDATE shop_module_upgrade_requests
		 SET status = 'REJECTED', note = $2, reviewed_by_admin_id = $3, reviewed_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND status = 'PENDING'`,
		id, body.Note, user.ID,
	)
	if err != nil {
		return errors.Internal("db_error", err)
	}

	return c.JSON(fiber.Map{"success": true, "message": "تم رفض الطلب"})
}
