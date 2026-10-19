package dashboard

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// listEntities returns flattened rows for a kind scoped to one shop.
func (h *Handler) listEntities(ctx context.Context, spec kindSpec, shopID string, limit, offset int) ([]map[string]any, int64, error) {
	var total int64
	if err := h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM dashboard_entities WHERE kind = $1 AND shop_id = $2`,
		spec.Kind, shopID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}
	if limit <= 0 || limit > 1000 {
		limit = 500
	}
	rows, err := h.pool.Query(ctx,
		`SELECT `+entityRowJSON+`
		 FROM dashboard_entities e
		 WHERE e.kind = $1 AND e.shop_id = $2
		 ORDER BY e.created_at DESC
		 LIMIT $3 OFFSET $4`,
		spec.Kind, shopID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []map[string]any{}
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, 0, err
		}
		row, err := flatten(raw)
		if err != nil {
			continue
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

// getEntity loads one entity by id (optionally scoped to a shop).
func (h *Handler) getEntity(ctx context.Context, spec kindSpec, id, shopID string) (map[string]any, error) {
	q := `SELECT ` + entityRowJSON + ` FROM dashboard_entities e WHERE e.id = $1 AND e.kind = $2`
	args := []any{id, spec.Kind}
	if shopID != "" {
		q += ` AND e.shop_id = $3`
		args = append(args, shopID)
	}
	var raw string
	err := h.pool.QueryRow(ctx, q, args...).Scan(&raw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errNotFound
		}
		return nil, err
	}
	return flatten(raw)
}

// createEntity inserts a new entity row from the request payload.
func (h *Handler) createEntity(ctx context.Context, spec kindSpec, shopID, createdBy string, body map[string]any) (map[string]any, error) {
	status, _, data := splitPayload(body)

	var seq int
	if err := h.pool.QueryRow(ctx,
		`SELECT COUNT(*) + 1 FROM dashboard_entities WHERE kind = $1 AND shop_id = $2`,
		spec.Kind, shopID,
	).Scan(&seq); err != nil {
		return nil, err
	}

	dataJSON, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	id := uuid.NewString()
	_, err = h.pool.Exec(ctx,
		`INSERT INTO dashboard_entities (id, shop_id, kind, number, status, data, created_by)
		 VALUES ($1,$2,$3,$4,NULLIF($5,''),$6::jsonb,NULLIF($7,''))`,
		id, shopID, spec.Kind, nextNumber(spec.NumberPrefix, seq), deref(status), string(dataJSON), createdBy,
	)
	if err != nil {
		return nil, err
	}
	return h.getEntity(ctx, spec, id, shopID)
}

// updateEntity merges the payload into an existing entity.
func (h *Handler) updateEntity(ctx context.Context, spec kindSpec, id, shopID string, body map[string]any) (map[string]any, error) {
	var existingStatus string
	var existingData string
	err := h.pool.QueryRow(ctx,
		`SELECT COALESCE(e.status, ''), e.data::text FROM dashboard_entities e WHERE e.id = $1 AND e.kind = $2 AND e.shop_id = $3`,
		id, spec.Kind, shopID,
	).Scan(&existingStatus, &existingData)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errNotFound
		}
		return nil, err
	}

	status, _, data := splitPayload(body)

	merged := map[string]any{}
	if err := json.Unmarshal([]byte(existingData), &merged); err != nil {
		merged = map[string]any{}
	}
	for k, v := range data {
		merged[k] = v
	}
	dataJSON, err := json.Marshal(merged)
	if err != nil {
		return nil, err
	}
	newStatus := existingStatus
	if status != nil {
		newStatus = *status
	}

	_, err = h.pool.Exec(ctx,
		`UPDATE dashboard_entities SET status = NULLIF($1,''), data = $2::jsonb, updated_at = NOW() WHERE id = $3 AND kind = $4 AND shop_id = $5`,
		newStatus, string(dataJSON), id, spec.Kind, shopID,
	)
	if err != nil {
		return nil, err
	}
	return h.getEntity(ctx, spec, id, shopID)
}

// deleteEntity removes an entity.
func (h *Handler) deleteEntity(ctx context.Context, spec kindSpec, id, shopID string) error {
	tag, err := h.pool.Exec(ctx,
		`DELETE FROM dashboard_entities WHERE id = $1 AND kind = $2 AND shop_id = $3`,
		id, spec.Kind, shopID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errNotFound
	}
	return nil
}

// updateEntityStatus changes only the status column.
func (h *Handler) updateEntityStatus(ctx context.Context, spec kindSpec, id, shopID, status string) error {
	tag, err := h.pool.Exec(ctx,
		`UPDATE dashboard_entities SET status = $1, updated_at = NOW() WHERE id = $2 AND kind = $3 AND shop_id = $4`,
		status, id, spec.Kind, shopID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errNotFound
	}
	return nil
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
