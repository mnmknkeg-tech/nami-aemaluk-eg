package config

import (
	"os"
	"testing"
)

func TestLoadProductionRequiresLongJWT(t *testing.T) {
	_ = os.Setenv("APP_ENV", "production")
	_ = os.Setenv("JWT_SECRET", "short")
	_ = os.Setenv("DATABASE_URL", "postgres://localhost/test")
	_ = os.Setenv("FRONTEND_APP_URL", "http://localhost:5174")
	defer os.Clearenv()

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error for short JWT_SECRET in production")
	}
}

func TestLoadDevelopmentDefaults(t *testing.T) {
	_ = os.Setenv("DATABASE_URL", "postgres://localhost/test")
	_ = os.Setenv("FRONTEND_APP_URL", "http://localhost:5174")
	_ = os.Setenv("JWT_SECRET", "dev-secret-32-chars-long-minimum")
	defer os.Clearenv()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.App.Port != 4001 {
		t.Fatalf("expected default port 4001, got %d", cfg.App.Port)
	}
	if cfg.Redis.Host != "localhost" {
		t.Fatalf("expected default redis host localhost, got %s", cfg.Redis.Host)
	}
}

func TestLoadRejectsInvalidFrontendURL(t *testing.T) {
	_ = os.Setenv("DATABASE_URL", "postgres://localhost/test")
	_ = os.Setenv("FRONTEND_APP_URL", "localhost:5174")
	_ = os.Setenv("JWT_SECRET", "dev-secret-32-chars-long-minimum")
	defer os.Clearenv()

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error for invalid FRONTEND_APP_URL")
	}
}

func TestLoadRejectsInvalidCORSOrigin(t *testing.T) {
	_ = os.Setenv("DATABASE_URL", "postgres://localhost/test")
	_ = os.Setenv("FRONTEND_APP_URL", "http://localhost:5174")
	_ = os.Setenv("JWT_SECRET", "dev-secret-32-chars-long-minimum")
	_ = os.Setenv("CORS_ORIGIN", "http://localhost:5174,not-a-url")
	defer os.Clearenv()

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error for invalid CORS_ORIGIN")
	}
}

func setMinimalValidEnv(t *testing.T) {
	t.Helper()
	_ = os.Setenv("DATABASE_URL", "postgres://localhost/test")
	_ = os.Setenv("FRONTEND_APP_URL", "http://localhost:5174")
	_ = os.Setenv("JWT_SECRET", "dev-secret-32-chars-long-minimum")
}

func TestLoadRejectsInvalidPort(t *testing.T) {
	setMinimalValidEnv(t)
	_ = os.Setenv("PORT", "70000")
	defer os.Clearenv()

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error for invalid PORT")
	}
}

func TestLoadRejectsInvalidDatabasePool(t *testing.T) {
	setMinimalValidEnv(t)
	_ = os.Setenv("DB_MAX_OPEN_CONNS", "5")
	_ = os.Setenv("DB_MAX_IDLE_CONNS", "10")
	defer os.Clearenv()

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error when idle DB connections exceed open connections")
	}
}

func TestLoadRejectsInvalidRateLimit(t *testing.T) {
	setMinimalValidEnv(t)
	_ = os.Setenv("AUTH_RATE_LIMIT_MAX", "0")
	defer os.Clearenv()

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error for invalid AUTH_RATE_LIMIT_MAX")
	}
}

func TestLoadRejectsInvalidCompressionDimensions(t *testing.T) {
	setMinimalValidEnv(t)
	_ = os.Setenv("COMPRESSION_MAX_WIDTH", "0")
	defer os.Clearenv()

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error for invalid compression width")
	}
}

func TestLoadRejectsInvalidQueryExecMode(t *testing.T) {
	setMinimalValidEnv(t)
	_ = os.Setenv("DB_QUERY_EXEC_MODE", "definitely-not-a-mode")
	defer os.Clearenv()

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error for invalid DB_QUERY_EXEC_MODE")
	}
}

func TestLoadAcceptsSupabaseQueryExecModes(t *testing.T) {
	// Every value db.parseQueryExecMode understands must survive config
	// validation, otherwise the documented Supabase pooler workaround
	// (DB_QUERY_EXEC_MODE=simple) would be rejected at boot.
	for _, mode := range []string{"auto", "simple", "simple_protocol", "exec", "describe", "cache_statement", "cache_describe"} {
		t.Run(mode, func(t *testing.T) {
			setMinimalValidEnv(t)
			_ = os.Setenv("DB_QUERY_EXEC_MODE", mode)
			defer os.Clearenv()

			if _, err := Load(); err != nil {
				t.Fatalf("expected %q to be accepted, got %v", mode, err)
			}
		})
	}
}
