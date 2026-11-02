package notification

import "github.com/go-playground/validator/v10"

// CreateNotificationRequest represents a request to create a notification
type CreateNotificationRequest struct {
	Type        NotificationType       `json:"type" validate:"required"`
	Title       string                 `json:"title" validate:"required,min=1,max=255"`
	Content     string                 `json:"content" validate:"required,min=1,max=2000"`
	ShopID      *string                `json:"shop_id,omitempty" validate:"omitempty,uuid"`
	UserID      *string                `json:"user_id,omitempty" validate:"omitempty,uuid"`
	OrderID     *string                `json:"order_id,omitempty" validate:"omitempty,uuid"`
	Priority    NotificationPriority   `json:"priority,omitempty"`
	Channels    []NotificationChannel  `json:"channels,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// Validate validates the request
func (r *CreateNotificationRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// PushSubscribeRequest represents a request to subscribe to push notifications
type PushSubscribeRequest struct {
	ShopID      string                 `json:"shop_id" validate:"required,uuid"`
	Subscription map[string]interface{} `json:"subscription" validate:"required"`
}

// Validate validates the request
func (r *PushSubscribeRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// PushUnsubscribeRequest represents a request to unsubscribe from push notifications
type PushUnsubscribeRequest struct {
	ShopID   string `json:"shop_id" validate:"required,uuid"`
	Endpoint string `json:"endpoint" validate:"required,min=1"`
}

// Validate validates the request
func (r *PushUnsubscribeRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// CustomerPushSubscribeRequest represents a customer push subscription request
type CustomerPushSubscribeRequest struct {
	Subscription map[string]interface{} `json:"subscription" validate:"required"`
}

// Validate validates the request
func (r *CustomerPushSubscribeRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// CustomerPushUnsubscribeRequest represents a customer push unsubscription request
type CustomerPushUnsubscribeRequest struct {
	Endpoint string `json:"endpoint" validate:"required,min=1"`
}

// Validate validates the request
func (r *CustomerPushUnsubscribeRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// ListNotificationsRequest represents a request to list notifications
type ListNotificationsRequest struct {
	UserID *string `json:"user_id,omitempty" validate:"omitempty,uuid"`
	ShopID *string `json:"shop_id,omitempty" validate:"omitempty,uuid"`
	Limit  int     `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
	Offset int     `json:"offset,omitempty" validate:"omitempty,min=0"`
}

// Validate validates the request
func (r *ListNotificationsRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// MarkAsReadRequest represents a request to mark notifications as read
type MarkAsReadRequest struct {
	NotificationID string `json:"notification_id,omitempty" validate:"omitempty,uuid"`
}

// Validate validates the request
func (r *MarkAsReadRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// UpdatePreferencesRequest represents a request to update notification preferences
type UpdatePreferencesRequest struct {
	EmailEnabled  bool                               `json:"email_enabled"`
	SMSEnabled    bool                               `json:"sms_enabled"`
	PushEnabled   bool                               `json:"push_enabled"`
	InAppEnabled  bool                               `json:"in_app_enabled"`
	TypeSettings  map[NotificationType]TypePreference `json:"type_settings,omitempty"`
}

// Validate validates the request
func (r *UpdatePreferencesRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// NotificationResponse represents a notification response
type NotificationResponse struct {
	Success bool          `json:"success"`
	Data    *Notification `json:"data,omitempty"`
	Error   string        `json:"error,omitempty"`
}

// NotificationsListResponse represents a list of notifications response
type NotificationsListResponse struct {
	Success      bool             `json:"success"`
	Data         []Notification   `json:"data,omitempty"`
	Total        int64            `json:"total,omitempty"`
	UnreadCount  int64            `json:"unread_count,omitempty"`
	Error        string           `json:"error,omitempty"`
}

// PushSubscriptionResponse represents a push subscription response
type PushSubscriptionResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// UnreadCountResponse represents unread count response
type UnreadCountResponse struct {
	Success     bool   `json:"success"`
	UnreadCount int64  `json:"unread_count,omitempty"`
	Error       string `json:"error,omitempty"`
}

// PreferencesResponse represents notification preferences response
type PreferencesResponse struct {
	Success bool                    `json:"success"`
	Data    *NotificationPreferences `json:"data,omitempty"`
	Error   string                  `json:"error,omitempty"`
}
