package feedback

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for feedback
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new feedback repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// CreateFeedback creates a new feedback
func (r *Repository) CreateFeedback(ctx context.Context, userID string, data *CreateFeedbackDTO) (*Feedback, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	query := `
		INSERT INTO feedback (id, user_id, shop_id, order_id, product_id, type, rating, title, comment, status, user_name, user_email, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, user_id, shop_id, order_id, product_id, type, rating, title, comment, status, user_name, user_email, created_at, updated_at
	`

	var feedback Feedback
	err := r.pool.QueryRow(ctx, query,
		id, userID, data.ShopID, data.OrderID, data.ProductID, data.Type, data.Rating,
		data.Title, data.Comment, "PENDING", now, now,
	).Scan(
		&feedback.ID, &feedback.UserID, &feedback.ShopID, &feedback.OrderID, &feedback.ProductID,
		&feedback.Type, &feedback.Rating, &feedback.Title, &feedback.Comment, &feedback.Status,
		&feedback.UserName, &feedback.UserEmail, &feedback.CreatedAt, &feedback.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create feedback: %w", err)
	}

	feedback.CreatedAt = now.UTC().Format(time.RFC3339)
	feedback.UpdatedAt = now.UTC().Format(time.RFC3339)

	return &feedback, nil
}

// GetFeedbackByID retrieves a feedback by ID
func (r *Repository) GetFeedbackByID(ctx context.Context, id string) (*Feedback, error) {
	query := `
		SELECT id, COALESCE(user_id, ''), COALESCE(shop_id, ''), order_id, product_id, COALESCE(type, 'GENERAL'), rating, COALESCE(title, ''), COALESCE(comment, content, ''), COALESCE(status, 'PENDING'), user_name, user_email, created_at::text, COALESCE(updated_at, created_at)::text
		FROM feedback
		WHERE id = $1
	`

	var feedback Feedback
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&feedback.ID, &feedback.UserID, &feedback.ShopID, &feedback.OrderID, &feedback.ProductID,
		&feedback.Type, &feedback.Rating, &feedback.Title, &feedback.Comment, &feedback.Status,
		&feedback.UserName, &feedback.UserEmail, &feedback.CreatedAt, &feedback.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("feedback not found")
		}
		return nil, fmt.Errorf("failed to get feedback: %w", err)
	}

	return &feedback, nil
}

// ListFeedback retrieves feedback with filters
func (r *Repository) ListFeedback(ctx context.Context, shopID, productID *string, feedbackType *FeedbackType, rating *int, limit, offset int) ([]Feedback, int64, error) {
	query := `
		SELECT id, COALESCE(user_id, ''), COALESCE(shop_id, ''), order_id, product_id, COALESCE(type, 'GENERAL'), rating, COALESCE(title, ''), COALESCE(comment, content, ''), COALESCE(status, 'PENDING'), user_name, user_email, created_at::text, COALESCE(updated_at, created_at)::text
		FROM feedback
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if shopID != nil {
		query += fmt.Sprintf(" AND shop_id = $%d", argIndex)
		args = append(args, *shopID)
		argIndex++
	}

	if productID != nil {
		query += fmt.Sprintf(" AND product_id = $%d", argIndex)
		args = append(args, *productID)
		argIndex++
	}

	if feedbackType != nil {
		query += fmt.Sprintf(" AND type = $%d", argIndex)
		args = append(args, *feedbackType)
		argIndex++
	}

	if rating != nil {
		query += fmt.Sprintf(" AND rating = $%d", argIndex)
		args = append(args, *rating)
		argIndex++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM feedback WHERE 1=1"
	countArgs := []interface{}{}
	countArgIndex := 1

	if shopID != nil {
		countQuery += fmt.Sprintf(" AND shop_id = $%d", countArgIndex)
		countArgs = append(countArgs, *shopID)
		countArgIndex++
	}

	if productID != nil {
		countQuery += fmt.Sprintf(" AND product_id = $%d", countArgIndex)
		countArgs = append(countArgs, *productID)
		countArgIndex++
	}

	if feedbackType != nil {
		countQuery += fmt.Sprintf(" AND type = $%d", countArgIndex)
		countArgs = append(countArgs, *feedbackType)
		countArgIndex++
	}

	if rating != nil {
		countQuery += fmt.Sprintf(" AND rating = $%d", countArgIndex)
		countArgs = append(countArgs, *rating)
		countArgIndex++
	}

	var total int64
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count feedback: %w", err)
	}

	// Get results
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query feedback: %w", err)
	}
	defer rows.Close()

	var feedbackList []Feedback
	for rows.Next() {
		var feedback Feedback
		err := rows.Scan(
			&feedback.ID, &feedback.UserID, &feedback.ShopID, &feedback.OrderID, &feedback.ProductID,
			&feedback.Type, &feedback.Rating, &feedback.Title, &feedback.Comment, &feedback.Status,
			&feedback.UserName, &feedback.UserEmail, &feedback.CreatedAt, &feedback.UpdatedAt,
		)
		if err != nil {
			continue
		}
		feedbackList = append(feedbackList, feedback)
	}

	return feedbackList, total, nil
}

// UpdateFeedbackStatus updates the status of feedback
func (r *Repository) UpdateFeedbackStatus(ctx context.Context, id string, status string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE feedback SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, id,
	)
	return err
}

// DeleteFeedback deletes feedback by ID
func (r *Repository) DeleteFeedback(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM feedback WHERE id = $1`, id)
	return err
}
