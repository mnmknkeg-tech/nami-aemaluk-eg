package middleware

import (
	"testing"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/redis/go-redis/v9"
)

func TestValidateRateLimitStoreRequiresSharedRedisInProduction(t *testing.T) {
	cfg := &config.Config{}
	cfg.App.Env = "production"

	if err := validateRateLimitStore(cfg, nil); err == nil {
		t.Fatal("expected production to reject a nil Redis client")
	}

	cluster := redis.NewClusterClient(&redis.ClusterOptions{Addrs: []string{"127.0.0.1:7000"}})
	defer cluster.Close()
	if err := validateRateLimitStore(cfg, cluster); err == nil {
		t.Fatal("expected production to reject the unsupported cluster client")
	}

	standalone := redis.NewClient(&redis.Options{Addr: "127.0.0.1:6379"})
	defer standalone.Close()
	if err := validateRateLimitStore(cfg, standalone); err != nil {
		t.Fatalf("expected standalone Redis client to be accepted: %v", err)
	}
}

func TestValidateRateLimitStoreAllowsMemoryFallbackOutsideProduction(t *testing.T) {
	cfg := &config.Config{}
	cfg.App.Env = "development"

	if err := validateRateLimitStore(cfg, nil); err != nil {
		t.Fatalf("development should allow the in-memory limiter: %v", err)
	}
}
