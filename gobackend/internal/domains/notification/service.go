package notification

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/jobs"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
)

// Service handles notification business logic
type Service struct {
	repo    *Repository
	webPush *WebPushService
	jobs    *jobs.Client
}

// NewService creates a new notification service. jobsClient is optional; when
// provided, push notification fan-out is enqueued for the background worker
// instead of running on an unbounded goroutine per request.
func NewService(repo *Repository, webPush *WebPushService, jobsClient *jobs.Client) *Service {
	return &Service{
		repo:    repo,
		webPush: webPush,
		jobs:    jobsClient,
	}
}

// CreateNotification creates a new notification and sends it via configured channels
func (s *Service) CreateNotification(ctx context.Context, data *NotificationData) (*Notification, error) {
	// Create notification in database
	notification, err := s.repo.CreateNotification(ctx, data)
	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	// Send push notifications if configured
	if s.webPush != nil && s.webPush.IsConfigured() {
		s.dispatchPushNotifications(ctx, data)
	}

	return notification, nil
}

// dispatchPushNotifications enqueues a push fan-out job for the background
// worker. If no jobs client is configured it falls back to sending on a
// detached goroutine so callers are never blocked.
func (s *Service) dispatchPushNotifications(ctx context.Context, data *NotificationData) {
	url := ""
	if data.ShopID != nil {
		url = fmt.Sprintf("/business/dashboard?notification=%s", data.Type)
	} else if data.UserID != nil {
		url = "/profile?tab=notifications"
	}

	payload := jobs.NotificationPushPayload{
		ShopID: data.ShopID,
		UserID: data.UserID,
		Title:  data.Title,
		Body:   data.Content,
		URL:    url,
		Tag:    string(data.Type),
	}

	if s.jobs != nil {
		if err := s.jobs.EnqueueNotificationPush(ctx, payload); err == nil {
			return
		}
		logger.Global().Warn("failed to enqueue notification push job, falling back to inline send")
	}

	go s.sendPushNotifications(context.Background(), data)
}

// sendPushNotifications sends push notifications based on notification data.
// This is the fallback path used when no jobs client is configured; the
// worker's handler performs the same logic for queued jobs.
func (s *Service) sendPushNotifications(ctx context.Context, data *NotificationData) {
	payload := &PushPayload{
		Title: data.Title,
		Body:  data.Content,
		Tag:   string(data.Type),
	}

	// Build URL based on notification type
	if data.ShopID != nil {
		payload.URL = fmt.Sprintf("/business/dashboard?notification=%s", data.Type)
	} else if data.UserID != nil {
		payload.URL = "/profile?tab=notifications"
	}

	// Send to shop subscribers
	if data.ShopID != nil {
		subscriptions, err := s.repo.GetMerchantPushSubscriptions(ctx, *data.ShopID)
		if err == nil {
			s.webPush.SendToMerchantShop(subscriptions, payload)
		}
	}

	// Send to user subscribers
	if data.UserID != nil {
		subscriptions, err := s.repo.GetCustomerPushSubscriptions(ctx, *data.UserID)
		if err == nil {
			s.webPush.SendToCustomerUser(subscriptions, payload)
		}
	}
}

// GetNotificationsByUserID retrieves notifications for a user
func (s *Service) GetNotificationsByUserID(ctx context.Context, userID string, limit, offset int) ([]Notification, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	return s.repo.GetNotificationsByUserID(ctx, userID, limit, offset)
}

// GetNotificationsByShopID retrieves notifications for a shop
func (s *Service) GetNotificationsByShopID(ctx context.Context, shopID string, limit, offset int) ([]Notification, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	return s.repo.GetNotificationsByShopID(ctx, shopID, limit, offset)
}

// GetUnreadCountByUserID returns unread count for a user
func (s *Service) GetUnreadCountByUserID(ctx context.Context, userID string) (int64, error) {
	return s.repo.GetUnreadCountByUserID(ctx, userID)
}

// GetUnreadCountByShopID returns unread count for a shop
func (s *Service) GetUnreadCountByShopID(ctx context.Context, shopID string) (int64, error) {
	return s.repo.GetUnreadCountByShopID(ctx, shopID)
}

// MarkAsRead marks a specific notification as read
func (s *Service) MarkAsRead(ctx context.Context, notificationID string) error {
	return s.repo.MarkAsRead(ctx, notificationID)
}

