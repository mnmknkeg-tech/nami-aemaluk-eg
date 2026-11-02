package products

import (
	"context"
	"strconv"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/jackc/pgx/v5"
	"github.com/gofiber/fiber/v2"
)

// maxImportDraftItems caps one bulk-import request. Larger imports are
// chunked client-side; the limit keeps request bodies and transaction
// durations bounded.
const maxImportDraftItems = 2000

// ImportDraftItem is one product row in a bulk import payload.
type ImportDraftItem struct {
	ProductID   string  `json:"productId,omitempty"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	Category    string  `json:"category,omitempty"`
	Description *string `json:"description,omitempty"`
	Unit        *string `json:"unit,omitempty"`
	ImageURL    *string `json:"imageUrl,omitempty"`
}

// ImportDraftsRequest is the payload for the bulk upsert endpoint.
type ImportDraftsRequest struct {
	Source string            `json:"source,omitempty"`
	Items  []ImportDraftItem `json:"items"`
}

// ImportDraftProduct identifies a product that was written.
type ImportDraftProduct struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ImportDraftError reports one row that could not be imported.
type ImportDraftError struct {
	Row    int    `json:"row"`
	Name   string `json:"name,omitempty"`
	Reason string `json:"reason"`
}

// ImportDraftsResult is the outcome of a bulk import.
type ImportDraftsResult struct {
	Created      []ImportDraftProduct `json:"created"`
	Updated      []ImportDraftProduct `json:"updated"`
	Failed       []ImportDraftError   `json:"failed"`
	CreatedCount int                  `json:"createdCount"`
	UpdatedCount int                  `json:"updatedCount"`
	FailedCount  int                  `json:"failedCount"`
	Total        int                  `json:"total"`
}

// importRow is a validated item ready for the database.
type importRow struct {
	row  int
	item ImportDraftItem
	name string
}

// ImportDrafts bulk-upserts products for a shop: existing products (matched by
// productId when given, else by trimmed name within the shop) are updated,
// new ones created. Rows are validated individually — an invalid row never
// blocks the rest of the batch.
func (h *Handler) ImportDrafts(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	shopID := c.Params("shopId")
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}

	var req ImportDraftsRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if len(req.Items) == 0 {
		return errors.Validation("items_required", "لا توجد عناصر للاستيراد")
	}
	if len(req.Items) > maxImportDraftItems {
		return errors.Validation("too_many_items", "الحد الأقصى "+strconv.Itoa(maxImportDraftItems)+" منتج لكل طلب — قسّم الملف لدفعات أصغر")
	}

	result, err := h.service.ImportDrafts(c.UserContext(), shopID, req.Items, user.ShopID, user.Role)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": result})
}

// ImportDrafts implements the bulk upsert business logic.
func (s *Service) ImportDrafts(ctx context.Context, shopID string, items []ImportDraftItem, actorShopID, actorRole string) (*ImportDraftsResult, error) {
	if !isAdmin(actorRole) && actorShopID != shopID {
		return nil, errors.Forbidden("insufficient_role", "ليس لديك صلاحية لاستيراد منتجات لهذا المتجر")
	}
	if shopID == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}

	exists, err := s.repo.ShopExists(ctx, shopID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.NotFound("shop", shopID)
	}

	// Restaurants don't track stock (same default as single-product Create).
	shopCategory, err := s.repo.GetShopCategory(ctx, shopID)
	if err != nil {
		return nil, err
	}
	trackStock := !strings.EqualFold(shopCategory, "RESTAURANT")

	result := &ImportDraftsResult{
		Created: []ImportDraftProduct{},
		Updated: []ImportDraftProduct{},
		Failed:  []ImportDraftError{},
		Total:   len(items),
	}

	// Validate every row up front: bad data never touches the database.
	rows := make([]importRow, 0, len(items))
	for i, item := range items {
		row := i + 1
		name := strings.TrimSpace(item.Name)
		if name == "" {
			result.Failed = append(result.Failed, ImportDraftError{Row: row, Reason: "اسم المنتج مطلوب"})
			continue
		}
		if item.Price < 0 {
			result.Failed = append(result.Failed, ImportDraftError{Row: row, Name: name, Reason: "السعر غير صالح"})
			continue
		}
		if item.Stock < 0 {
			result.Failed = append(result.Failed, ImportDraftError{Row: row, Name: name, Reason: "المخزون غير صالح"})
			continue
		}
		if item.ImageURL != nil {
			if err := assertImageOnly(*item.ImageURL); err != nil {
				result.Failed = append(result.Failed, ImportDraftError{Row: row, Name: name, Reason: "رابط الصورة غير مسموح (فيديو غير مدعوم)"})
				continue
			}
		}
		rows = append(rows, importRow{row: row, item: item, name: name})
	}

	// Fast path: one transaction for the whole chunk with a preloaded name map
	// (a single statement per row). If anything fails at the database level
	// the transaction is aborted wholesale, so fall back to the slow path and
	// redo the batch with a savepoint per row — one broken row then can't sink
	// the rest of the chunk.
	out, dbErr := s.importRowsFast(ctx, shopID, trackStock, rows)
	if dbErr != nil {
		out, dbErr = s.importRowsSlow(ctx, shopID, trackStock, rows)
	}
	if dbErr != nil {
		return nil, dbErr
	}

	result.Created = out.Created
	result.Updated = out.Updated
	result.CreatedCount = len(result.Created)
	result.UpdatedCount = len(result.Updated)
	result.FailedCount = len(result.Failed)
	s.invalidatePublicList()
	return result, nil
}

// buildImportProduct assembles the Product to write for an import row.
func buildImportProduct(r importRow, shopID string, trackStock bool) *Product {
	category := strings.TrimSpace(r.item.Category)
	if category == "" {
		category = "عام"
	}
	return &Product{
		Name:        r.name,
		Description: r.item.Description,
		Price:       r.item.Price,
		Stock:       r.item.Stock,
		Category:    category,
		Unit:        r.item.Unit,
		ImageURL:    r.item.ImageURL,
		TrackStock:  trackStock,
		IsActive:    true,
		ShopID:      shopID,
	}
}

// importRowsFast writes the batch with one statement per row. Existing
// products are resolved through a name→id map loaded once per chunk.
func (s *Service) importRowsFast(ctx context.Context, shopID string, trackStock bool, rows []importRow) (*ImportDraftsResult, error) {
	tx, err := s.repo.pool.Begin(ctx)
	if err != nil {
		return nil, errors.Internal("import_begin_failed", err)
	}
	defer tx.Rollback(ctx)

	existing, err := s.repo.NameMapForShop(ctx, tx, shopID)
	if err != nil {
		return nil, err
	}

	out := &ImportDraftsResult{Created: []ImportDraftProduct{}, Updated: []ImportDraftProduct{}}
	for _, r := range rows {
		p := buildImportProduct(r, shopID, trackStock)

		var id string
		if r.item.ProductID != "" {
			// Rare path (image-map sync): an explicit productId wins when it
			// exists in this shop.
			var found string
			err := tx.QueryRow(ctx,
				"SELECT id FROM products WHERE id = $1 AND shop_id = $2",
				r.item.ProductID, shopID).Scan(&found)
			if err == nil {
				id = found
			} else if err != pgx.ErrNoRows {
				return nil, errors.Internal("import_lookup_failed", err)
			}
		}
		if id == "" {
			id = existing[strings.ToLower(r.name)]
		}

		if id != "" {
			if _, err := s.repo.UpdateImported(ctx, tx, id, p); err != nil {
				return nil, errors.Internal("import_update_failed", err)
			}
			existing[strings.ToLower(r.name)] = id
			out.Updated = append(out.Updated, ImportDraftProduct{ID: id, Name: r.name})
			continue
		}

		newID, err := s.repo.CreateImported(ctx, tx, p)
		if err != nil {
			return nil, errors.Internal("import_create_failed", err)
		}
		existing[strings.ToLower(r.name)] = newID
		out.Created = append(out.Created, ImportDraftProduct{ID: newID, Name: r.name})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, errors.Internal("import_commit_failed", err)
	}
	return out, nil
}

// importRowsSlow redoes the batch with a savepoint per row so a row that hits
// a database-level error is skipped alone while the rest of the batch commits.
func (s *Service) importRowsSlow(ctx context.Context, shopID string, trackStock bool, rows []importRow) (*ImportDraftsResult, error) {
	tx, err := s.repo.pool.Begin(ctx)
	if err != nil {
		return nil, errors.Internal("import_begin_failed", err)
	}
	defer tx.Rollback(ctx)

	out := &ImportDraftsResult{Created: []ImportDraftProduct{}, Updated: []ImportDraftProduct{}}
	for _, r := range rows {
		sp, err := tx.Begin(ctx)
		if err != nil {
			return nil, errors.Internal("import_savepoint_failed", err)
		}

		p := buildImportProduct(r, shopID, trackStock)
		existingID, err := s.repo.FindIDForUpdate(ctx, sp, shopID, r.item.ProductID, r.name)
		if err != nil {
			return nil, errors.Internal("import_lookup_failed", err)
		}

		if existingID != "" {
			if _, err := s.repo.UpdateImported(ctx, sp, existingID, p); err != nil {
				_ = sp.Rollback(ctx)
				continue
			}
			if err := sp.Commit(ctx); err != nil {
				continue
			}
			out.Updated = append(out.Updated, ImportDraftProduct{ID: existingID, Name: r.name})
			continue
		}

		newID, err := s.repo.CreateImported(ctx, sp, p)
		if err != nil {
			_ = sp.Rollback(ctx)
			continue
		}
		if err := sp.Commit(ctx); err != nil {
			continue
		}
		out.Created = append(out.Created, ImportDraftProduct{ID: newID, Name: r.name})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, errors.Internal("import_commit_failed", err)
	}
	return out, nil
}
