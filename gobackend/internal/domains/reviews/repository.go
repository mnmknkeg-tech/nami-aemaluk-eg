package reviews

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for reviews
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new reviews repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// CreateReview creates a new review
func (r *Repository) CreateReview(ctx context.Context, userID string, targetType ReviewTarget, targetID string, data *CreateReviewDTO) (*Review, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	// Get user name
	var userName *string
	err := r.pool.QueryRow(ctx, "SELECT name FROM users WHERE id = $1", userID).Scan(&userName)
	if err != nil && err != sql.ErrNoRows {
		userName = nil
	}

	query := `
		INSERT INTO reviews (id, user_id, target_type, target_id, rating, comment, user_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
		RETURNING id, user_id, target_type, target_id, rating, COALESCE(comment,''), user_name, created_at, updated_at
	`

	var review Review
	var createdAt, updatedAt time.Time
	err = r.pool.QueryRow(ctx, query,
		id, userID, targetType, targetID, data.Rating, data.Comment, userName, now,
	).Scan(
		&review.ID, &review.UserID, &review.TargetType, &review.TargetID,
		&review.Rating, &review.Comment, &review.UserName, &createdAt, &updatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create review: %w", err)
	}

	review.CreatedAt = createdAt.Format(time.RFC3339)
	review.UpdatedAt = updatedAt.Format(time.RFC3339)

	return &review, nil
}

// ListReviews retrieves reviews for a target
func (r *Repository) ListReviews(ctx context.Context, targetType ReviewTarget, targetID string, limit, offset int) ([]Review, int64, float64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT id, user_id, target_type, target_id, rating, COALESCE(comment,''), user_name, created_at, updated_at
		FROM reviews
		WHERE target_type = $1 AND target_id = $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`

	rows, err := r.pool.Query(ctx, query, targetType, targetID, limit, offset)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("failed to query reviews: %w", err)
	}
	defer rows.Close()

	var reviews []Review
	for rows.Next() {
		var rev Review
		var createdAt, updatedAt time.Time
		if err := rows.Scan(
			&rev.ID, &rev.UserID, &rev.TargetType, &rev.TargetID,
			&rev.Rating, &rev.Comment, &rev.UserName, &createdAt, &updatedAt,
		); err != nil {
			continue
		}
		rev.CreatedAt = createdAt.Format(time.RFC3339)
		rev.UpdatedAt = updatedAt.Format(time.RFC3339)
		reviews = append(reviews, rev)
	}

	// Get total count and average
	var total int64
	var avg float64
	err = r.pool.QueryRow(ctx,
		"SELECT COUNT(*), COALESCE(AVG(rating), 0) FROM reviews WHERE target_type = $1 AND target_id = $2",
		targetType, targetID,
	).Scan(&total, &avg)
	if err != nil {
		return reviews, 0, 0, nil
	}

	return reviews, total, avg, nil
}

// HasReview checks if a user already reviewed a target
func (r *Repository) HasReview(ctx context.Context, userID string, targetType ReviewTarget, targetID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM reviews WHERE user_id = $1 AND target_type = $2 AND target_id = $3)",
		userID, targetType, targetID,
	).Scan(&exists)
	return exists, err
}

// DeleteReview deletes a review by ID (only by the owner)
func (r *Repository) DeleteReview(ctx context.Context, reviewID, userID string) error {
	_, err := r.pool.Exec(ctx,
		"DELETE FROM reviews WHERE id = $1 AND user_id = $2",
		reviewID, userID,
	)
	return err
}
