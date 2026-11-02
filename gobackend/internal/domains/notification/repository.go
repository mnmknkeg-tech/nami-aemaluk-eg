package notification

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for notifications
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new notification repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// GetActiveAdminIDs returns the IDs of all active admin users.
func (r *Repository) GetActiveAdminIDs(ctx context.Context) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT id FROM users WHERE role = 'ADMIN' AND is_active = true`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// CreateNotification creates a new notification
func (r *Repository) CreateNotification(ctx context.Context, data *NotificationData) (*Notification, error) {
	id := uuid.New().String()
	now := time.Now().UTC()
	
	// Default values
	priority := data.Priority
	if priority == "" {
		priority = NotificationPriorityMedium
	}
	
	channels := data.Channels
	if len(channels) == 0 {
		channels = []NotificationChannel{NotificationChannelInApp}
	}
	
	metadataJSON, _ := json.Marshal(data.Metadata)
	
	query := `
		INSERT INTO notifications (
			id, title, content, type, priority, shop_id, user_id, order_id,
			channels, metadata, is_read, sent_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, title, content, type, priority, shop_id, user_id, order_id,
			channels, metadata, is_read, read_at, sent_at, created_at, updated_at
	`
	
	var notification Notification
	var channelsJSON []byte
	var metadataJSONResult []byte
	var readAt sql.NullTime
	var sentAt sql.NullTime
	
	err := r.pool.QueryRow(ctx, query,
		id, data.Title, data.Content, data.Type, priority,
		data.ShopID, data.UserID, data.OrderID,
		channels, metadataJSON, false, now, now, now,
	).Scan(
		&notification.ID, &notification.Title, &notification.Content,
		&notification.Type, &notification.Priority,
		&notification.ShopID, &notification.UserID, &notification.OrderID,
		&channelsJSON, &metadataJSONResult, &notification.IsRead,
		&readAt, &sentAt, &notification.CreatedAt, &notification.UpdatedAt,
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}
	
	// Parse JSON fields
	json.Unmarshal(channelsJSON, &notification.Channels)
	json.Unmarshal(metadataJSONResult, &notification.Metadata)
	
	if readAt.Valid {
		readAtStr := readAt.Time.UTC().Format(time.RFC3339)
		notification.ReadAt = &readAtStr
	}
	
	if sentAt.Valid {
		notification.SentAt = sentAt.Time.UTC().Format(time.RFC3339)
	}
	
	notification.CreatedAt = now.UTC().Format(time.RFC3339)
	notification.UpdatedAt = now.UTC().Format(time.RFC3339)
	
	return &notification, nil
}

// GetNotificationsByUserID retrieves notifications for a specific user
// pgTsToRFC3339 normalizes a Postgres timestamp text value to RFC3339.
func pgTsToRFC3339(s string) string {
	if s == "" {
		return ""
	}
	for _, layout := range []string{"2006-01-02 15:04:05.999", "2006-01-02 15:04:05", time.RFC3339Nano, time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.UTC().Format(time.RFC3339)
		}
	}
	return s
}

func (r *Repository) GetNotificationsByUserID(ctx context.Context, userID string, limit, offset int) ([]Notification, int64, error) {
	query := `
		SELECT id, title, content, type, COALESCE(priority, 'MEDIUM'), shop_id, user_id, order_id,
			COALESCE(channels, '[]'::jsonb), COALESCE(metadata, '{}'::jsonb), is_read, read_at, sent_at,
			created_at::text, updated_at::text
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	
	countQuery := `
		SELECT COUNT(*)
		FROM notifications
		WHERE user_id = $1
	`
	
	// Get total count
	var total int64
	err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count notifications: %w", err)
	}
	
	// Get notifications
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query notifications: %w", err)
	}
	defer rows.Close()
	
	var notifications []Notification
	for rows.Next() {
		var notification Notification
		var channelsJSON []byte
		var metadataJSON []byte
		var readAt sql.NullTime
		var sentAt sql.NullTime
		
		err := rows.Scan(
			&notification.ID, &notification.Title, &notification.Content,
			&notification.Type, &notification.Priority,
			&notification.ShopID, &notification.UserID, &notification.OrderID,
			&channelsJSON, &metadataJSON, &notification.IsRead,
			&readAt, &sentAt, &notification.CreatedAt, &notification.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan notification: %w", err)
		}
		
		json.Unmarshal(channelsJSON, &notification.Channels)
		json.Unmarshal(metadataJSON, &notification.Metadata)
		
		if readAt.Valid {
			readAtStr := readAt.Time.UTC().Format(time.RFC3339)
			notification.ReadAt = &readAtStr
		}
		
		if sentAt.Valid {
			notification.SentAt = sentAt.Time.UTC().Format(time.RFC3339)
		}
		
		notification.CreatedAt = pgTsToRFC3339(notification.CreatedAt)
		notification.UpdatedAt = pgTsToRFC3339(notification.UpdatedAt)

		notifications = append(notifications, notification)
	}

	return notifications, total, nil
}

