package notification

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for notifications
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new notification handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers notification routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	notifications := app.Group("/notifications")

	// Merchant push subscription routes
	notifications.Post("/push/merchant/subscribe", middleware.RequireAuth(h.config), h.MerchantPushSubscribe)
	notifications.Post("/push/merchant/unsubscribe", middleware.RequireAuth(h.config), h.MerchantPushUnsubscribe)

	// Customer push subscription routes
	notifications.Post("/push/customer/subscribe", middleware.RequireAuth(h.config), h.CustomerPushSubscribe)
	notifications.Post("/push/customer/unsubscribe", middleware.RequireAuth(h.config), h.CustomerPushUnsubscribe)

	// User notification routes
	notifications.Get("/me", middleware.RequireAuth(h.config), h.ListMine)
	notifications.Get("/me/unread-count", middleware.RequireAuth(h.config), h.UnreadCountMine)
	notifications.Patch("/me/read", middleware.RequireAuth(h.config), h.MarkAllMineRead)
	notifications.Patch("/me/:id/read", middleware.RequireAuth(h.config), h.MarkMineRead)
	notifications.Delete("/me/:id", middleware.RequireAuth(h.config), h.DeleteMine)

	// Shop notification routes
	notifications.Get("/shop/:shopId", middleware.RequireAuth(h.config), h.ListShop)
	notifications.Get("/shop/:shopId/unread-count", middleware.RequireAuth(h.config), h.UnreadCountShop)
	notifications.Patch("/shop/:shopId/read", middleware.RequireAuth(h.config), h.MarkAllShopRead)
	notifications.Patch("/shop/:shopId/:id/read", middleware.RequireAuth(h.config), h.MarkShopNotificationRead)
	notifications.Delete("/shop/:shopId/:id", middleware.RequireAuth(h.config), h.DeleteShopNotification)

	// Preferences routes
	notifications.Get("/preferences", middleware.RequireAuth(h.config), h.GetPreferences)
	notifications.Put("/preferences", middleware.RequireAuth(h.config), h.UpdatePreferences)
}

// MerchantPushSubscribe handles merchant push subscription
func (h *Handler) MerchantPushSubscribe(c *fiber.Ctx) error {
	var req PushSubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Get shop ID from request or token
	shopID := req.ShopID
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	if user.Role != "admin" && user.Role != "ADMIN" {
		shopID = user.ShopID
	}

	// Normalize subscription
	subscription := req.Subscription
	if endpoint, ok := subscription["endpoint"].(string); ok {
		_, err := h.service.RegisterMerchantPushSubscription(c.Context(), shopID, endpoint, subscription)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
				Success: false,
				Error:   "Failed to register subscription",
			})
		}

		return c.JSON(PushSubscriptionResponse{Success: true})
	}

	return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
		Success: false,
		Error:   "Invalid subscription",
	})
}

// MerchantPushUnsubscribe handles merchant push unsubscription
func (h *Handler) MerchantPushUnsubscribe(c *fiber.Ctx) error {
	var req PushUnsubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Get shop ID from request or token
	shopID := req.ShopID
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	if user.Role != "admin" && user.Role != "ADMIN" {
		shopID = user.ShopID
	}

	err := h.service.UnregisterMerchantPushSubscription(c.Context(), shopID, req.Endpoint)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Failed to unregister subscription",
		})
	}

	return c.JSON(PushSubscriptionResponse{Success: true})
}

// CustomerPushSubscribe handles customer push subscription
func (h *Handler) CustomerPushSubscribe(c *fiber.Ctx) error {
	var req CustomerPushSubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Get endpoint from subscription
	if endpoint, ok := req.Subscription["endpoint"].(string); ok {
		_, err := h.service.RegisterCustomerPushSubscription(c.Context(), user.ID, endpoint, req.Subscription)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
				Success: false,
				Error:   "Failed to register subscription",
			})
		}

		return c.JSON(PushSubscriptionResponse{Success: true})
	}

	return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
		Success: false,
		Error:   "Invalid subscription",
	})
}

// CustomerPushUnsubscribe handles customer push unsubscription
func (h *Handler) CustomerPushUnsubscribe(c *fiber.Ctx) error {
	var req CustomerPushUnsubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	err := h.service.UnregisterCustomerPushSubscription(c.Context(), user.ID, req.Endpoint)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Failed to unregister subscription",
		})
	}

	return c.JSON(PushSubscriptionResponse{Success: true})
}

