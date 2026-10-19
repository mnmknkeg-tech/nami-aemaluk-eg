package chat

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for chat
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new chat repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// CreateChat creates a new chat
func (r *Repository) CreateChat(ctx context.Context, data *CreateChatDTO) (*Chat, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	participantsJSON, _ := json.Marshal(data.Participants)

	query := `
		INSERT INTO chats (id, participants, type, shop_id, order_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, participants, type, shop_id, order_id, last_message, last_message_at, created_at, updated_at
	`

	var chat Chat
	var participantsJSONResult []byte
	var lastMessage, lastMessageAt sql.NullString

	err := r.pool.QueryRow(ctx, query,
		id, participantsJSON, data.Type, data.ShopID, data.OrderID, now, now,
	).Scan(
		&chat.ID, &participantsJSONResult, &chat.Type, &chat.ShopID, &chat.OrderID,
		&lastMessage, &lastMessageAt, &chat.CreatedAt, &chat.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create chat: %w", err)
	}

	json.Unmarshal(participantsJSONResult, &chat.Participants)

	if lastMessage.Valid {
		chat.LastMessage = &lastMessage.String
	}
	if lastMessageAt.Valid {
		chat.LastMessageAt = &lastMessageAt.String
	}

	chat.CreatedAt = now.UTC().Format(time.RFC3339)
	chat.UpdatedAt = now.UTC().Format(time.RFC3339)

	return &chat, nil
}

// GetChatByID retrieves a chat by ID
func (r *Repository) GetChatByID(ctx context.Context, id string) (*Chat, error) {
	query := `
		SELECT id, participants, type, shop_id, order_id, last_message, last_message_at, created_at, updated_at
		FROM chats
		WHERE id = $1
	`

	var chat Chat
	var participantsJSON []byte
	var lastMessage, lastMessageAt sql.NullString

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&chat.ID, &participantsJSON, &chat.Type, &chat.ShopID, &chat.OrderID,
		&lastMessage, &lastMessageAt, &chat.CreatedAt, &chat.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("chat not found")
		}
		return nil, fmt.Errorf("failed to get chat: %w", err)
	}

	json.Unmarshal(participantsJSON, &chat.Participants)

	if lastMessage.Valid {
		chat.LastMessage = &lastMessage.String
	}
	if lastMessageAt.Valid {
		chat.LastMessageAt = &lastMessageAt.String
	}

	return &chat, nil
}

// ListChats retrieves chats for a user
func (r *Repository) ListChats(ctx context.Context, userID string, shopID *string, limit, offset int) ([]Chat, int64, error) {
	query := `
		SELECT id, participants, type, shop_id, order_id, last_message, last_message_at, created_at, updated_at
		FROM chats
		WHERE participants @> $1::jsonb
	`
	args := []interface{}{fmt.Sprintf(`["%s"]`, userID)}
	argIndex := 2

	if shopID != nil {
		query += fmt.Sprintf(" AND shop_id = $%d", argIndex)
		args = append(args, *shopID)
		argIndex++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM chats WHERE participants @> $1::jsonb"
	countArgs := []interface{}{fmt.Sprintf(`["%s"]`, userID)}
	countArgIndex := 2

	if shopID != nil {
		countQuery += fmt.Sprintf(" AND shop_id = $%d", countArgIndex)
		countArgs = append(countArgs, *shopID)
		countArgIndex++
	}

	var total int64
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count chats: %w", err)
	}

	// Get results
	query += fmt.Sprintf(" ORDER BY last_message_at DESC NULLS LAST, created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query chats: %w", err)
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var chat Chat
		var participantsJSON []byte
		var lastMessage, lastMessageAt sql.NullString

		err := rows.Scan(
			&chat.ID, &participantsJSON, &chat.Type, &chat.ShopID, &chat.OrderID,
			&lastMessage, &lastMessageAt, &chat.CreatedAt, &chat.UpdatedAt,
		)
		if err != nil {
			continue
		}

		json.Unmarshal(participantsJSON, &chat.Participants)

		if lastMessage.Valid {
			chat.LastMessage = &lastMessage.String
		}
		if lastMessageAt.Valid {
			chat.LastMessageAt = &lastMessageAt.String
		}

		chats = append(chats, chat)
	}

	return chats, total, nil
}

// CreateMessage creates a new message
func (r *Repository) CreateMessage(ctx context.Context, chatID, senderID, content string, msgType MessageType) (*Message, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	query := `
		INSERT INTO messages (id, chat_id, sender_id, content, type, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, chat_id, sender_id, content, type, status, created_at, updated_at
	`

	var message Message
	err := r.pool.QueryRow(ctx, query,
		id, chatID, senderID, content, msgType, MessageStatusSent, now, now,
	).Scan(
		&message.ID, &message.ChatID, &message.SenderID, &message.Content,
		&message.Type, &message.Status, &message.CreatedAt, &message.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	message.CreatedAt = now.UTC().Format(time.RFC3339)
	message.UpdatedAt = now.UTC().Format(time.RFC3339)

	// Update chat's last message
	_, _ = r.pool.Exec(ctx,
		`UPDATE chats SET last_message = $1, last_message_at = $2, updated_at = NOW() WHERE id = $3`,
		content, now, chatID,
	)

	return &message, nil
}

// ListMessages retrieves messages for a chat
func (r *Repository) ListMessages(ctx context.Context, chatID string, limit, offset int) ([]Message, int64, error) {
	// Get total count
	var total int64
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM messages WHERE chat_id = $1", chatID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count messages: %w", err)
	}

	// Get results
	query := `
		SELECT id, chat_id, sender_id, content, type, status, created_at, updated_at
		FROM messages
		WHERE chat_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, chatID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query messages: %w", err)
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var message Message
		err := rows.Scan(
			&message.ID, &message.ChatID, &message.SenderID, &message.Content,
			&message.Type, &message.Status, &message.CreatedAt, &message.UpdatedAt,
		)
		if err != nil {
			continue
		}
		messages = append(messages, message)
	}

	return messages, total, nil
}

// UpdateMessageStatus updates the status of a message
func (r *Repository) UpdateMessageStatus(ctx context.Context, messageID string, status MessageStatus) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE messages SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, messageID,
	)
	return err
}