// MarkAllAsReadForUser marks all notifications as read for a user
func (s *Service) MarkAllAsReadForUser(ctx context.Context, userID string) error {
	return s.repo.MarkAllAsReadForUser(ctx, userID)
}

// MarkAllAsReadForShop marks all notifications as read for a shop
func (s *Service) MarkAllAsReadForShop(ctx context.Context, shopID string) error {
	return s.repo.MarkAllAsReadForShop(ctx, shopID)
}

// DeleteForUser deletes a notification scoped to a user
func (s *Service) DeleteForUser(ctx context.Context, userID, notificationID string) error {
	return s.repo.DeleteForUser(ctx, userID, notificationID)
}

// DeleteForShop deletes a notification scoped to a shop
func (s *Service) DeleteForShop(ctx context.Context, shopID, notificationID string) error {
	return s.repo.DeleteForShop(ctx, shopID, notificationID)
}

// RegisterMerchantPushSubscription registers a merchant push subscription
func (s *Service) RegisterMerchantPushSubscription(ctx context.Context, shopID, endpoint string, subscription map[string]interface{}) (*MerchantPushSubscription, error) {
	return s.repo.CreateMerchantPushSubscription(ctx, shopID, endpoint, subscription)
}

// UnregisterMerchantPushSubscription unregisters a merchant push subscription
func (s *Service) UnregisterMerchantPushSubscription(ctx context.Context, shopID, endpoint string) error {
	return s.repo.DeactivateMerchantPushSubscription(ctx, shopID, endpoint)
}

// RegisterCustomerPushSubscription registers a customer push subscription
func (s *Service) RegisterCustomerPushSubscription(ctx context.Context, userID, endpoint string, subscription map[string]interface{}) (*CustomerPushSubscription, error) {
	return s.repo.CreateCustomerPushSubscription(ctx, userID, endpoint, subscription)
}

// UnregisterCustomerPushSubscription unregisters a customer push subscription
func (s *Service) UnregisterCustomerPushSubscription(ctx context.Context, userID, endpoint string) error {
	return s.repo.DeactivateCustomerPushSubscription(ctx, userID, endpoint)
}

// GetNotificationPreferences retrieves notification preferences for a user
func (s *Service) GetNotificationPreferences(ctx context.Context, userID string) (*NotificationPreferences, error) {
	prefs, err := s.repo.GetNotificationPreferences(ctx, userID)
	if err != nil {
		// Return default preferences if not found
		return &NotificationPreferences{
			UserID:       userID,
			EmailEnabled: true,
			SMSEnabled:   false,
			PushEnabled:  true,
			InAppEnabled: true,
			TypeSettings: make(map[NotificationType]TypePreference),
			CreatedAt:    time.Now().UTC().Format(time.RFC3339),
			UpdatedAt:    time.Now().UTC().Format(time.RFC3339),
		}, nil
	}
	return prefs, nil
}

// UpdateNotificationPreferences updates notification preferences for a user
func (s *Service) UpdateNotificationPreferences(ctx context.Context, prefs *NotificationPreferences) error {
	prefs.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	return s.repo.CreateOrUpdateNotificationPreferences(ctx, prefs)
}

// NotifyNewFollower sends a notification when a user follows a shop
func (s *Service) NotifyNewFollower(ctx context.Context, shopID string, followerID string, followerName string) error {
	data := &NotificationData{
		Type:     NotificationTypeNewFollower,
		Title:    "متابع جديد",
		Content:  fmt.Sprintf("قام %s بمتابعة متجرك", followerName),
		ShopID:   &shopID,
		Priority: NotificationPriorityMedium,
		Channels: []NotificationChannel{NotificationChannelInApp, NotificationChannelPush},
		Metadata: map[string]interface{}{
			"follower_id":   followerID,
			"follower_name": followerName,
		},
	}

	_, err := s.CreateNotification(ctx, data)
	return err
}

