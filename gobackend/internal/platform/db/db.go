package db

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

// Pool wraps pgxpool.Pool with lifecycle helpers.
type Pool struct {
	*pgxpool.Pool
	cfg config.DBConfig
	// dsn is the normalized connection string actually handed to pgx. It is
	// kept so migrations reuse exactly the same (sanitized) URL as the pool.
	dsn string
}

// coreTables are the tables the API cannot work without. They are used by
// VerifySchema to detect an unmigrated database early — a fresh Supabase
// project with DB_MIGRATE_ON_BOOT=false has an empty public schema and every
// single request then fails with an opaque "internal app error".
var coreTables = []string{"schema_migrations", "users", "shops", "products"}

// New creates a new pgx connection pool and optionally runs migrations.
func New(ctx context.Context, cfg config.DBConfig, log *zap.Logger) (*Pool, error) {
	if err := validateURL(cfg.URL); err != nil {
		return nil, fmt.Errorf("invalid DATABASE_URL: %w", err)
	}

	// The DATABASE_URL may carry ORM-only query parameters (e.g. `schema`) that
	// the pgx driver forwards to the server, which rejects them with
	// "unrecognized configuration parameter". Normalize it so the pool can
	// connect; otherwise the whole backend starts with a nil pool and every
	// /api/v1 route fails.
	cleanURL, err := normalizeURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("normalize DATABASE_URL: %w", err)
	}

	pgxCfg, err := pgxpool.ParseConfig(cleanURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	// DB_QUERY_EXEC_MODE lets an operator override whatever normalizeURL
	// inferred from the URL; "auto" (the default) keeps the inference.
	if mode := strings.TrimSpace(cfg.QueryExecMode); mode != "" && !strings.EqualFold(mode, "auto") {
		execMode, ok := parseQueryExecMode(mode)
		if !ok {
			return nil, fmt.Errorf("DB_QUERY_EXEC_MODE: unsupported value %q (want auto, simple, cache_statement, cache_describe, describe or exec)", mode)
		}
		pgxCfg.ConnConfig.DefaultQueryExecMode = execMode
		if execMode == pgx.QueryExecModeSimpleProtocol {
			// Simple protocol never prepares statements server-side.
			pgxCfg.ConnConfig.StatementCacheCapacity = 0
		}
	}

	// pgxpool panics when MinConns > MaxConns, so clamp defensively: Supabase's
	// pooler tiers often cap the pool far below the default 25/5 pair.
	maxConns := cfg.MaxOpenConns
	if maxConns < 1 {
		maxConns = 1
	}
	minConns := cfg.MaxIdleConns
	if minConns < 0 {
		minConns = 0
	}
	if minConns > maxConns {
		minConns = maxConns
	}
	pgxCfg.MaxConns = int32(maxConns)
	pgxCfg.MinConns = int32(minConns)
	pgxCfg.MaxConnLifetime = cfg.ConnMaxLifetime
	pgxCfg.MaxConnIdleTime = cfg.ConnMaxIdleTime
	pgxCfg.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, pgxCfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	// Verify connectivity with a short timeout.
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	p := &Pool{Pool: pool, cfg: cfg, dsn: cleanURL}

	if cfg.MigrateOnBoot {
		if err := p.MigrateUp(); err != nil {
			log.Error("migration failed", zap.Error(err))
			return nil, err
		}
	}

	log.Info("database connected",
		zap.String("host", pgxCfg.ConnConfig.Host),
		zap.Uint16("port", pgxCfg.ConnConfig.Port),
		zap.String("database", pgxCfg.ConnConfig.Database),
		zap.String("ssl_mode", sslModeForLog(cleanURL)),
		zap.String("query_exec_mode", pgxCfg.ConnConfig.DefaultQueryExecMode.String()),
		zap.Int32("max_conns", pgxCfg.MaxConns),
		zap.Int32("min_conns", pgxCfg.MinConns),
	)

	if err := p.VerifySchema(ctx); err != nil {
		log.Error("database schema is not ready — the API will fail with internal errors until migrations run",
			zap.Error(err),
			zap.String("fix", "set DB_MIGRATE_ON_BOOT=true (or run: go run scripts/migrate.go up)"),
		)
		return p, err
	}

	return p, nil
}

// VerifySchema fails when the public schema is missing the tables the API needs.
// Callers treat the returned error as fatal in production: an unmigrated
// database turns every request into an opaque "internal app error", which is
// far harder to diagnose than a loud startup failure.
func (p *Pool) VerifySchema(ctx context.Context) error {
	if p.Pool == nil {
		return errors.New("database pool is not initialized")
	}

	checkCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	rows, err := p.Query(checkCtx,
		`SELECT table_name FROM information_schema.tables
		 WHERE table_schema = 'public' AND table_name = ANY($1)`,
		coreTables,
	)
	if err != nil {
		return fmt.Errorf("inspect public schema: %w", err)
	}
	defer rows.Close()

	found := make(map[string]struct{}, len(coreTables))
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return fmt.Errorf("scan table name: %w", err)
		}
		found[name] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("read table list: %w", err)
	}

	var missing []string
	for _, table := range coreTables {
		if _, ok := found[table]; !ok {
			missing = append(missing, table)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing tables in public schema: %s", strings.Join(missing, ", "))
	}

	return nil
}

