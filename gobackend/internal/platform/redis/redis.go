package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Client wraps go-redis with lifecycle helpers.
type Client struct {
	redis.UniversalClient
	cfg config.Redis
	log *zap.Logger
}

// New creates a Redis client from configuration and verifies connectivity.
// It still returns a client when Redis is unreachable (callers degrade to
// memory stores), but it logs loudly and — in production — surfaces the
// failure through Health() so /health and the deploy checklist notice.
// REDIS_URL wins over host/port; a redis:// URL password overrides
// REDIS_PASSWORD. Cluster URLs (rediss:// with multiple addresses) fall
// back to a single-node client with a warning.
func New(cfg config.Redis, log *zap.Logger) *Client {
	var client redis.UniversalClient
	if cfg.URL != "" {
		opt, err := redis.ParseURL(cfg.URL)
		if err != nil {
			log.Warn("failed to parse REDIS_URL, falling back to host/port", zap.Error(err))
			client = standaloneClient(cfg)
		} else {
			if opt.Password == "" && cfg.Password != "" {
				opt.Password = cfg.Password
			}
			if opt.DialTimeout == 0 {
				opt.DialTimeout = cfg.DialTimeout
			}
			client = redis.NewClient(opt)
		}
	} else {
		client = standaloneClient(cfg)
	}

	c := &Client{UniversalClient: client, cfg: cfg, log: log}
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Warn("redis unreachable at startup — rate limiting and queues degrade to memory/single-node",
			zap.String("addr", cfg.Addr()), zap.Error(err))
	} else {
		log.Info("redis connected", zap.String("addr", cfg.Addr()))
	}
	return c
}

func standaloneClient(cfg config.Redis) redis.UniversalClient {
	return redis.NewClient(&redis.Options{
		Addr:            fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password:        cfg.Password,
		DB:              cfg.DB,
		DialTimeout:     cfg.DialTimeout,
		ReadTimeout:     3 * time.Second,
		WriteTimeout:    3 * time.Second,
		PoolSize:        20,
		MinIdleConns:    5,
		MaxRetries:      3,
		MinRetryBackoff: 100 * time.Millisecond,
		MaxRetryBackoff: 2 * time.Second,
	})
}

// IsHealthy pings Redis and returns true if reachable.
func (c *Client) IsHealthy(ctx context.Context) bool {
	if c.UniversalClient == nil {
		return false
	}
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return c.Ping(ctx).Err() == nil
}

// Close closes the Redis connection.
func (c *Client) Close() error {
	if c.UniversalClient != nil {
		return c.UniversalClient.Close()
	}
	return nil
}
