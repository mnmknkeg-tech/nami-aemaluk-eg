package middleware

import (
	"testing"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
)

func testConfig(t *testing.T) *config.Config {
	t.Helper()
	return &config.Config{
		App: config.AppConfig{Env: "development"},
		Auth: config.AuthConfig{
			JWTSecret: "dev-secret-32-chars-long-minimum",
		},
		Security: config.Security{
			CSRFDisabled: true,
		},
	}
}
