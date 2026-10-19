# Ray Marketplace - Deployment Guide

> Single backend: Go 1.25 + Fiber in `gobackend/` (port `4000`). The old NestJS backend was deleted on 2026-08-24 (remains in `_archive/` only).

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## 🚀 Prerequisites

### Required Software
- **Go** 1.25+
- **Node.js** 18+ LTS (for the three Next.js apps only)
- **Docker** & **Docker Compose**
- **PostgreSQL** client tools (optional, if using Postgres)
- **Redis** client tools (optional)
- **Git**

### System Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 20GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 50GB storage
- **Network**: Stable internet connection

## 🔧 Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/Sayedtaha55/test.git
cd test
```

### 2. Install Dependencies
```bash
npm install          # root + Next.js apps (marketplace-next, dashboard-web, business)
cd gobackend && go mod download   # Go backend
```

### 3. Environment Variables
Go backend env lives in `gobackend/`. Copy the example and configure:

```bash
cd gobackend
cp .env.example .env
# production: cp .env.production.example .env.production
```

Required variables:
```env
# App
APP_ENV="development"
PORT="4000"

# Database
DATABASE_URL="postgresql://ray_user:ray_password@localhost:5433/ray_marketplace"

# Redis (one of these is mandatory in production)
REDIS_URL="redis://localhost:6379"
# or REDIS_HOST="localhost"

# Security (mandatory in production)
JWT_SECRET="non-default-value-32-chars-minimum-xxxxxxxx"
ADMIN_BOOTSTRAP_TOKEN="non-default-bootstrap-token"
CSRF_DISABLED=false
CORS_ORIGIN="http://localhost:5174,http://localhost:3000"

# AI Services
GEMINI_API_KEY="your_gemini_api_key"

# Monitoring
LOG_LEVEL="info"
```

Mandatory production rules:
- `JWT_SECRET`: 32+ chars and NOT the default value.
- `ADMIN_BOOTSTRAP_TOKEN`: NOT the default value.
- `CSRF_DISABLED=false`.
- `CORS_ORIGIN`: no `*`.
- `REDIS_URL` or `REDIS_HOST` must be set.
- Dev-login (`dev-*-login`) works only when `APP_ENV=development` with `ALLOW_DEV_*_BOOTSTRAP=true` — forbidden in production.

## 🗄️ Database Setup

PostgreSQL via the `gobackend/` docker compose + golang-migrate SQL under `gobackend/migrations/`.

```bash
cd gobackend
docker compose up -d postgres redis
go run ./cmd/api   # migrations run on boot (controlled by DB_MIGRATE_ON_BOOT)
```

```bash
# Run migrations explicitly
go run scripts/migrate.go up
```

## 🧭 Frontend Routing (Admin not opening / 404 on refresh)
The frontends are three Next.js apps (`apps/marketplace-next`, `apps/dashboard-web`, `apps/business`) with App Router — no hash-router workaround needed. If a route 404s on refresh, check the hosting's Next.js App Router support and the `next.config.mjs` rewrites (`/api/:path*` → backend `BACKEND_URL`/`NEXT_PUBLIC_BACKEND_URL`).

## 📦 Redis Setup

### Option 1: Docker Redis via gobackend compose (Recommended)
```bash
cd gobackend
docker compose up -d redis
```

### Option 2: Local Redis
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping
```

## 🐳 Docker Deployment

Multi-stage images: `gobackend/Dockerfile` (API) and `gobackend/Dockerfile.worker` (worker).

### 1. Local dependencies only
```bash
cd gobackend
docker compose up -d postgres redis
go run ./cmd/api
```

### 2. Full production images
```bash
cd gobackend
docker build -f Dockerfile -t ray-api:latest .
docker build -f Dockerfile.worker -t ray-worker:latest .
```

### 3. Production with external Postgres/Redis
```bash
cd gobackend
docker-compose -f docker-compose.prod.yml up --build -d
```

## 🔧 Manual Deployment

### 1. Build Backend (Go)
```bash
cd gobackend
go build -o api ./cmd/api
go build -o worker ./cmd/worker
```

### 2. Build Frontends (Next.js)
```bash
cd apps/marketplace-next && npm run build && npm run start
cd apps/dashboard-web && npm run build && npm run start
cd apps/business && npm run build && npm run start
# or from root: npm run dev:marketplace / dev:dashboard-web / dev:business / dev:all
```

### 3. Start Backend
```bash
cd gobackend
./api
```

### 4. Process supervision
Use systemd / Docker restart policies / the hosting platform's process manager for `./api` and `./worker` (each with the production env file). Verify with `/monitoring/ready`.

## 🔄 CI/CD Pipeline

