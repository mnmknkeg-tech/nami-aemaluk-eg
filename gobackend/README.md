# Ray Go Backend

The ONLY backend for the Ray marketplace: Go 1.25 + Fiber in `gobackend/`.
(The old NestJS backend was deleted on 2026-08-24; its remains live under `_archive/` only.)

## What is implemented

- Modular monolith layout (`cmd/`, `internal/domains/`, `internal/platform/`).
- Configuration loading with validation (`internal/config`, godotenv: `.env` / `.env.example` / `.env.production.example`).
- Structured logging with zap (`internal/platform/logger`).
- PostgreSQL connection via `pgx` with optional migrations on boot (`internal/platform/db`, `migrations/` via golang-migrate, `DB_MIGRATE_ON_BOOT`).
- Redis client with graceful degradation (`internal/platform/redis`; set `REDIS_URL` or `REDIS_HOST`).
- Prometheus metrics (`internal/platform/telemetry`, `GET /metrics`).
- Middleware stack:
  - Request ID, structured logger, compression, security headers, CORS.
  - Admin IP allowlist, CSRF (`CSRF_DISABLED=false` in production), idempotency, global + auth rate limiting.
  - JWT authentication (required / optional), panic recovery, domain error handler (errors shaped as `{success:false, error, message}`).
- Monitoring endpoints: `GET /monitoring/live`, `GET /monitoring/ready`, `GET /metrics`, plus `GET /api/v1/status`.
- Dev-login (`dev-*-login`) works only when `APP_ENV=development` with the matching `ALLOW_DEV_*_BOOTSTRAP=true` — forbidden in production.
- Worker binary using `asynq` (`cmd/worker`, image: `Dockerfile.worker`).
- Docker multi-stage builds (`Dockerfile` for API, `Dockerfile.worker` for worker) and local docker compose.
- CI job in `.github/workflows/ci.yml`.

## Quick start

1. Copy the example environment file (inside `gobackend/`):

   ```bash
   cd gobackend
   cp .env.example .env
   ```

2. Start dependencies with Docker (inside `gobackend/`):

   ```bash
   docker compose up -d postgres redis
   ```

3. Download dependencies and run the API:

   ```bash
   go mod download
   go run ./cmd/api
   ```
   The API listens on port `4000`.

4. Verify readiness and status:

   ```bash
   curl http://localhost:4000/monitoring/ready
   curl http://localhost:4000/api/v1/status
   ```

## Production env (mandatory)

See `.env.example` and `.env.production.example`. In production you MUST set:

- `JWT_SECRET` — 32+ chars and NOT the default value
- `ADMIN_BOOTSTRAP_TOKEN` — NOT the default value
- `CSRF_DISABLED=false`
- `CORS_ORIGIN` — no `*`
- `REDIS_URL` or `REDIS_HOST`

## Build

```bash
make build        # builds both api and worker binaries
make test         # runs go test ./...
make race         # runs tests with race detector
make vet          # runs go vet
```

Or directly:

```bash
go build ./...
go build -o api ./cmd/api
go build -o worker ./cmd/worker
```

## Docker

```bash
# Dependencies only (DB + Redis), then run Go locally:
docker compose up -d postgres redis
go run ./cmd/api

# Full multi-stage images:
docker build -f Dockerfile -t ray-api:latest .
docker build -f Dockerfile.worker -t ray-worker:latest .
```

## Database migrations

SQL migrations live under `migrations/` (golang-migrate) and run on boot when `DB_MIGRATE_ON_BOOT=true`:

```bash
make migrate-up
```

```bash
go run scripts/migrate.go up
```

## Project structure

```
gobackend/
├── cmd/
│   ├── api/           # HTTP server entrypoint (Fiber, port 4000)
│   └── worker/        # Background worker entrypoint (asynq)
├── internal/
│   ├── app/           # Fiber wiring, middleware order, routes
│   ├── config/        # Environment configuration & validation
│   ├── domains/       # Business domains (auth, shops, orders, ...)
│   ├── platform/      # Cross-cutting concerns (db, redis, logger, middleware, telemetry, errors, validate)
│   └── generated/     # sqlc generated code (created later)
├── migrations/        # golang-migrate SQL migrations
├── sqlc/              # Hand-written SQL queries + schema
├── tests/             # Integration, load, security tests
├── Dockerfile         # API multi-stage image
├── Dockerfile.worker  # Worker multi-stage image
├── docker-compose.yml
└── Makefile
```

## Frontend wiring

Three Next.js apps talk to this backend on `http://localhost:4000` locally:

- `apps/marketplace-next` (`npm run dev:marketplace`)
- `apps/dashboard-web` (`npm run dev:dashboard-web`, dev-login at `/admin/gate`)
- `apps/business` (`npm run dev:business`)

Root shortcuts: `npm run dev:all`, `npm run go:backend:dev`.

## Common issues

- `listen tcp4 0.0.0.0:4000: bind: address already in use` → the backend is already running (`netstat -ano | findstr :4000` on Windows).
- `insufficient_role` on `/shops/me` → user is not `MERCHANT`/`ADMIN` or the token in `localStorage` (`ray_token`) is stale; clear `ray_token`/`token`/`ray_user` and re-do the dev-login from `/admin/gate`.
- `s3 client not available` → warning only; media works locally.
- DB connection failure → ensure the postgres container on `5433` is running and `DATABASE_URL` is correct.
- `Cannot POST /api/v1/auth/logout` → historic frontend call to a non-existent route; clear the token locally.

## Next steps

See `README-DEPLOY.md` for the Supabase/Upstash/Render deploy path, and `docs/07-deployment-operations.md` for full production operations.
