package chat

import (
        "strconv"
        "strings"

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
        chat.Post("/", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.CreateChat)
        chat.Get("/", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.ListChats)
        chat.Get("/:id", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.GetChat)
        chat.Post("/:id/messages", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.CreateMessage)
        chat.Get("/:id/messages", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.ListMessages)
        chat.Patch("/:id/messages/:messageId/read", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.MarkMessageAsRead)

        // Frontend compatibility aliases: the CRM calls /chats (plural)
        chats := app.Group("/chats")
        chats.Post("/", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.CreateChat)
        chats.Get("/", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.ListChats)
        chats.Get("/shop/:shopId", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.ListChatsByShop)
        chats.Get("/:id", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.GetChat)
        chats.Post("/:id/messages", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.CreateMessage)
        chats.Get("/:id/messages", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.ListMessages)
        chats.Patch("/:id/messages/:messageId/read", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.MarkMessageAsRead)
        chats.Delete("/:id", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.DeleteChat)
        chats.Post("/bulk-delete", middleware.RequireAuth(h.config, h.config.Auth.Issuer, h.config.Auth.Audience), h.BulkDeleteChats)
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

// ListChatsByShop handles GET /chats/shop/:shopId — the dashboard CRM chats
// page lists every customer chat of one shop. Merchants may only read their
// own shop; admins may read any shop.
func (h *Handler) ListChatsByShop(c *fiber.Ctx) error {
        user, ok := middleware.AuthUserFromContext(c)
        if !ok {
                return c.Status(fiber.StatusUnauthorized).JSON(ChatsListResponse{
                        Success: false,
                        Error:   "Unauthorized",
                })
        }

        shopID := c.Params("shopId")
        if shopID == "" {
                return c.Status(fiber.StatusBadRequest).JSON(ChatsListResponse{
                        Success: false,
                        Error:   "shopId is required",
                })
        }
        if !strings.EqualFold(user.Role, "ADMIN") && user.ShopID != shopID {
                return c.Status(fiber.StatusForbidden).JSON(ChatsListResponse{
                        Success: false,
                        Error:   "ليس لديك صلاحية للوصول إلى محادثات هذا المتجر",
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

        chats, total, err := h.service.ListChatsByShop(c.Context(), shopID, limit, offset)
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

// DeleteChat handles DELETE /chats/:id
func (h *Handler) DeleteChat(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "id مطلوب"})
	}
	if err := h.service.DeleteChat(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل حذف المحادثة"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم حذف المحادثة بنجاح"})
}

// BulkDeleteChats handles POST /chats/bulk-delete
// Body: { "ids": ["...", "..."] }
func (h *Handler) BulkDeleteChats(c *fiber.Ctx) error {
	var req struct {
		IDs []string `json:"ids" validate:"required,min=1,max=500,dive,required"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	if err := validator.New().Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": err.Error()})
	}

	deleted, err := h.service.BulkDeleteChats(c.Context(), req.IDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل الحذف الجماعي"})
	}

	return c.JSON(fiber.Map{"success": true, "deleted": deleted})
}
