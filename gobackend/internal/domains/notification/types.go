package notification

// NotificationType represents the type of notification
type NotificationType string

const (
	// Shop notifications (for merchants)
	NotificationTypeNewFollower        NotificationType = "NEW_FOLLOWER"
	NotificationTypeNewOrder           NotificationType = "NEW_ORDER"
	NotificationTypeNewShop            NotificationType = "NEW_SHOP"
	NotificationTypeOrderStatusChanged NotificationType = "ORDER_STATUS_CHANGED"
	NotificationTypeNewMessage         NotificationType = "NEW_MESSAGE"
	NotificationTypeShopVisit          NotificationType = "SHOP_VISIT"
	NotificationTypeProductView        NotificationType = "PRODUCT_VIEW"
	NotificationTypeLowStock           NotificationType = "LOW_STOCK"
	NotificationTypeOfferExpiring      NotificationType = "OFFER_EXPIRING"
	NotificationTypePaymentReceived    NotificationType = "PAYMENT_RECEIVED"
	NotificationTypeReviewReceived     NotificationType = "REVIEW_RECEIVED"

	// Customer notifications
	NotificationTypeOrderConfirmed    NotificationType = "ORDER_CONFIRMED"
	NotificationTypeOrderShipped       NotificationType = "ORDER_SHIPPED"
	NotificationTypeOrderDelivered     NotificationType = "ORDER_DELIVERED"
	NotificationTypeOrderCancelled     NotificationType = "ORDER_CANCELLED"
	NotificationTypePaymentSuccessful  NotificationType = "PAYMENT_SUCCESSFUL"
	NotificationTypePaymentFailed      NotificationType = "PAYMENT_FAILED"
	NotificationTypeShopFollowedBack   NotificationType = "SHOP_FOLLOWED_BACK"
	NotificationTypePromotionalOffer   NotificationType = "PROMOTIONAL_OFFER"
	NotificationTypePriceDrop          NotificationType = "PRICE_DROP"
	NotificationTypeBackInStock        NotificationType = "BACK_IN_STOCK"

	// System notifications
	NotificationTypeSystemMaintenance NotificationType = "SYSTEM_MAINTENANCE"
	NotificationTypeSecurityAlert     NotificationType = "SECURITY_ALERT"
	NotificationTypeAccountVerification NotificationType = "ACCOUNT_VERIFICATION"
	NotificationTypeFeatureUpdate     NotificationType = "FEATURE_UPDATE"
)

// NotificationPriority represents the priority level
type NotificationPriority string

const (
	NotificationPriorityLow    NotificationPriority = "LOW"
	NotificationPriorityMedium NotificationPriority = "MEDIUM"
	NotificationPriorityHigh   NotificationPriority = "HIGH"
	NotificationPriorityUrgent NotificationPriority = "URGENT"
)

// NotificationChannel represents the delivery channel
type NotificationChannel string

const (
	NotificationChannelInApp NotificationChannel = "IN_APP"
	NotificationChannelEmail  NotificationChannel = "EMAIL"
	NotificationChannelSMS    NotificationChannel = "SMS"
	NotificationChannelPush   NotificationChannel = "PUSH"
)

// Notification represents a notification entity
type Notification struct {
	ID          string                 `json:"id"`
	Title       string                 `json:"title"`
	Content     string                 `json:"content"`
	Type        NotificationType       `json:"type"`
	Priority    NotificationPriority   `json:"priority"`
	ShopID      *string                `json:"shop_id,omitempty"`
	UserID      *string                `json:"user_id,omitempty"`
	OrderID     *string                `json:"order_id,omitempty"`
	Channels    []NotificationChannel  `json:"channels"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	IsRead      bool                   `json:"is_read"`
	ReadAt      *string                `json:"read_at,omitempty"`
	SentAt      string                 `json:"sent_at"`
	CreatedAt   string                 `json:"created_at"`
	UpdatedAt   string                 `json:"updated_at"`
}

// MerchantPushSubscription represents a merchant's push subscription
type MerchantPushSubscription struct {
	ID           string                 `json:"id"`
	ShopID       string                 `json:"shop_id"`
	Endpoint     string                 `json:"endpoint"`
	Subscription map[string]interface{} `json:"subscription"`
	IsActive     bool                   `json:"is_active"`
	LastSeenAt   *string                `json:"last_seen_at,omitempty"`
	CreatedAt    string                 `json:"created_at"`
	UpdatedAt    string                 `json:"updated_at"`
}

// CustomerPushSubscription represents a customer's push subscription
type CustomerPushSubscription struct {
	ID           string                 `json:"id"`
	UserID       string                 `json:"user_id"`
	Endpoint     string                 `json:"endpoint"`
	Subscription map[string]interface{} `json:"subscription"`
	IsActive     bool                   `json:"is_active"`
	LastSeenAt   *string                `json:"last_seen_at,omitempty"`
	CreatedAt    string                 `json:"created_at"`
	UpdatedAt    string                 `json:"updated_at"`
}

// NotificationPreferences represents user notification preferences
type NotificationPreferences struct {
	UserID        string                             `json:"user_id"`
	EmailEnabled  bool                               `json:"email_enabled"`
	SMSEnabled    bool                               `json:"sms_enabled"`
	PushEnabled   bool                               `json:"push_enabled"`
	InAppEnabled  bool                               `json:"in_app_enabled"`
	TypeSettings  map[NotificationType]TypePreference `json:"type_settings"`
	CreatedAt     string                             `json:"created_at"`
	UpdatedAt     string                             `json:"updated_at"`
}

// TypePreference represents preferences for a specific notification type
type TypePreference struct {
	Enabled  bool                 `json:"enabled"`
	Channels []NotificationChannel `json:"channels"`
}

// NotificationData represents the data needed to create a notification
type NotificationData struct {
	Type        NotificationType       `json:"type"`
	Title       string                 `json:"title"`
	Content     string                 `json:"content"`
	ShopID      *string                `json:"shop_id,omitempty"`
	UserID      *string                `json:"user_id,omitempty"`
	OrderID     *string                `json:"order_id,omitempty"`
	Priority    NotificationPriority   `json:"priority,omitempty"`
	Channels    []NotificationChannel  `json:"channels,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}
