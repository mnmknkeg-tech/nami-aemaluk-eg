package workers

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/notification"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/jobs"
	"github.com/hibiken/asynq"
)

// NotificationPushHandler processes jobs.TypeNotificationPush tasks by
// looking up active subscriptions and fanning the payload out via web push /
// Expo push.
type NotificationPushHandler struct {
	repo    *notification.Repository
	webPush *notification.WebPushService
}

// NewNotificationPushHandler creates a handler for push notification jobs.
func NewNotificationPushHandler(repo *notification.Repository, webPush *notification.WebPushService) *NotificationPushHandler {
	return &NotificationPushHandler{repo: repo, webPush: webPush}
}

// ProcessTask implements asynq.Handler.
func (h *NotificationPushHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var p jobs.NotificationPushPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("%w: %v", asynq.SkipRetry, err)
	}

	if h.webPush == nil || !h.webPush.IsConfigured() {
		return nil
	}

	payload := &notification.PushPayload{
		Title: p.Title,
		Body:  p.Body,
		URL:   p.URL,
		Tag:   p.Tag,
	}

	if p.ShopID != nil {
		subs, err := h.repo.GetMerchantPushSubscriptions(ctx, *p.ShopID)
		if err != nil {
			return err
		}
		_ = h.webPush.SendToMerchantShop(subs, payload)
	}

	if p.UserID != nil {
		subs, err := h.repo.GetCustomerPushSubscriptions(ctx, *p.UserID)
		if err != nil {
			return err
		}
		_ = h.webPush.SendToCustomerUser(subs, payload)
	}

	return nil
}
