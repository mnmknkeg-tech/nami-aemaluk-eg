package chat

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for chat
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new chat handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers chat routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	chat := app.Group("/chat")

	// Protected routes
	chat.Post("/", middleware.RequireAuth(h.config), h.CreateChat)
	chat.Get("/", middleware.RequireAuth(h.config), h.ListChats)
	chat.Get("/:id", middleware.RequireAuth(h.config), h.GetChat)
	chat.Post("/:id/messages", middleware.RequireAuth(h.config), h.CreateMessage)
	chat.Get("/:id/messages", middleware.RequireAuth(h.config), h.ListMessages)
	chat.Patch("/:id/messages/:messageId/read", middleware.RequireAuth(h.config), h.MarkMessageAsRead)

	// Frontend compatibility aliases: the CRM calls /chats (plural)
	chats := app.Group("/chats")
	chats.Post("/", middleware.RequireAuth(h.config), h.CreateChat)
	chats.Get("/", middleware.RequireAuth(h.config), h.ListChats)
	chats.Get("/:id", middleware.RequireAuth(h.config), h.GetChat)
	chats.Post("/:id/messages", middleware.RequireAuth(h.config), h.CreateMessage)
	chats.Get("/:id/messages", middleware.RequireAuth(h.config), h.ListMessages)
	chats.Patch("/:id/messages/:messageId/read", middleware.RequireAuth(h.config), h.MarkMessageAsRead)
}

// CreateChat handles creating a new chat
func (h *Handler) CreateChat(c *fiber.Ctx) error {
	var req CreateChatDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ChatResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ChatResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	chat, err := h.service.CreateChat(c.Context(), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ChatResponse{
			Success: false,
			Error:   "Failed to create chat",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(ChatResponse{
		Success: true,
		Data:    chat,
	})
}

// GetChat handles retrieving a chat by ID
func (h *Handler) GetChat(c *fiber.Ctx) error {
	id := c.Params("id")

	chat, err := h.service.GetChatByID(c.Context(), id)
	if err != nil {
		if err.Error() == "chat not found" {
			return c.Status(fiber.StatusNotFound).JSON(ChatResponse{
				Success: false,
				Error:   "Chat not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ChatResponse{
			Success: false,
			Error:   "Failed to retrieve chat",
		})
	}

	return c.JSON(ChatResponse{
		Success: true,
		Data:    chat,
	})
}

// ListChats handles listing chats for the current user
func (h *Handler) ListChats(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ChatsListResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	limit := 20
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	var shopID *string
	if user.ShopID != "" {
		shopID = &user.ShopID
	}

	chats, total, err := h.service.ListChats(c.Context(), user.ID, shopID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ChatsListResponse{
			Success: false,
			Error:   "Failed to retrieve chats",
		})
	}

	return c.JSON(ChatsListResponse{
		Success: true,
		Data:    chats,
		Total:   total,
	})
}

// CreateMessage handles creating a new message
func (h *Handler) CreateMessage(c *fiber.Ctx) error {
	chatID := c.Params("id")

	var req CreateMessageDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(MessageResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	req.ChatID = chatID

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(MessageResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(MessageResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	msgType := req.Type
	if msgType == "" {
		msgType = MessageTypeText
	}

	message, err := h.service.CreateMessage(c.Context(), chatID, user.ID, req.Content, msgType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(MessageResponse{
			Success: false,
			Error:   "Failed to create message",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(MessageResponse{
		Success: true,
		Data:    message,
	})
}

// ListMessages handles listing messages for a chat
func (h *Handler) ListMessages(c *fiber.Ctx) error {
	chatID := c.Params("id")

	limit := 20
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	messages, total, err := h.service.ListMessages(c.Context(), chatID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(MessagesListResponse{
			Success: false,
			Error:   "Failed to retrieve messages",
		})
	}

	return c.JSON(MessagesListResponse{
		Success: true,
		Data:    messages,
		Total:   total,
	})
}

// MarkMessageAsRead handles marking a message as read
func (h *Handler) MarkMessageAsRead(c *fiber.Ctx) error {
	chatID := c.Params("id")
	messageID := c.Params("messageId")

	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(MessageResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	err := h.service.UpdateMessageStatus(c.Context(), messageID, MessageStatusRead)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(MessageResponse{
			Success: false,
			Error:   "Failed to mark message as read",
		})
	}

	// Mark all messages as read for this user
	_ = h.service.MarkMessagesAsRead(c.Context(), chatID, user.ID)

	return c.JSON(MessageResponse{Success: true})
}