// GetNotificationsByShopID retrieves notifications for a specific shop
func (r *Repository) GetNotificationsByShopID(ctx context.Context, shopID string, limit, offset int) ([]Notification, int64, error) {
	query := `
		SELECT id, title, content, type, COALESCE(priority, 'MEDIUM'), shop_id, user_id, order_id,
			COALESCE(channels, '[]'::jsonb), COALESCE(metadata, '{}'::jsonb), is_read, read_at, sent_at,
			created_at::text, updated_at::text
		FROM notifications
		WHERE shop_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	
	countQuery := `
		SELECT COUNT(*)
		FROM notifications
		WHERE shop_id = $1
	`
	
	// Get total count
	var total int64
	err := r.pool.QueryRow(ctx, countQuery, shopID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count notifications: %w", err)
	}
	
	// Get notifications
	rows, err := r.pool.Query(ctx, query, shopID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query notifications: %w", err)
	}
	defer rows.Close()
	
	var notifications []Notification
	for rows.Next() {
		var notification Notification
		var channelsJSON []byte
		var metadataJSON []byte
		var readAt sql.NullTime
		var sentAt sql.NullTime
		
		err := rows.Scan(
			&notification.ID, &notification.Title, &notification.Content,
			&notification.Type, &notification.Priority,
			&notification.ShopID, &notification.UserID, &notification.OrderID,
			&channelsJSON, &metadataJSON, &notification.IsRead,
			&readAt, &sentAt, &notification.CreatedAt, &notification.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan notification: %w", err)
		}
		
		json.Unmarshal(channelsJSON, &notification.Channels)
		json.Unmarshal(metadataJSON, &notification.Metadata)
		
		if readAt.Valid {
			readAtStr := readAt.Time.UTC().Format(time.RFC3339)
			notification.ReadAt = &readAtStr
		}
		
		if sentAt.Valid {
			notification.SentAt = sentAt.Time.UTC().Format(time.RFC3339)
		}
		
		notification.CreatedAt = pgTsToRFC3339(notification.CreatedAt)
		notification.UpdatedAt = pgTsToRFC3339(notification.UpdatedAt)

		notifications = append(notifications, notification)
	}

	return notifications, total, nil
}

// GetUnreadCountByUserID returns the count of unread notifications for a user
func (r *Repository) GetUnreadCountByUserID(ctx context.Context, userID string) (int64, error) {
	query := `
		SELECT COUNT(*)
		FROM notifications
		WHERE user_id = $1 AND is_read = false
	`
	
	var count int64
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	
	return count, nil
}

// GetUnreadCountByShopID returns the count of unread notifications for a shop
func (r *Repository) GetUnreadCountByShopID(ctx context.Context, shopID string) (int64, error) {
	query := `
		SELECT COUNT(*)
		FROM notifications
		WHERE shop_id = $1 AND is_read = false
	`
	
	var count int64
	err := r.pool.QueryRow(ctx, query, shopID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	
	return count, nil
}

// MarkAsRead marks a notification as read
func (r *Repository) MarkAsRead(ctx context.Context, notificationID string) error {
	query := `
		UPDATE notifications
		SET is_read = true, read_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`
	
	_, err := r.pool.Exec(ctx, query, notificationID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}
	
	return nil
}

// MarkAllAsReadForUser marks all notifications as read for a user
func (r *Repository) MarkAllAsReadForUser(ctx context.Context, userID string) error {
	query := `
		UPDATE notifications
		SET is_read = true, read_at = NOW(), updated_at = NOW()
		WHERE user_id = $1 AND is_read = false
	`
	
	_, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}
	
	return nil
}

// MarkAllAsReadForShop marks all notifications as read for a shop
func (r *Repository) MarkAllAsReadForShop(ctx context.Context, shopID string) error {
	query := `
		UPDATE notifications
		SET is_read = true, read_at = NOW(), updated_at = NOW()
		WHERE shop_id = $1 AND is_read = false
	`
	
	_, err := r.pool.Exec(ctx, query, shopID)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}
	
	return nil
}

// DeleteForUser deletes a notification scoped to a user
func (r *Repository) DeleteForUser(ctx context.Context, userID, notificationID string) error {
	tag, err := r.pool.Exec(ctx,
		"DELETE FROM notifications WHERE id = $1 AND user_id = $2",
		notificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("notification not found")
	}
	return nil
}

// DeleteForShop deletes a notification scoped to a shop
func (r *Repository) DeleteForShop(ctx context.Context, shopID, notificationID string) error {
	tag, err := r.pool.Exec(ctx,
		"DELETE FROM notifications WHERE id = $1 AND shop_id = $2",
		notificationID, shopID)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("notification not found")
	}
	return nil
}

// CreateMerchantPushSubscription creates a new merchant push subscription
func (r *Repository) CreateMerchantPushSubscription(ctx context.Context, shopID, endpoint string, subscription map[string]interface{}) (*MerchantPushSubscription, error) {
	id := uuid.New().String()
	now := time.Now().UTC()
	
	subscriptionJSON, _ := json.Marshal(subscription)
	
	query := `
		INSERT INTO merchant_push_subscriptions (id, shop_id, endpoint, subscription, is_active, last_seen_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (shop_id, endpoint) 
		DO UPDATE SET subscription = $4, is_active = $5, last_seen_at = $6, updated_at = $8
		RETURNING id, shop_id, endpoint, subscription, is_active, last_seen_at, created_at, updated_at
	`
	
	var sub MerchantPushSubscription
	var subscriptionJSONResult []byte
	var lastSeenAt sql.NullTime
	
	err := r.pool.QueryRow(ctx, query,
		id, shopID, endpoint, subscriptionJSON, true, now, now, now,
	).Scan(
		&sub.ID, &sub.ShopID, &sub.Endpoint,
		&subscriptionJSONResult, &sub.IsActive, &lastSeenAt,
		&sub.CreatedAt, &sub.UpdatedAt,
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create merchant push subscription: %w", err)
	}
	
	json.Unmarshal(subscriptionJSONResult, &sub.Subscription)
	
	if lastSeenAt.Valid {
		lastSeenAtStr := lastSeenAt.Time.UTC().Format(time.RFC3339)
		sub.LastSeenAt = &lastSeenAtStr
	}
	
	sub.CreatedAt = now.UTC().Format(time.RFC3339)
	sub.UpdatedAt = now.UTC().Format(time.RFC3339)
	
	return &sub, nil
}

// DeactivateMerchantPushSubscription deactivates a merchant push subscription
func (r *Repository) DeactivateMerchantPushSubscription(ctx context.Context, shopID, endpoint string) error {
	query := `
		UPDATE merchant_push_subscriptions
		SET is_active = false, updated_at = NOW()
		WHERE shop_id = $1 AND endpoint = $2
	`
	
	_, err := r.pool.Exec(ctx, query, shopID, endpoint)
	if err != nil {
		return fmt.Errorf("failed to deactivate merchant push subscription: %w", err)
	}
	
	return nil
}

// GetMerchantPushSubscriptions retrieves active push subscriptions for a shop
func (r *Repository) GetMerchantPushSubscriptions(ctx context.Context, shopID string) ([]MerchantPushSubscription, error) {
	query := `
		SELECT id, shop_id, endpoint, subscription, is_active, last_seen_at, created_at, updated_at
		FROM merchant_push_subscriptions
		WHERE shop_id = $1 AND is_active = true
		LIMIT 200
	`
	
	rows, err := r.pool.Query(ctx, query, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to query merchant push subscriptions: %w", err)
	}
	defer rows.Close()
	
	var subscriptions []MerchantPushSubscription
	for rows.Next() {
		var sub MerchantPushSubscription
		var subscriptionJSON []byte
		var lastSeenAt sql.NullTime
		
		err := rows.Scan(
			&sub.ID, &sub.ShopID, &sub.Endpoint,
			&subscriptionJSON, &sub.IsActive, &lastSeenAt,
			&sub.CreatedAt, &sub.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan merchant push subscription: %w", err)
		}
		
		json.Unmarshal(subscriptionJSON, &sub.Subscription)
		
		if lastSeenAt.Valid {
			lastSeenAtStr := lastSeenAt.Time.UTC().Format(time.RFC3339)
			sub.LastSeenAt = &lastSeenAtStr
		}
		
		sub.CreatedAt = sub.CreatedAt[:len("2006-01-02T15:04:05.999Z")]
		sub.UpdatedAt = sub.UpdatedAt[:len("2006-01-02T15:04:05.999Z")]
		
		subscriptions = append(subscriptions, sub)
	}
	
	return subscriptions, nil
}

// CreateCustomerPushSubscription creates a new customer push subscription
func (r *Repository) CreateCustomerPushSubscription(ctx context.Context, userID, endpoint string, subscription map[string]interface{}) (*CustomerPushSubscription, error) {
	id := uuid.New().String()
	now := time.Now().UTC()
	
	subscriptionJSON, _ := json.Marshal(subscription)
	
	query := `
		INSERT INTO customer_push_subscriptions (id, user_id, endpoint, subscription, is_active, last_seen_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id, endpoint) 
		DO UPDATE SET subscription = $4, is_active = $5, last_seen_at = $6, updated_at = $8
		RETURNING id, user_id, endpoint, subscription, is_active, last_seen_at, created_at, updated_at
	`
	
	var sub CustomerPushSubscription
	var subscriptionJSONResult []byte
	var lastSeenAt sql.NullTime
	
	err := r.pool.QueryRow(ctx, query,
		id, userID, endpoint, subscriptionJSON, true, now, now, now,
	).Scan(
		&sub.ID, &sub.UserID, &sub.Endpoint,
		&subscriptionJSONResult, &sub.IsActive, &lastSeenAt,
		&sub.CreatedAt, &sub.UpdatedAt,
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create customer push subscription: %w", err)
	}
	
	json.Unmarshal(subscriptionJSONResult, &sub.Subscription)
	
	if lastSeenAt.Valid {
		lastSeenAtStr := lastSeenAt.Time.UTC().Format(time.RFC3339)
		sub.LastSeenAt = &lastSeenAtStr
	}
	
	sub.CreatedAt = now.UTC().Format(time.RFC3339)
	sub.UpdatedAt = now.UTC().Format(time.RFC3339)
	
	return &sub, nil
}

// DeactivateCustomerPushSubscription deactivates a customer push subscription
func (r *Repository) DeactivateCustomerPushSubscription(ctx context.Context, userID, endpoint string) error {
	query := `
		UPDATE customer_push_subscriptions
		SET is_active = false, updated_at = NOW()
		WHERE user_id = $1 AND endpoint = $2
	`
	
	_, err := r.pool.Exec(ctx, query, userID, endpoint)
	if err != nil {
		return fmt.Errorf("failed to deactivate customer push subscription: %w", err)
	}
	
	return nil
}

// GetCustomerPushSubscriptions retrieves active push subscriptions for a user
func (r *Repository) GetCustomerPushSubscriptions(ctx context.Context, userID string) ([]CustomerPushSubscription, error) {
	query := `
		SELECT id, user_id, endpoint, subscription, is_active, last_seen_at, created_at, updated_at
		FROM customer_push_subscriptions
		WHERE user_id = $1 AND is_active = true
		LIMIT 200
	`
	
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query customer push subscriptions: %w", err)
	}
	defer rows.Close()
	
	var subscriptions []CustomerPushSubscription
	for rows.Next() {
		var sub CustomerPushSubscription
		var subscriptionJSON []byte
		var lastSeenAt sql.NullTime
		
		err := rows.Scan(
			&sub.ID, &sub.UserID, &sub.Endpoint,
			&subscriptionJSON, &sub.IsActive, &lastSeenAt,
			&sub.CreatedAt, &sub.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan customer push subscription: %w", err)
		}
		
		json.Unmarshal(subscriptionJSON, &sub.Subscription)
		
		if lastSeenAt.Valid {
			lastSeenAtStr := lastSeenAt.Time.UTC().Format(time.RFC3339)
			sub.LastSeenAt = &lastSeenAtStr
		}
		
		sub.CreatedAt = sub.CreatedAt[:len("2006-01-02T15:04:05.999Z")]
		sub.UpdatedAt = sub.UpdatedAt[:len("2006-01-02T15:04:05.999Z")]
		
		subscriptions = append(subscriptions, sub)
	}
	
	return subscriptions, nil
}

// GetNotificationPreferences retrieves notification preferences for a user
func (r *Repository) GetNotificationPreferences(ctx context.Context, userID string) (*NotificationPreferences, error) {
	query := `
		SELECT user_id, email_enabled, sms_enabled, push_enabled, in_app_enabled, type_settings, created_at, updated_at
		FROM notification_preferences
		WHERE user_id = $1
	`
	
	var prefs NotificationPreferences
	var typeSettingsJSON []byte
	
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&prefs.UserID, &prefs.EmailEnabled, &prefs.SMSEnabled,
		&prefs.PushEnabled, &prefs.InAppEnabled, &typeSettingsJSON,
		&prefs.CreatedAt, &prefs.UpdatedAt,
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to get notification preferences: %w", err)
	}
	
	json.Unmarshal(typeSettingsJSON, &prefs.TypeSettings)
	
	prefs.CreatedAt = prefs.CreatedAt[:len("2006-01-02T15:04:05.999Z")]
	prefs.UpdatedAt = prefs.UpdatedAt[:len("2006-01-02T15:04:05.999Z")]
	
	return &prefs, nil
}

// CreateOrUpdateNotificationPreferences creates or updates notification preferences
func (r *Repository) CreateOrUpdateNotificationPreferences(ctx context.Context, prefs *NotificationPreferences) error {
	typeSettingsJSON, _ := json.Marshal(prefs.TypeSettings)
	
	query := `
		INSERT INTO notification_preferences (user_id, email_enabled, sms_enabled, push_enabled, in_app_enabled, type_settings, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (user_id) 
		DO UPDATE SET email_enabled = $2, sms_enabled = $3, push_enabled = $4, in_app_enabled = $5, type_settings = $6, updated_at = NOW()
	`
	
	_, err := r.pool.Exec(ctx, query,
		prefs.UserID, prefs.EmailEnabled, prefs.SMSEnabled,
		prefs.PushEnabled, prefs.InAppEnabled, typeSettingsJSON,
	)
	
	if err != nil {
		return fmt.Errorf("failed to create/update notification preferences: %w", err)
	}
	
	return nil
}

