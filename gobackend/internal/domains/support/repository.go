package support

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for support
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new support repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// CreateTicket creates a new support ticket
func (r *Repository) CreateTicket(ctx context.Context, userID string, shopID *string, data *CreateTicketDTO) (*Ticket, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	priority := data.Priority
	if priority == "" {
		priority = TicketPriorityMedium
	}

	query := `
		INSERT INTO support_tickets (id, user_id, shop_id, subject, description, status, priority, category, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, user_id, shop_id, subject, description, status, priority, category, created_at, updated_at
	`

	var ticket Ticket
	err := r.pool.QueryRow(ctx, query,
		id, userID, shopID, data.Subject, data.Description, TicketStatusOpen, priority, data.Category, now, now,
	).Scan(
		&ticket.ID, &ticket.UserID, &ticket.ShopID, &ticket.Subject, &ticket.Description,
		&ticket.Status, &ticket.Priority, &ticket.Category, &ticket.CreatedAt, &ticket.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create ticket: %w", err)
	}

	ticket.CreatedAt = now.UTC().Format(time.RFC3339)
	ticket.UpdatedAt = now.UTC().Format(time.RFC3339)

	return &ticket, nil
}

// GetTicketByID retrieves a ticket by ID
func (r *Repository) GetTicketByID(ctx context.Context, id string) (*Ticket, error) {
	query := `
		SELECT id, user_id, shop_id, subject, description, status, priority, category, created_at, updated_at
		FROM support_tickets
		WHERE id = $1
	`

	var ticket Ticket
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&ticket.ID, &ticket.UserID, &ticket.ShopID, &ticket.Subject, &ticket.Description,
		&ticket.Status, &ticket.Priority, &ticket.Category, &ticket.CreatedAt, &ticket.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("ticket not found")
		}
		return nil, fmt.Errorf("failed to get ticket: %w", err)
	}

	return &ticket, nil
}

// ListTickets retrieves tickets with filters
func (r *Repository) ListTickets(ctx context.Context, userID, shopID *string, status *TicketStatus, category *string, limit, offset int) ([]Ticket, int64, error) {
	query := `
		SELECT id, user_id, shop_id, subject, description, status, priority, category, created_at, updated_at
		FROM support_tickets
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if userID != nil {
		query += fmt.Sprintf(" AND user_id = $%d", argIndex)
		args = append(args, *userID)
		argIndex++
	}

	if shopID != nil {
		query += fmt.Sprintf(" AND shop_id = $%d", argIndex)
		args = append(args, *shopID)
		argIndex++
	}

	if status != nil {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, *status)
		argIndex++
	}

	if category != nil {
		query += fmt.Sprintf(" AND category = $%d", argIndex)
		args = append(args, *category)
		argIndex++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM support_tickets WHERE 1=1"
	countArgs := []interface{}{}
	countArgIndex := 1

	if userID != nil {
		countQuery += fmt.Sprintf(" AND user_id = $%d", countArgIndex)
		countArgs = append(countArgs, *userID)
		countArgIndex++
	}

	if shopID != nil {
		countQuery += fmt.Sprintf(" AND shop_id = $%d", countArgIndex)
		countArgs = append(countArgs, *shopID)
		countArgIndex++
	}

	if status != nil {
		countQuery += fmt.Sprintf(" AND status = $%d", countArgIndex)
		countArgs = append(countArgs, *status)
		countArgIndex++
	}

	if category != nil {
		countQuery += fmt.Sprintf(" AND category = $%d", countArgIndex)
		countArgs = append(countArgs, *category)
		countArgIndex++
	}

	var total int64
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count tickets: %w", err)
	}

	// Get results
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query tickets: %w", err)
	}
	defer rows.Close()

	var tickets []Ticket
	for rows.Next() {
		var ticket Ticket
		err := rows.Scan(
			&ticket.ID, &ticket.UserID, &ticket.ShopID, &ticket.Subject, &ticket.Description,
			&ticket.Status, &ticket.Priority, &ticket.Category, &ticket.CreatedAt, &ticket.UpdatedAt,
		)
		if err != nil {
			continue
		}
		tickets = append(tickets, ticket)
	}

	return tickets, total, nil
}

// UpdateTicketStatus updates the status of a ticket
func (r *Repository) UpdateTicketStatus(ctx context.Context, id string, status TicketStatus) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, id,
	)
	return err
}