// NotifyNewOrder sends an urgent notification to the shop when a new order
// arrives. source is "customer"/"website" (website) or "pos" (point of sale /
// cashier) so the dashboard can ring a different bell per source.
func (s *Service) NotifyNewOrder(ctx context.Context, shopID string, orderID string, orderNumber string, source string, total float64) error {
	isPOS := strings.EqualFold(strings.TrimSpace(source), "pos")
	sourceLabel := "الموقع"
	if isPOS {
		sourceLabel = "نقطة البيع"
	}

	data := &NotificationData{
		Type:     NotificationTypeNewOrder,
		Title:    fmt.Sprintf("🔔 طلب جديد من %s", sourceLabel),
		Content:  fmt.Sprintf("طلب جديد #%s بقيمة %.2f جنيه من %s", orderNumber, total, sourceLabel),
		ShopID:   &shopID,
		OrderID:  &orderID,
		Priority: NotificationPriorityUrgent,
		Channels: []NotificationChannel{NotificationChannelInApp, NotificationChannelPush},
		Metadata: map[string]interface{}{
			"order_id":     orderID,
			"order_number": orderNumber,
			"order_source": map[bool]string{true: "pos", false: "website"}[isPOS],
			"total":        total,
		},
	}

	_, err := s.CreateNotification(ctx, data)
	return err
}

// NotifyAdminsNewOrder notifies every active admin that a new order was
// placed on the platform (user-channel rows — visible in the admin panel bell).
func (s *Service) NotifyAdminsNewOrder(ctx context.Context, shopName string, orderID string, orderNumber string, total float64) error {
	adminIDs, err := s.repo.GetActiveAdminIDs(ctx)
	if err != nil {
		return err
	}
	for _, adminID := range adminIDs {
		id := adminID
		data := &NotificationData{
			Type:     NotificationTypeNewOrder,
			Title:    "🔔 طلب جديد على المنصة",
			Content:  fmt.Sprintf("طلب جديد #%s بقيمة %.2f جنيه من متجر %s", orderNumber, total, shopName),
			UserID:   &id,
			OrderID:  &orderID,
			Priority: NotificationPriorityHigh,
			Channels: []NotificationChannel{NotificationChannelInApp},
			Metadata: map[string]interface{}{
				"order_id":     orderID,
				"order_number": orderNumber,
				"shop_name":    shopName,
				"total":        total,
				"audience":     "admin",
			},
		}
		if _, err := s.CreateNotification(ctx, data); err != nil {
			return err
		}
	}
	return nil
}

// NotifyAdminsNewShop notifies every active admin that a new merchant shop
// was registered (self-serve onboarding) so the panel can review it.
func (s *Service) NotifyAdminsNewShop(ctx context.Context, shopID string, shopName string, ownerName string) error {
	adminIDs, err := s.repo.GetActiveAdminIDs(ctx)
	if err != nil {
		return err
	}
	for _, adminID := range adminIDs {
		id := adminID
		data := &NotificationData{
			Type:     NotificationTypeNewShop,
			Title:    "🏪 متجر جديد انضم للمنصة",
			Content:  fmt.Sprintf("المتجر \"%s\" (المالك: %s) سجل للتو — راجع بياناته من لوحة الأدمن", shopName, ownerName),
			UserID:   &id,
			ShopID:   &shopID,
			Priority: NotificationPriorityMedium,
			Channels: []NotificationChannel{NotificationChannelInApp},
			Metadata: map[string]interface{}{
				"shop_id":    shopID,
				"shop_name":  shopName,
				"owner_name": ownerName,
				"audience":   "admin",
			},
		}
		if _, err := s.CreateNotification(ctx, data); err != nil {
			return err
		}
	}
	return nil
}

// NotifyOrderStatusChanged sends a notification when order status changes
func (s *Service) NotifyOrderStatusChanged(ctx context.Context, userID string, orderID string, orderNumber string, status string) error {
	data := &NotificationData{
		Type:     NotificationTypeOrderStatusChanged,
		Title:    "تحديث حالة الطلب",
		Content:  fmt.Sprintf("تم تحديث حالة طلبك #%s إلى %s", orderNumber, status),
		UserID:   &userID,
		OrderID:  &orderID,
		Priority: NotificationPriorityHigh,
		Channels: []NotificationChannel{NotificationChannelInApp, NotificationChannelPush},
		Metadata: map[string]interface{}{
			"order_id":     orderID,
			"order_number": orderNumber,
			"status":       status,
		},
	}

	_, err := s.CreateNotification(ctx, data)
	return err
}