// Close releases the pool.
func (p *Pool) Close() {
	if p.Pool != nil {
		p.Pool.Close()
	}
}

// MigrateUp applies pending migrations from the configured migrations path.
func (p *Pool) MigrateUp() error {
	m, err := migrate.New(
		"file://"+p.cfg.MigrationsPath,
		toMigrateURL(p.dsn),
	)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate up: %w", err)
	}
	return nil
}

// toMigrateURL rewrites postgres/postgresql schemes to the pgx5 driver scheme
// expected by golang-migrate.
func toMigrateURL(raw string) string {
	if strings.HasPrefix(raw, "postgresql://") {
		return "pgx5" + strings.TrimPrefix(raw, "postgresql")
	}
	if strings.HasPrefix(raw, "postgres://") {
		return "pgx5" + strings.TrimPrefix(raw, "postgres")
	}
	return raw
}

func validateURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	if u.Scheme != "postgres" && u.Scheme != "postgresql" {
		return fmt.Errorf("expected postgres:// or postgresql:// scheme")
	}
	if u.Host == "" {
		return fmt.Errorf("missing host")
	}
	return nil
}

// prismaOnlyParams are query parameters understood only by Prisma/other ORMs.
// pgx forwards unrecognized parameters to the server as startup parameters and
// PostgreSQL then rejects the whole connection with
// `FATAL: unrecognized configuration parameter`.
var prismaOnlyParams = []string{"schema", "connection_limit", "pool_timeout", "socket_timeout"}

// normalizeURL makes a DATABASE_URL safe for pgx and for Supabase. It:
//
//  1. drops ORM-only query parameters (e.g. `schema=public`);
//  2. forces TLS (`sslmode=require`) for remote hosts, which Supabase always
//     requires, while leaving local/IPv4-only hosts such as Docker Compose or
//     Railway's private network untouched;
//  3. disables prepared statements when the URL targets a transaction-mode
//     connection pooler (Supabase Supavisor on port 6543, or Prisma's
//     `pgbouncer=true`). A transaction pooler hands the backend a different
//     server connection per transaction, so cached prepared statements become
//     invalid and fail with errors like `prepared statement "stmtcache_x"
//     does not exist`.
func normalizeURL(raw string) (string, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return "", err
	}

	q := u.Query()

	for _, key := range prismaOnlyParams {
		q.Del(key)
	}

	// Prisma's `pgbouncer=true` is the portable way of saying "no prepared
	// statements"; translate it into the pgx setting below.
	useSimpleProtocol := q.Has("pgbouncer") || u.Port() == "6543"
	q.Del("pgbouncer")

	host := strings.ToLower(u.Hostname())
	if !isLocalHost(host) && !q.Has("sslmode") {
		q.Set("sslmode", "require")
	}

	if useSimpleProtocol {
		q.Set("default_query_exec_mode", "simple_protocol")
		q.Set("statement_cache_capacity", "0")
	}

	// Always emit a query string so callers can assume the URL is canonical.
	u.RawQuery = q.Encode()

	return u.String(), nil
}

// isLocalHost reports whether the host must be reached without TLS. It covers
// loopback addresses, Docker Compose service names and private platform
// networks (Railway's `*.internal`, Fly's `.internal`, Kubernetes `.svc`).
func isLocalHost(host string) bool {
	switch host {
	case "", "localhost", "127.0.0.1", "::1", "0.0.0.0", "postgres", "db", "database", "host.docker.internal":
		return true
	}
	for _, suffix := range []string{".local", ".internal", ".svc", ".svc.cluster.local"} {
		if strings.HasSuffix(host, suffix) {
			return true
		}
	}
	return false
}

// sslModeForLog extracts the effective SSL mode for logging, without ever
// leaking credentials.
func sslModeForLog(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return "unknown"
	}
	if mode := u.Query().Get("sslmode"); mode != "" {
		return mode
	}
	return "prefer"
}

// parseQueryExecMode maps a human-readable DB_QUERY_EXEC_MODE value onto the pgx
// enum. The second return value is false for unrecognized values.
func parseQueryExecMode(mode string) (pgx.QueryExecMode, bool) {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "simple", "simple_protocol":
		return pgx.QueryExecModeSimpleProtocol, true
	case "exec":
		return pgx.QueryExecModeExec, true
	case "describe", "describe_exec":
		return pgx.QueryExecModeDescribeExec, true
	case "cache_statement", "cache_statement_exec", "cache":
		return pgx.QueryExecModeCacheStatement, true
	case "cache_describe", "cache_describe_exec":
		return pgx.QueryExecModeCacheDescribe, true
	default:
		return pgx.QueryExecModeCacheStatement, false
	}
}