### GitHub Actions Setup
1. Add required secrets to GitHub repository:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
   - `ADMIN_BOOTSTRAP_TOKEN`
   - `PRODUCTION_HOST`
   - `PRODUCTION_USER`
   - `PRODUCTION_SSH_KEY`

### 2. Pipeline Triggers
- **Push to `main`**: Full deployment
- **Push to `develop`**: Development tests
- **Pull requests**: Testing and validation

### 3. Manual Deployment
```bash
git pull origin main
cd gobackend
docker build -f Dockerfile -t ray-api:latest .
```

## 📊 Monitoring

Backend exposes:
- `GET /monitoring/live` — liveness
- `GET /monitoring/ready` — readiness (DB + Redis)
- `GET /metrics` — Prometheus metrics
- `GET /api/v1/status` — API status

Errors are shaped as `{success:false, error, message}`.

### Health Checks
```bash
# Liveness / readiness (backend port 4000)
curl http://localhost:4000/monitoring/live
curl http://localhost:4000/monitoring/ready

# API status
curl http://localhost:4000/api/v1/status

# Metrics
curl http://localhost:4000/metrics
```

### Log Management
```bash
# Go backend logs (binary / docker)
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f redis
```

### Performance Monitoring
Access monitoring endpoints:
- `/monitoring/live` - Liveness
- `/monitoring/ready` - Readiness (DB + Redis)
- `/metrics` - Prometheus metrics
- `/api/v1/status` - API status

## 🔧 Troubleshooting

### Common Issues

#### 1. Port already in use (`bind: address already in use` on :4000)
```bash
# The backend is already running. On Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F
# then: cd gobackend && go run ./cmd/api
```

#### 2. `insufficient_role` on `/shops/me`
```bash
# The user is not MERCHANT/ADMIN or the token in localStorage is stale.
# In the browser console:
# localStorage.removeItem('ray_token'); localStorage.removeItem('token'); localStorage.removeItem('ray_user');
# Then re-do the dev-login from /admin/gate (dashboard-web).
```

#### 3. `s3 client not available`
- Warning only — media works locally without S3. No action needed for local dev.

#### 4. Database connection failure
```bash
cd gobackend
docker compose up -d postgres redis
# Ensure the postgres container on 5433 is running and DATABASE_URL is correct.
curl http://localhost:4000/monitoring/ready
```

#### 5. `Cannot POST /api/v1/auth/logout`
- Historic frontend issue: the frontend called a route that does not exist in the Go backend. Clear the token locally instead; no backend fix needed.

#### 6. Redis Connection Issues
```bash
cd gobackend
docker compose ps
docker compose restart redis
redis-cli -h localhost -p 6379 ping
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Add indexes
CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEX idx_shops_active ON shops(is_active);
CREATE INDEX idx_products_shop ON products(shop_id);
```

#### 2. Redis Optimization
```bash
redis-cli info memory
# maxmemory 256mb
# maxmemory-policy allkeys-lru
```

## 🚀 Production Best Practices

### Security
1. **Environment Variables**: Never commit `.env` files (see `gobackend/.env.example`, `.env.production.example`)
2. **Secrets**: `JWT_SECRET` (32+, non-default), `ADMIN_BOOTSTRAP_TOKEN` (non-default), `CSRF_DISABLED=false`, `CORS_ORIGIN` without `*`
3. **Dev-login**: disabled in production (`APP_ENV=production`)
4. **Database**: Use strong passwords and SSL
5. **Redis**: Enable authentication and TLS
6. **Network**: Use firewall and VPN
7. **Updates**: Keep dependencies updated

### Backup Strategy
```bash
# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Redis backup
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb backup_$(date +%Y%m%d).rdb
```

### Scaling
1. **Horizontal Scaling**: Run more `ray-api` containers behind a load balancer (health: `/monitoring/ready`)
2. **Worker**: Scale the `ray-worker` (`Dockerfile.worker`) independently
3. **Database**: Read replicas for heavy read workloads
4. **CDN**: CloudFlare or AWS CloudFront for static assets

### Monitoring Alerts
Set up alerts for:
- CPU usage > 80%
- Memory usage > 90%
- `/monitoring/ready` returning 503 (DB/Redis)
- Error rate (`{success:false}`) > 5%

## 📞 Support

For deployment issues:
1. Check logs of the `api`/`worker` containers
2. Verify environment (mandatory prod vars)
3. Test connections: Database and Redis
4. Review monitoring: `/monitoring/ready`, `/metrics`, `/api/v1/status`

---

**Deployment Status**: ✅ Ready for production (Go backend)
**Last Updated**: 2026-09-03
**Version**: 1.0.0
