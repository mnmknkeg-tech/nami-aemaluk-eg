// Package jobs defines background job task types/payloads and a producer
// client used by the API process to enqueue work onto Redis-backed queues.
// The actual task handlers run in the separate worker binary (cmd/worker),
// see internal/workers.
package jobs

import (
	"encoding/json"

	"github.com/hibiken/asynq"
)

// Task type names. These must match exactly between the producer (this
// package) and the consumer (internal/workers handlers).
const (
	TypeEmailSend        = "email:send"
	TypeNotificationPush = "notification:push"
	TypeImageOptimize    = "media:image_optimize"
)

// Queue names, must match the worker's asynq.Config.Queues.
const (
	QueueCritical = "critical"
	QueueDefault  = "default"
	QueueLow      = "low"
)

// EmailPayload is the payload for TypeEmailSend tasks.
type EmailPayload struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Text    string `json:"text"`
	HTML    string `json:"html,omitempty"`
}

// NotificationPushPayload is the payload for TypeNotificationPush tasks.
// The worker looks up subscriptions itself (by ShopID/UserID) rather than
// receiving them inline, to keep the queued payload small.
type NotificationPushPayload struct {
	ShopID *string `json:"shop_id,omitempty"`
	UserID *string `json:"user_id,omitempty"`
	Title  string  `json:"title"`
	Body   string  `json:"body"`
	URL    string  `json:"url,omitempty"`
	Tag    string  `json:"tag,omitempty"`
}

// ImageOptimizePayload is the payload for TypeImageOptimize tasks.
type ImageOptimizePayload struct {
	MediaID string `json:"media_id"`
	Key     string `json:"key"`
	ShopID  string `json:"shop_id,omitempty"`
}

// NewEmailSendTask builds an asynq task for sending an email.
func NewEmailSendTask(p EmailPayload) (*asynq.Task, error) {
	b, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeEmailSend, b), nil
}

// NewNotificationPushTask builds an asynq task for fanning out a push notification.
func NewNotificationPushTask(p NotificationPushPayload) (*asynq.Task, error) {
	b, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeNotificationPush, b), nil
}

// NewImageOptimizeTask builds an asynq task for post-upload image optimization.
func NewImageOptimizeTask(p ImageOptimizePayload) (*asynq.Task, error) {
	b, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeImageOptimize, b), nil
}