// NotifyNewMessage sends a notification when a new message is received
func (s *Service) NotifyNewMessage(ctx context.Context, shopID string, userID string, senderName string) error {
	data := &NotificationData{
		Type:     NotificationTypeNewMessage,
		Title:    "رسالة جديدة",
		Content:  fmt.Sprintf("رسالة جديدة من %s", senderName),
		ShopID:   &shopID,
		UserID:   &userID,
		Priority: NotificationPriorityMedium,
		Channels: []NotificationChannel{NotificationChannelInApp, NotificationChannelPush},
		Metadata: map[string]interface{}{
			"user_id":     userID,
			"sender_name": senderName,
		},
	}

	_, err := s.CreateNotification(ctx, data)
	return err
}

// NotifyLowStock sends a notification when product stock is low
func (s *Service) NotifyLowStock(ctx context.Context, shopID string, productID string, productName string, currentStock int) error {
	data := &NotificationData{
		Type:     NotificationTypeLowStock,
		Title:    "مخزون منخفض",
		Content:  fmt.Sprintf("المنتج %s وصل لمخزون منخفض (%d)", productName, currentStock),
		ShopID:   &shopID,
		Priority: NotificationPriorityHigh,
		Channels: []NotificationChannel{NotificationChannelInApp, NotificationChannelPush, NotificationChannelEmail},
		Metadata: map[string]interface{}{
			"product_id":    productID,
			"product_name":  productName,
			"current_stock": currentStock,
		},
	}

	_, err := s.CreateNotification(ctx, data)
	return err
}

// NotifyOrderConfirmed sends a notification when order is confirmed
func (s *Service) NotifyOrderConfirmed(ctx context.Context, userID string, orderID string, orderNumber string) error {
	data := &NotificationData{
		Type:     NotificationTypeOrderConfirmed,
		Title:    "تم تأكيد طلبك",
		Content:  fmt.Sprintf("تم تأكيد طلبك #%s", orderNumber),
		UserID:   &userID,
		OrderID:  &orderID,
		Priority: NotificationPriorityHigh,
		Channels: []NotificationChannel{NotificationChannelInApp, NotificationChannelPush},
		Metadata: map[string]interface{}{
			"order_id":     orderID,
			"order_number": orderNumber,
		},
	}

	_, err := s.CreateNotification(ctx, data)
	return err
}

// NotifyOrderShipped sends a notification when order is shipped
func (s *Service) NotifyOrderShipped(ctx context.Context, userID string, orderID string, orderNumber string) error {
	data := &NotificationData{
		Type:     NotificationTypeOrderShipped,
		Title:    "تم شحن طلبك",
		Content:  fmt.Sprintf("تم شحن طلبك #%s", orderNumber),
		UserID:   &userID,
		OrderID:  &orderID,
		Priority: NotificationPriorityHigh,
		Channels: []NotificationChannel{NotificationChannelInApp, NotificationChannelPush},
		Metadata: map[string]interface{}{
			"order_id":     orderID,
			"order_number": orderNumber,
		},
	}

	_, err := s.CreateNotification(ctx, data)
	return err
}

// NotifyOrderDelivered sends a notification when order is delivered
func (s *Service) NotifyOrderDelivered(ctx context.Context, userID string, orderID string, orderNumber string) error {
	data := &NotificationData{
		Type:     NotificationTypeOrderDelivered,
		Title:    "تم توصيل طلبك",
		Content:  fmt.Sprintf("تم توصيل طلبك #%s بنجاح", orderNumber),
		UserID:   &userID,
		OrderID:  &orderID,
		Priority: NotificationPriorityHigh,
		Channels: []NotificationChannel{NotificationChannelInApp, NotificationChannelPush},
		Metadata: map[string]interface{}{
			"order_id":     orderID,
			"order_number": orderNumber,
		},
	}

	_, err := s.CreateNotification(ctx, data)
	return err
}

// NotifyPaymentReceived sends a notification when payment is received
func (s *Service) NotifyPaymentReceived(ctx context.Context, shopID string, orderID string, orderNumber string, amount float64) error {
	data := &NotificationData{
		Type:     NotificationTypePaymentReceived,
		Title:    "تم استلام الدفع",
		Content:  fmt.Sprintf("تم استلام دفع %.2f للطلب #%s", amount, orderNumber),
		ShopID:   &shopID,
		OrderID:  &orderID,
		Priority: NotificationPriorityHigh,
		Channels: []NotificationChannel{NotificationChannelInApp, NotificationChannelPush},
		Metadata: map[string]interface{}{
			"order_id":     orderID,
			"order_number": orderNumber,
			"amount":       amount,
		},
	}

	_, err := s.CreateNotification(ctx, data)
	return err
}
