package chat

// MessageStatus represents the status of a message
type MessageStatus string

const (
	MessageStatusSent     MessageStatus = "SENT"
	MessageStatusDelivered MessageStatus = "DELIVERED"
	MessageStatusRead     MessageStatus = "READ"
)

// MessageType represents the type of message
type MessageType string

const (
	MessageTypeText  MessageType = "TEXT"
	MessageTypeImage MessageType = "IMAGE"
	MessageTypeFile  MessageType = "FILE"
	MessageTypeSystem MessageType = "SYSTEM"
)

// Message represents a chat message
type Message struct {
	ID        string        `json:"id"`
	ChatID    string        `json:"chat_id"`
	SenderID  string        `json:"sender_id"`
	Content   string        `json:"content"`
	Type      MessageType   `json:"type"`
	Status    MessageStatus `json:"status"`
	CreatedAt string        `json:"created_at"`
	UpdatedAt string        `json:"updated_at"`
}

// Chat represents a chat conversation
type Chat struct {
	ID           string   `json:"id"`
	Participants []string `json:"participants"`
	Type         string   `json:"type"` // "direct" or "group"
	ShopID       *string  `json:"shop_id,omitempty"`
	OrderID      *string  `json:"order_id,omitempty"`
	LastMessage  *string  `json:"last_message,omitempty"`
	LastMessageAt *string `json:"last_message_at,omitempty"`
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
}

// CreateMessageRequest represents a request to create a message
type CreateMessageRequest struct {
	ChatID   string      `json:"chat_id" validate:"required"`
	Content  string      `json:"content" validate:"required"`
	Type     MessageType `json:"type,omitempty" validate:"omitempty,oneof=TEXT IMAGE FILE SYSTEM"`
}

// CreateChatRequest represents a request to create a chat
type CreateChatRequest struct {
	Participants []string `json:"participants" validate:"required,min=2"`
	Type         string   `json:"type,omitempty" validate:"omitempty,oneof=direct group"`
	ShopID       *string  `json:"shop_id,omitempty"`
	OrderID      *string  `json:"order_id,omitempty"`
}

// ListMessagesRequest represents a request to list messages
type ListMessagesRequest struct {
	ChatID string `json:"chat_id" validate:"required"`
	Limit  int    `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
	Offset int    `json:"offset,omitempty" validate:"omitempty,min=0"`
}

// ListChatsRequest represents a request to list chats
type ListChatsRequest struct {
	UserID string `json:"user_id,omitempty"`
	ShopID *string `json:"shop_id,omitempty"`
	Limit  int    `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
	Offset int    `json:"offset,omitempty" validate:"omitempty,min=0"`
}