// ListMine handles listing notifications for current user
func (h *Handler) ListMine(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(NotificationsListResponse{
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

	notifications, total, err := h.service.GetNotificationsByUserID(c.Context(), user.ID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(NotificationsListResponse{
			Success: false,
			Error:   "Failed to retrieve notifications",
		})
	}

	unreadCount, _ := h.service.GetUnreadCountByUserID(c.Context(), user.ID)

	return c.JSON(NotificationsListResponse{
		Success:     true,
		Data:        notifications,
		Total:       total,
		UnreadCount: unreadCount,
	})
}

// UnreadCountMine handles getting unread count for current user
func (h *Handler) UnreadCountMine(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(UnreadCountResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	count, err := h.service.GetUnreadCountByUserID(c.Context(), user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(UnreadCountResponse{
			Success: false,
			Error:   "Failed to retrieve unread count",
		})
	}

	return c.JSON(UnreadCountResponse{
		Success:     true,
		UnreadCount: count,
	})
}

// MarkAllMineRead handles marking all notifications as read for current user
func (h *Handler) MarkAllMineRead(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	err := h.service.MarkAllAsReadForUser(c.Context(), user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Failed to mark notifications as read",
		})
	}

	return c.JSON(PushSubscriptionResponse{Success: true})
}

// MarkMineRead handles marking a specific notification as read
func (h *Handler) MarkMineRead(c *fiber.Ctx) error {
	_, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	notificationID := c.Params("id")

	err := h.service.MarkAsRead(c.Context(), notificationID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Failed to mark notification as read",
		})
	}

	return c.JSON(PushSubscriptionResponse{Success: true})
}

// ListShop handles listing notifications for a shop
func (h *Handler) ListShop(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(NotificationsListResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Check authorization
	if user.Role != "admin" && user.Role != "ADMIN" && user.ShopID != shopID {
		return c.Status(fiber.StatusForbidden).JSON(NotificationsListResponse{
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

	notifications, total, err := h.service.GetNotificationsByShopID(c.Context(), shopID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(NotificationsListResponse{
			Success: false,
			Error:   "Failed to retrieve notifications",
		})
	}

	unreadCount, _ := h.service.GetUnreadCountByShopID(c.Context(), shopID)

	return c.JSON(NotificationsListResponse{
		Success:     true,
		Data:        notifications,
		Total:       total,
		UnreadCount: unreadCount,
	})
}

// UnreadCountShop handles getting unread count for a shop
func (h *Handler) UnreadCountShop(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(UnreadCountResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Check authorization
	if user.Role != "admin" && user.Role != "ADMIN" && user.ShopID != shopID {
		return c.Status(fiber.StatusForbidden).JSON(UnreadCountResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	count, err := h.service.GetUnreadCountByShopID(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(UnreadCountResponse{
			Success: false,
			Error:   "Failed to retrieve unread count",
		})
	}

	return c.JSON(UnreadCountResponse{
		Success:     true,
		UnreadCount: count,
	})
}

// MarkAllShopRead handles marking all notifications as read for a shop
func (h *Handler) MarkAllShopRead(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Check authorization
	if user.Role != "admin" && user.Role != "ADMIN" && user.ShopID != shopID {
		return c.Status(fiber.StatusForbidden).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	err := h.service.MarkAllAsReadForShop(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Failed to mark notifications as read",
		})
	}

	return c.JSON(PushSubscriptionResponse{Success: true})
}

// MarkShopNotificationRead handles marking a specific shop notification as read
func (h *Handler) MarkShopNotificationRead(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	notificationID := c.Params("id")
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Check authorization
	if user.Role != "admin" && user.Role != "ADMIN" && user.ShopID != shopID {
		return c.Status(fiber.StatusForbidden).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	err := h.service.MarkAsRead(c.Context(), notificationID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Failed to mark notification as read",
		})
	}

	return c.JSON(PushSubscriptionResponse{Success: true})
}

// GetPreferences handles getting notification preferences
func (h *Handler) GetPreferences(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PreferencesResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	prefs, err := h.service.GetNotificationPreferences(c.Context(), user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PreferencesResponse{
			Success: false,
			Error:   "Failed to retrieve preferences",
		})
	}

	return c.JSON(PreferencesResponse{
		Success: true,
		Data:    prefs,
	})
}

// UpdatePreferences handles updating notification preferences
func (h *Handler) UpdatePreferences(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PreferencesResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	var req UpdatePreferencesRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PreferencesResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PreferencesResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	prefs := &NotificationPreferences{
		UserID:       user.ID,
		EmailEnabled: req.EmailEnabled,
		SMSEnabled:   req.SMSEnabled,
		PushEnabled:  req.PushEnabled,
		InAppEnabled: req.InAppEnabled,
		TypeSettings: req.TypeSettings,
	}

	err := h.service.UpdateNotificationPreferences(c.Context(), prefs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PreferencesResponse{
			Success: false,
			Error:   "Failed to update preferences",
		})
	}

	return c.JSON(PreferencesResponse{Success: true})
}

// DeleteMine deletes a user-scoped notification
func (h *Handler) DeleteMine(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	if err := h.service.DeleteForUser(c.Context(), user.ID, c.Params("id")); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Failed to delete notification",
		})
	}

	return c.JSON(PushSubscriptionResponse{Success: true})
}

// DeleteShopNotification deletes a shop-scoped notification
func (h *Handler) DeleteShopNotification(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}
	if user.Role != "admin" && user.Role != "ADMIN" && user.ShopID != shopID {
		return c.Status(fiber.StatusForbidden).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	if err := h.service.DeleteForShop(c.Context(), shopID, c.Params("id")); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PushSubscriptionResponse{
			Success: false,
			Error:   "Failed to delete notification",
		})
	}

	return c.JSON(PushSubscriptionResponse{Success: true})
}
