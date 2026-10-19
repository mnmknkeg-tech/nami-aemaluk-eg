package jobs

import (
	"context"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/hibiken/asynq"
)

// Client enqueues background jobs onto Redis-backed queues. It is safe for
// concurrent use and degrades gracefully (returns an error, never panics)
// when Redis is unavailable.
type Client struct {
	client *asynq.Client
}

// NewClient creates a jobs client from Redis configuration.
func NewClient(cfg config.Redis) *Client {
	return &Client{client: asynq.NewClient(RedisConnOpt(cfg))}
}

// RedisConnOpt builds an asynq redis connection option from the app's Redis
// configuration, supporting either REDIS_URL or discrete host/port/password/db.
func RedisConnOpt(cfg config.Redis) asynq.RedisConnOpt {
	if cfg.URL != "" {
		if opt, err := asynq.ParseRedisURI(cfg.URL); err == nil {
			return opt
		}
	}
	return asynq.RedisClientOpt{
		Addr:     fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
	}
}

// Close closes the underlying asynq client connection.
func (c *Client) Close() error {
	if c == nil || c.client == nil {
		return nil
	}
	return c.client.Close()
}

// EnqueueEmail schedules an email to be sent asynchronously by the worker.
func (c *Client) EnqueueEmail(ctx context.Context, p EmailPayload) error {
	if c == nil || c.client == nil {
		return fmt.Errorf("jobs client not configured")
	}
	task, err := NewEmailSendTask(p)
	if err != nil {
		return err
	}
	_, err = c.client.EnqueueContext(ctx, task, asynq.Queue(QueueDefault), asynq.MaxRetry(5))
	return err
}

// EnqueueNotificationPush schedules a push-notification fan-out job.
func (c *Client) EnqueueNotificationPush(ctx context.Context, p NotificationPushPayload) error {
	if c == nil || c.client == nil {
		return fmt.Errorf("jobs client not configured")
	}
	task, err := NewNotificationPushTask(p)
	if err != nil {
		return err
	}
	_, err = c.client.EnqueueContext(ctx, task, asynq.Queue(QueueCritical), asynq.MaxRetry(3))
	return err
}

// EnqueueImageOptimize schedules a post-upload image optimization job.
func (c *Client) EnqueueImageOptimize(ctx context.Context, p ImageOptimizePayload) error {
	if c == nil || c.client == nil {
		return fmt.Errorf("jobs client not configured")
	}
	task, err := NewImageOptimizeTask(p)
	if err != nil {
		return err
	}
	_, err = c.client.EnqueueContext(ctx, task, asynq.Queue(QueueLow), asynq.MaxRetry(3))
	return err
}
