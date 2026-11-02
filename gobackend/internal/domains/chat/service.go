package chat

import (
	"context"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
)

// Service handles chat business logic
type Service struct {
	repo *Repository
	pool *db.Pool
}

// NewService creates a new chat service
func NewService(repo *Repository, pool *db.Pool) *Service {
	return &Service{repo: repo, pool: pool}
}

// CreateChat creates a new chat
func (s *Service) CreateChat(ctx context.Context, data *CreateChatDTO) (*Chat, error) {
	return s.repo.CreateChat(ctx, data)
}

// GetChatByID retrieves a chat by ID
func (s *Service) GetChatByID(ctx context.Context, id string) (*Chat, error) {
	return s.repo.GetChatByID(ctx, id)
}

// ListChats retrieves chats for a user
func (s *Service) ListChats(ctx context.Context, userID string, shopID *string, limit, offset int) ([]Chat, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListChats(ctx, userID, shopID, limit, offset)
}

// CreateMessage creates a new message
func (s *Service) CreateMessage(ctx context.Context, chatID, senderID, content string, msgType MessageType) (*Message, error) {
	if content == "" {
		return nil, fmt.Errorf("message content cannot be empty")
	}

	return s.repo.CreateMessage(ctx, chatID, senderID, content, msgType)
}

// ListMessages retrieves messages for a chat
func (s *Service) ListMessages(ctx context.Context, chatID string, limit, offset int) ([]Message, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListMessages(ctx, chatID, limit, offset)
}

// UpdateMessageStatus updates the status of a message
func (s *Service) UpdateMessageStatus(ctx context.Context, messageID string, status MessageStatus) error {
	return s.repo.UpdateMessageStatus(ctx, messageID, status)
}

// MarkMessagesAsRead marks all messages in a chat as read for a user
func (s *Service) MarkMessagesAsRead(ctx context.Context, chatID, userID string) error {
	// In a real implementation, you'd need a read receipts table
	// For now, we'll just update the status of all messages not sent by this user
	_, err := s.repo.pool.Exec(ctx,
		`UPDATE messages SET status = 'READ', updated_at = NOW() 
		 WHERE chat_id = $1 AND sender_id != $2 AND status != 'READ'`,
		chatID, userID,
	)
	return err
}
