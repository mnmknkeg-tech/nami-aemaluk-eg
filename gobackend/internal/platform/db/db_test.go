package db

import (
	"net/url"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
)

// parseQuery is a helper that returns the query params of a normalized DSN.
func parseQuery(t *testing.T, raw string) url.Values {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("normalized URL is not parseable: %v", err)
	}
	return u.Query()
}

func TestNormalizeURL(t *testing.T) {
	t.Run("strips prisma-only params", func(t *testing.T) {
		got, err := normalizeURL("postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?schema=public")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if strings.Contains(got, "schema=") {
			t.Fatalf("expected schema param to be stripped, got %s", got)
		}
	})

	t.Run("strips connection_limit and pool_timeout", func(t *testing.T) {
		got, err := normalizeURL("postgresql://u:p@db.example.com:5432/postgres?connection_limit=5&pool_timeout=20")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		q := parseQuery(t, got)
		for _, key := range []string{"connection_limit", "pool_timeout"} {
			if q.Has(key) {
				t.Fatalf("expected %s to be stripped, got %s", key, got)
			}
		}
	})

	t.Run("adds sslmode=require for remote hosts", func(t *testing.T) {
		got, err := normalizeURL("postgresql://postgres:secret@db.abcdefgh.supabase.co:5432/postgres")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if mode := parseQuery(t, got).Get("sslmode"); mode != "require" {
			t.Fatalf("expected sslmode=require, got %q", mode)
		}
	})

	t.Run("keeps explicit sslmode=disable for local development", func(t *testing.T) {
		got, err := normalizeURL("postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if mode := parseQuery(t, got).Get("sslmode"); mode != "disable" {
			t.Fatalf("expected sslmode=disable to be preserved, got %q", mode)
		}
	})

	t.Run("does not force TLS for docker compose service names", func(t *testing.T) {
		got, err := normalizeURL("postgresql://postgres:postgres@postgres:5432/ray")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if parseQuery(t, got).Has("sslmode") {
			t.Fatalf("expected no sslmode for the compose service host, got %s", got)
		}
	})

	t.Run("disables prepared statements for supabase transaction pooler", func(t *testing.T) {
		got, err := normalizeURL("postgresql://postgres.abcdefgh:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		q := parseQuery(t, got)
		if mode := q.Get("default_query_exec_mode"); mode != "simple_protocol" {
			t.Fatalf("expected default_query_exec_mode=simple_protocol, got %q", mode)
		}
		if capacity := q.Get("statement_cache_capacity"); capacity != "0" {
			t.Fatalf("expected statement_cache_capacity=0, got %q", capacity)
		}
	})

	t.Run("translates prisma pgbouncer flag", func(t *testing.T) {
		got, err := normalizeURL("postgresql://u:p@db.example.com:5432/postgres?pgbouncer=true")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		q := parseQuery(t, got)
		if q.Has("pgbouncer") {
			t.Fatalf("expected pgbouncer param to be consumed, got %s", got)
		}
		if mode := q.Get("default_query_exec_mode"); mode != "simple_protocol" {
			t.Fatalf("expected simple_protocol for pgbouncer=true, got %q", mode)
		}
	})

	t.Run("keeps prepared statements for direct supabase session connection", func(t *testing.T) {
		got, err := normalizeURL("postgresql://postgres:secret@db.abcdefgh.supabase.co:5432/postgres")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if q := parseQuery(t, got); q.Has("default_query_exec_mode") {
			t.Fatalf("expected prepared statements to stay enabled on port 5432, got %s", got)
		}
	})
}

func TestIsLocalHost(t *testing.T) {
	local := []string{"", "localhost", "127.0.0.1", "postgres", "db", "host.docker.internal", "api.railway.internal", "postgres.ray.svc"}
	for _, host := range local {
		if !isLocalHost(host) {
			t.Errorf("expected %q to be treated as local", host)
		}
	}

	remote := []string{"db.abcdefgh.supabase.co", "aws-0-eu-central-1.pooler.supabase.com", "8.8.8.8"}
	for _, host := range remote {
		if isLocalHost(host) {
			t.Errorf("expected %q to be treated as remote", host)
		}
	}
}

func TestParseQueryExecMode(t *testing.T) {
	cases := map[string]pgx.QueryExecMode{
		"simple":          pgx.QueryExecModeSimpleProtocol,
		"simple_protocol": pgx.QueryExecModeSimpleProtocol,
		"exec":            pgx.QueryExecModeExec,
		"describe":        pgx.QueryExecModeDescribeExec,
		"cache":           pgx.QueryExecModeCacheStatement,
		"cache_statement": pgx.QueryExecModeCacheStatement,
		"cache_describe":  pgx.QueryExecModeCacheDescribe,
	}
	for raw, want := range cases {
		got, ok := parseQueryExecMode(raw)
		if !ok {
			t.Errorf("expected %q to be accepted", raw)
			continue
		}
		if got != want {
			t.Errorf("parseQueryExecMode(%q) = %v, want %v", raw, got, want)
		}
	}

	if _, ok := parseQueryExecMode("nonsense"); ok {
		t.Error("expected an unknown mode to be rejected")
	}
}

func TestSQLModeRegressionGuards(t *testing.T) {
	// Regression guard: the two DSNs that broke real deployments must normalize
	// into the shape pgx/Supabase expect.
	localDSN, err := normalizeURL("postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if strings.Contains(localDSN, "require") {
		t.Fatalf("local DSN must not be forced to TLS: %s", localDSN)
	}

	supabaseDSN, err := normalizeURL("postgresql://postgres:pw@db.abcdefgh.supabase.co:5432/postgres?schema=public")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(supabaseDSN, "sslmode=require") {
		t.Fatalf("supabase DSN must require TLS: %s", supabaseDSN)
	}
	if strings.Contains(supabaseDSN, "schema=") {
		t.Fatalf("supabase DSN must not carry the prisma schema param: %s", supabaseDSN)
	}
}