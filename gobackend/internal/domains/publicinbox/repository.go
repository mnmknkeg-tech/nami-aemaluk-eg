package publicinbox

import (
	"context"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/jackc/pgx/v5"
)

// Repository persists public messages.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a public inbox repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

const messageColumns = `id, kind, name, email, message, COALESCE(meta, ''), handled, created_at, handled_at`

// Create inserts a new public message.
func (r *Repository) Create(ctx context.Context, kind, name, email, message, meta string) (*PublicMessage, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO public_messages (kind, name, email, message, meta)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''))
		RETURNING id, kind, name, email, message, COALESCE(meta, ''), handled, created_at, handled_at
	`, kind, name, email, message, meta)

	var m PublicMessage
	if err := row.Scan(&m.ID, &m.Kind, &m.Name, &m.Email, &m.Message, &m.Meta, &m.Handled, &m.CreatedAt, &m.HandledAt); err != nil {
		return nil, fmt.Errorf("insert public message: %w", err)
	}
	return &m, nil
}

// List returns messages (optionally filtered by kind) newest first.
func (r *Repository) List(ctx context.Context, kind string, limit, offset int) ([]PublicMessage, int64, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}

	where := ""
	args := []any{limit, offset}
	if kind != "" {
		where = "WHERE kind = $3"
		args = append(args, kind)
	}

	rows, err := r.pool.Query(ctx, `
		SELECT `+messageColumns+`
		FROM public_messages
		`+where+`
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list public messages: %w", err)
	}
	defer rows.Close()

	messages := []PublicMessage{}
	for rows.Next() {
		var m PublicMessage
		if err := rows.Scan(&m.ID, &m.Kind, &m.Name, &m.Email, &m.Message, &m.Meta, &m.Handled, &m.CreatedAt, &m.HandledAt); err != nil {
			return nil, 0, err
		}
		messages = append(messages, m)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	var total int64
	countArgs := args[2:]
	countWhere := where
	if len(countArgs) == 0 {
		countWhere = ""
	}
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM public_messages "+countWhere, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	return messages, total, nil
}

// MarkHandled flags a message as handled by the support team.
func (r *Repository) MarkHandled(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE public_messages SET handled = TRUE, handled_at = NOW() WHERE id = $1
	`, id)
	if err != nil {
		return fmt.Errorf("mark public message handled: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
