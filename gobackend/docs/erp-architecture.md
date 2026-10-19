# ERP Modular Monolith — Architecture Guide

> بيئة التشغيل الحالية: الباك الوحيد هو `gobackend/` (Go 1.25 + Fiber — باك NestJS القديم حُذف 2026-08-24، والتشغيل عبر `go run ./cmd/api` داخل `gobackend/`)، والفرونت ثلاثة تطبيقات Next.js في `apps/` (marketplace-next, dashboard-web, business)، وقاعدة البيانات PostgreSQL على `localhost:5433` بهجرات SQL في `gobackend/migrations/` (لا Prisma)، وRedis على `6379`. التوصيل الحالي: 29 موديول تحت `/api/v1` عبر `internal/app/app.go` — الاستثناءات المعروفة: `pos` و`dashboard` و`productcategories` لها handlers لكنها غير موصولة، و`finance` (service+repo فقط) بلا handler.

## Folder Structure

```
gobackend/
├── cmd/api/main.go
├── internal/
│   ├── app/app.go                  # wires all domains + calls pkg/events/wiring.Wire()
│   ├── domains/                    # existing domains (unchanged)
│   └── platform/                   # db, redis, middleware (reused as-is)
└── pkg/
    ├── events/
    │   ├── bus.go                  # in-memory pub/sub (swap for NATS to go micro)
    │   └── wiring.go               # cross-domain subscriptions (cart → erp inventory)
    └── domain/
        ├── erp/erp.go              # InventoryService, AccountingService, DynamicAttrs
        ├── cart/cart.go            # CartService interface + Redis-first implementation
        ├── storefront/storefront.go # StorefrontService interface
        └── marketing/marketing.go  # MarketingService interface
```

---

## Cross-Domain Communication Flow

```
[cart domain]
    Checkout() → publishes events.TopicCartCheckedOut
                        ↓  (event bus)
[erp domain]
    DeductStock() ← subscribed in pkg/events/wiring.Wire()
```

No direct package imports between domains. Only interfaces cross boundaries.

---

## Microservice Extraction: cart → standalone service

### 1. Boundary is already clean
`pkg/domain/cart.CartService` is an interface. Swap the implementation, not the callers.

### 2. Create standalone service
```
cart-service/
├── cmd/server/main.go
├── internal/service/cart.go   # same logic, same Redis client
├── proto/cart/v1/cart.proto
└── Dockerfile
```

### 3. gRPC client adapter (drop-in)
```go
// pkg/domain/cart/grpc_client.go
type grpcCartService struct{ client cartv1.CartServiceClient }

func NewGRPCCartService(conn *grpc.ClientConn) CartService {
    return &grpcCartService{client: cartv1.NewCartServiceClient(conn)}
}
```

### 4. One-line swap in app.go
```go
// Before:
cartSvc := cart.NewRedisCartService(redisClient.UniversalClient)

// After:
conn, _ := grpc.Dial(cfg.CartServiceAddr, grpc.WithTransportCredentials(...))
cartSvc := cart.NewGRPCCartService(conn)
```

### 5. Swap event bus for NATS/Redis Streams
```go
func (b *NATSBus) Publish(ctx context.Context, e Event) {
    data, _ := json.Marshal(e.Payload)
    _ = b.nc.Publish(e.Topic, data)
}
```

---

## JSONB Dynamic Attributes (Odoo-like custom fields)

```sql
-- Zero-downtime migration:
ALTER TABLE products ADD COLUMN IF NOT EXISTS attrs jsonb NOT NULL DEFAULT '{}';
CREATE INDEX CONCURRENTLY idx_products_attrs ON products USING gin(attrs);
```

```go
// Query by dynamic attribute:
rows, _ := pool.Query(ctx,
    `SELECT id, name, attrs FROM products WHERE attrs @> $1`,
    `{"size":"XL"}`,
)

// Bind to typed struct:
type ClothingAttrs struct { Size string `json:"size"`; Color string `json:"color"` }
var ca ClothingAttrs
_ = product.Attrs.Bind(&ca)
```

---

## RBAC with Casbin

```go
// policy.csv:
// p, store_manager,   /api/v1/products/*, (GET)|(POST)|(PUT)
// p, erp_accountant,  /api/v1/finance/*,  GET
// p, super_admin,     *,                  *

e, _ := casbin.NewEnforcer("model.conf", "policy.csv")

func CasbinMiddleware(e *casbin.Enforcer) fiber.Handler {
    return func(c *fiber.Ctx) error {
        role := c.Locals("role").(string)
        if ok, _ := e.Enforce(role, c.Path(), c.Method()); !ok {
            return fiber.ErrForbidden
        }
        return c.Next()
    }
}
```
