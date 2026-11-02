package chat

import "github.com/go-playground/validator/v10"

// CreateMessageDTO represents a DTO for creating a message
type CreateMessageDTO struct {
	ChatID   string      `json:"chat_id" validate:"required"`
	Content  string      `json:"content" validate:"required"`
	Type     MessageType `json:"type,omitempty" validate:"omitempty,oneof=TEXT IMAGE FILE SYSTEM"`
}

// Validate validates the DTO
func (d *CreateMessageDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// CreateChatDTO represents a DTO for creating a chat
type CreateChatDTO struct {
	Participants []string `json:"participants" validate:"required,min=2"`
	Type         string   `json:"type,omitempty" validate:"omitempty,oneof=direct group"`
	ShopID       *string  `json:"shop_id,omitempty"`
	OrderID      *string  `json:"order_id,omitempty"`
}

// Validate validates the DTO
func (d *CreateChatDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// MessageResponse represents a message response
type MessageResponse struct {
	Success bool     `json:"success"`
	Data    *Message `json:"data,omitempty"`
	Error   string   `json:"error,omitempty"`
}

// ChatResponse represents a chat response
type ChatResponse struct {
	Success bool   `json:"success"`
	Data    *Chat  `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// MessagesListResponse represents a list of messages response
type MessagesListResponse struct {
	Success bool      `json:"success"`
	Data    []Message `json:"data,omitempty"`
	Total   int64     `json:"total,omitempty"`
	Error   string    `json:"error,omitempty"`
}

// ChatsListResponse represents a list of chats response
type ChatsListResponse struct {
	Success bool    `json:"success"`
	Data    []Chat  `json:"data,omitempty"`
	Total   int64   `json:"total,omitempty"`
	Error   string  `json:"error,omitempty"`
}
