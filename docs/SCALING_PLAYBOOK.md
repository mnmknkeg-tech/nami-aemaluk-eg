# Scaling Playbook (1000+ Concurrent Users)

> السياق الحالي: الباك المستهدف بهذا الدليل هو `gobackend/` وحده (Go 1.25 + Fiber — باك NestJS القديم حُذف 2026-08-24، وتشغيله عبر `go run ./cmd/api` داخل `gobackend/`)، والفرونت ثلاثة تطبيقات Next.js في `apps/`، وقاعدة البيانات PostgreSQL على `localhost:5433` بهجرات SQL في `gobackend/migrations/` (لا Prisma)، وRedis على `6379`.

This plan is intentionally split into:

1. **Inside repo (my part)**
2. **Outside infra/platform (your part)**

## 1) My part (implemented here)

### A. Repeatable load test script
A k6 scenario was added at:

- `scripts/load/k6-public-api.js` 

It tests common public API endpoints with staged traffic up to 1000 virtual users and validates:

- failure rate under 2%
- p95 latency under 900ms
- p99 latency under 1500ms

### B. NPM command
Run with:

```bash
npm run loadtest:k6
```

Environment variables supported:

- `BASE_URL` (default `http://localhost:4000`)
- `TARGET_SHOP_SLUG` (default `demo-shop`)

Example:

```bash
BASE_URL=https://api.mnmknk.com TARGET_SHOP_SLUG=my-shop npm run loadtest:k6
```

---

## 2) Your part (external infra)

These steps are mandatory for real 1000+ concurrency and cannot be solved by app code alone.

### A. Horizontal scaling
- Run multiple app instances (start with 3–6 replicas).
- Put a load balancer in front (round-robin + health checks).
- Keep application stateless (sessions/cache in Redis, not memory).

### B. Database tuning
- Use managed Postgres tier sized for expected CPU/IOPS.
- Add connection pooling (PgBouncer or provider pooler).
- Set explicit DB pool limits per app instance to avoid connection storms.
- Add indexes for heavy read paths discovered by slow query logs.

### C. Redis hardening
- Use managed Redis with persistence policy suitable for your risk profile.
- Set max memory + eviction strategy (usually `allkeys-lru` for cache use cases).
- Add Redis uptime alerting; if Redis fails, expect latency increase.

### D. Monitoring and autoscaling
Track and alert on:

- API p95/p99 latency
- error rate (4xx/5xx split)
- app CPU/RAM
- DB CPU, active connections, slow queries
- Redis memory/evictions/latency

Enable autoscaling based on:

- CPU + memory (base signal)
- request latency or queue depth (better signal)

### E. Rollout process (important)
1. Deploy canary (1 replica).
2. Run k6 test at 200 concurrent.
3. Fix bottlenecks.
4. Re-run at 600.
5. Re-run at 1000.
6. Keep 20–30% headroom before declaring success.

---

## Success definition (suggested)

At **1000 concurrent** for at least 10 minutes:

- p95 < 900ms
- p99 < 1500ms
- error rate < 2%
- no sustained DB connection saturation
- no Redis timeout spikes

If any condition fails, capacity is not production-ready yet.
