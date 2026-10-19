# 4) دليل الواجهة الخلفية الشامل (Go + Fiber)

> الباكند Go 1.25 + Fiber v2.52.5، والموديول `github.com/Sayedtaha55/ray-eg/gobackend`. لا NestJS ولا Prisma ولا SQLite — أي ذكر قديم لـ `main.ts` / `app.module.ts` / `@nestjs/*` / ValidationPipe / Guards / `schema.prisma` محذوف.

## 4.1 نقطة الدخول الرئيسية (Main Entry Point)

### 4.1.1 ملف `gobackend/cmd/api/main.go`
**المسؤوليات الأساسية (بالترتيب):**
```go
// 1. تحميل الإعداد من البيئة عبر internal/config (ملف .env مدعوم محليًا)
cfg, err := config.Load()

// 2. بناء التطبيق عبر app.New (يجمّع الـ 29 دومين + الميدلوير + المراقبة)
app := app.New(cfg)

// 3. الاستماع على HOST:PORT
log.Fatal(app.Listen(cfg.Addr()))
```

- الدخول الوحيد: `gobackend/cmd/api/main.go`.
- يحمّل `internal/config` ثم `app.New` ثم `Listen` — لا يوجد `NestFactory.create` ولا `bootstrap()` ولا `ValidationPipe` عام.
- التشغيل:
```bash
cd gobackend
go run ./cmd/api
# أو من الجذر:
npm run go:backend:dev
```

### 4.1.2 متغيرات البيئة الهامة (عبر `internal/config/config.go`)
```bash
# إعدادات الخادم الأساسية
PORT=4000
HOST=0.0.0.0
APP_ENV=development

# قاعدة البيانات (PostgreSQL فقط)
DATABASE_URL=postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable
DB_MIGRATE_ON_BOOT=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# الأمان (JWT HS256 — iss=ray-backend-go)
JWT_SECRET="your-32-plus-character-super-secret-jwt-key-here"

# CORS و Frontend
CORS_ORIGIN="http://localhost:5174,http://localhost:3000"
FRONTEND_APP_URL="http://localhost:5174"

# مسارات التطوير فقط
ALLOW_DEV_MERCHANT_BOOTSTRAP=true
ALLOW_DEV_COURIER_BOOTSTRAP=true
ALLOW_DEV_CUSTOMER_BOOTSTRAP=true
```

- `JWT_SECRET` يجب أن يكون 32+ حرف.
- `ALLOW_DEV_*_BOOTSTRAP` للتطوير فقط (تُفعِّل `dev-*-login`).
- الفرونت يتصل بالباك عبر rewrite `/api/:path*` → `http://localhost:4000` (انظر `apps/dashboard-web/next.config.mjs`).

## 4.2 الإعداد (Config Package)

### 4.2.1 ملف `gobackend/internal/config/config.go`
**المسؤوليات:**
```go
// Config — الهيكل المركزي للإعداد
type Config struct {
    Port   string // PORT=4000
    Host   string // HOST=0.0.0.0
    AppEnv string // APP_ENV=development

    DatabaseURL     string // DATABASE_URL (postgres فقط)
    MigrateOnBoot   bool   // DB_MIGRATE_ON_BOOT=true

    RedisHost string // REDIS_HOST
    RedisPort string // REDIS_PORT

    JWTSecret      string // JWT_SECRET (32+ حرف)
    FrontendAppURL string // FRONTEND_APP_URL
    CORSOrigin     string // CORS_ORIGIN (قائمة مفصولة بفواصل)

    AllowDevMerchantBootstrap bool // ALLOW_DEV_*_BOOTSTRAP
    AllowDevCourierBootstrap  bool
    AllowDevCustomerBootstrap bool
}

// Load يقرأ البيئة + ملف .env (محليًا) ويفشل مبكرًا عند القيم الناقصة
func Load() (*Config, error) { /* ... */ }
```

- لا يوجد `ConfigModule.forRoot` — الإعداد هيكل Go عادي يُمرَّر لـ `app.New`.
- أي مفتاح ناقص (مثل `JWT_SECRET` قصير أو `DATABASE_URL` فارغ) يسبب فشلًا صريحًا عند الإقلاع.

### 4.2.2 البناء والفحص
```bash
cd gobackend
make build   # بناء الثنائية
make test    # الاختبارات
make vet     # الفحص الاستاتيكي
```

## 4.3 تركيب التطبيق (Application Wiring)

### 4.3.1 ملف `gobackend/internal/app/app.go`
**يجمع 29 دومين تحت `/api/v1`:**
```
analytics, apps, auth, bookings, cartevent, chat, courier, customers,
feedback, gallery, hr, invoice, mapdomain, measurement, media,
notification, offers, orders, portal, products, reservation, reviews,
search, seasonaloffers, shopimagemap, shops, support, users
```

**بالإضافة إلى المراقبة:**
```
GET /monitoring/live
GET /monitoring/ready
GET /monitoring/health
GET /metrics
GET /api/v1/status
```

**نمط التسجيل (مثال):**
```go
// app.go — نمط عام
func New(cfg *config.Config) *fiber.App {
    app := fiber.New(fiber.Config{
        ErrorHandler: unifiedErrorHandler, // صيغة {success:false, error, message, fields?}
    })

    applyMiddleware(app, cfg)          // بالترتيب الموثق في 4.4
    v1 := app.Group("/api/v1")         // كل الدومينات تحتها

    auth.Register(v1, deps)            // كل دومين يسجل مساراته
    shops.Register(v1, deps)
    products.Register(v1, deps)
    // ... بقية الـ 29 دومين

    app.Get("/monitoring/live", liveHandler)
    app.Get("/monitoring/ready", readyHandler)
    app.Get("/monitoring/health", healthHandler)
    app.Get("/metrics", metricsHandler)
    v1.Get("/status", statusHandler)

    return app
}
```

### 4.3.2 هيكل الدومين (Domain Structure)
**كل دومين حزمة Go مستقلة:**
```
internal/
├── app/
│   └── app.go              # التجميع + الميدلوير + المراقبة
├── config/
│   └── config.go           # الإعداد من البيئة
├── auth/
│   ├── handler.go          # مسارات POST signup|login|logout|refresh|me + dev-*-login
│   ├── service.go          # منطق JWT HS256 (iss=ray-backend-go)
│   └── repository.go       # استعلامات pgx/v5 اليدوية
├── shops/
│   ├── handler.go          # GET /api/v1/shops/me (يتطلب MERCHANT أو ADMIN)
│   ├── service.go
│   └── repository.go
├── products/
├── orders/
└── ... (بقية الدومينات بنفس النمط)
```

- لا Controllers/Providers/Decorators — كل دومين: `handler + service + repository`.
- لا DTO classes ولا class-validator — التحقق يدوي/بمكتبات Go خفيفة داخل الـ handler/service.

## 4.4 الميدلوير (Middleware — بالترتيب)

### 4.4.1 الترتيب الرسمي
```
1.  Recovery
2.  RequestID
3.  Logger
4.  compress
5.  SecurityHeaders
6.  CORS
7.  SlowDown
8.  CircuitBreaker
9.  RateLimiter
10. AdminIPAllowlist
11. Idempotency
12. CSRF
13. Auth rate limit
14. Metrics
```

- الترتيب ملزم: أي تغيير يعيد تقييم الأمان (CORS قبل الـ limiter، والمصادقة الخاصة قبل المقاييس).
- `CORS` يُبنى من `CORS_ORIGIN` (قائمة مفصولة بفواصل).
- `Auth rate limit` حدود أشد على مسارات `auth` الحساسة (login/signup/refresh).

### 4.4.2 مثال تطبيقي (نمط)
```go
// الترتيب مهم — لا تعيد ترتيبه دون مراجعة أمنية
app.Use(recover.New())        // 1. Recovery
app.Use(requestid.New())      // 2. RequestID
app.Use(logger.New())         // 3. Logger
app.Use(compress.New())       // 4. compress
app.Use(securityHeaders())    // 5. SecurityHeaders
app.Use(cors.New(cors.Config{ // 6. CORS
    AllowOrigins: cfg.CORSOrigin,
}))
app.Use(slowDown())           // 7. SlowDown
app.Use(circuitBreaker())     // 8. CircuitBreaker
app.Use(rateLimiter())        // 9. RateLimiter
app.Use(adminIPAllowlist())   // 10. AdminIPAllowlist
app.Use(idempotency())        // 11. Idempotency
app.Use(csrf())               // 12. CSRF
app.Use(authRateLimit())      // 13. Auth rate limit
app.Use(metricsMiddleware())  // 14. Metrics
```

## 4.5 صيغة الأخطاء الموحدة (Error Format)

### 4.5.1 الصيغة الوحيدة
```json
// خطأ
{
  "success": false,
  "error": "insufficient_role",
  "message": "Merchant or admin role required",
  "fields": { "required": ["MERCHANT", "ADMIN"] }
}

// نجاح
{
  "success": true,
  "data": {}
}
```

### 4.5.2 المعالج المركزي (نمط)
```go
// unifiedErrorHandler — كل الأخطاء تمر من هنا
func unifiedErrorHandler(c *fiber.Ctx, err error) error {
    code := fiber.StatusInternalServerError
    errCode := "internal_error"
    message := "Internal server error"

    var e *fiber.Error
    if errors.As(err, &e) {
        code = e.Code
        message = e.Message
    }
    if appErr, ok := AsAppError(err); ok {
        errCode = appErr.Code // مثال: insufficient_role
        message = appErr.Message
    }

    resp := fiber.Map{
        "success": false,
        "error":   errCode,
        "message": message,
    }
    if appErr != nil && appErr.Fields != nil {
        resp["fields"] = appErr.Fields
    }
    return c.Status(code).JSON(resp)
}
```

- لا توجد `AllExceptionsFilter` ولا `{statusCode, path, timestamp, stack}`.
- رموز شائعة: `unauthorized`, `insufficient_role`, `forbidden`, `not_found`, `validation_error`, `conflict`, `rate_limited`, `internal_error`.

## 4.6 المصادقة والأدوار (Auth)

### 4.6.1 JWT HS256
- الخوارزمية: HS256، والمُصدِر: `iss=ray-backend-go`.
- التوقيع: `JWT_SECRET` (32+ حرف).
- الأدوار: `CUSTOMER/MERCHANT/ADMIN/COURIER/CASHIER`.

### 4.6.2 أهم المسارات
```
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET  /api/v1/auth/me

# تطوير فقط (خلف ALLOW_DEV_*_BOOTSTRAP):
POST /api/v1/auth/dev-merchant-login
POST /api/v1/auth/dev-courier-login
POST /api/v1/auth/dev-customer-login
```

**مثال فحص الدور (نمط):**
```go
// GET /api/v1/shops/me — يتطلب MERCHANT أو ADMIN
func RequireRoles(roles ...string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        role := c.Locals("role").(string)
        for _, r := range roles {
            if role == r {
                return c.Next()
            }
        }
        return c.Status(403).JSON(fiber.Map{
            "success": false,
            "error":   "insufficient_role",
            "message": "Merchant or admin role required",
        })
    }
}
```

**مثال متجر التاجر:**
```bash
curl http://localhost:4000/api/v1/shops/me \
  -H "Authorization: Bearer <jwt_token>"
# بدون دور MERCHANT/ADMIN → {success:false, error:"insufficient_role", ...}
```

### 4.6.3 ملاحظة عن Guards المحذوفة
- لا يوجد `JwtAuthGuard` ولا `RolesGuard` ولا `@Roles()` ولا Passport strategies — المقابل ميدلوير Fiber + `c.Locals("role")` كما أعلاه.

## 4.7 الدومينات الأساسية (Core Domains)

### 4.7.1 المصادقة (auth)
- signup/login/logout/refresh/me + مسارات `dev-*-login` (تطوير فقط).
- إصدار JWT (HS256, iss=ray-backend-go) والتحقق منه في ميدلوير.

### 4.7.2 المتاجر (shops)
- `GET /api/v1/shops/me` (MERCHANT أو ADMIN وإلا `insufficient_role`).
- إنشاء/تحديث المتجر، القوائم العامة، الزيارات/المتابعة، إدارة الأدمن.

### 4.7.3 المنتجات (products)
- قوائم عامة + إدارة التاجر (إنشاء/تحديث/حذف/مخزون/استيراد مسودات).

### 4.7.4 الطلبات (orders)
- إنشاء/استعلام/تحديث + تعيين كابتن + حالات الكابتن + إرجاع + إدارة أدمن.

### 4.7.5 الفواتير (invoice)
- فواتيري/ملخصي + كل الفواتير (ADMIN) + إنشاء/تحديث.

### 4.7.6 الكابتنات (courier)
- الحالة (state) + عروض التوصيل (قبول/رفض).

### 4.7.7 التحليلات (analytics)
- تحليلات النظام + سلاسل زمنية + نشاط (راجع خريطة API).

### 4.7.8 الإشعارات (notification)
- إشعاراتي/غير المقروء + إشعارات المتجر.

### 4.7.9 الوسائط (media/gallery)
- presign/upload/complete + معرض المتجر.

> التفاصيل الكاملة للمسارات في `docs/08-api-map.md`. المرجع النهائي `internal/app/app.go` + حزمة كل دومين.

## 4.8 قاعدة البيانات (PostgreSQL + pgx/v5)

### 4.8.1 المبادئ
- PostgreSQL فقط — لا Prisma ولا SQLite.
- الهجرات SQL مرقمة في `gobackend/migrations/` (حتى `000049_*`) عبر golang-migrate، وتُطبَّق عند `DB_MIGRATE_ON_BOOT=true`.
- نوع `UserRole` هو enum (`CUSTOMER, MERCHANT, ADMIN, COURIER` + `CASHIER` عند الحاجة).
- كود المستودعات بـ pgx/v5 يدويًا؛ `sqlc.yaml` اختياري فقط.

### 4.8.2 مثال مستودع (نمط)
```go
type Repository struct{ db *pgxpool.Pool }

func (r *Repository) GetByID(ctx context.Context, id string) (*Shop, error) {
    const q = `SELECT id, name, slug, owner_id, is_active, created_at FROM shops WHERE id = $1;`
    var s Shop
    err := r.db.QueryRow(ctx, q, id).Scan(&s.ID, &s.Name, &s.Slug, &s.OwnerID, &s.IsActive, &s.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &s, nil
}
```

### 4.8.3 Transactions (نمط)
```go
tx, err := pool.Begin(ctx)
if err != nil {
    return err
}
defer tx.Rollback(ctx)
// 1. إنشاء الطلب — 2. عناصره — 3. خصم المخزون — 4. tx.Commit(ctx)
```

- التفاصيل الكاملة في `docs/06-database-guide.md`.

## 4.9 نظام الإشعارات (Notification System)

### 4.9.1 المبدأ
- قنوات: in-app (+ email/sms/push حسب الإعداد).
- الإرسال عبر service الدومين `notification` مع أفضل جهد (best-effort) للقنوات الثانوية.

### 4.9.2 النمط (Go)
```go
// Send — in-app أولًا ثم القنوات الاختيارية
func (s *Service) Send(ctx context.Context, in SendInput) error {
    if err := s.repo.Create(ctx, in); err != nil {
        return err
    }
    // قنوات إضافية حسب in.Channels — فشلها لا يفشل الأساسية
    s.sendEmailBestEffort(ctx, in)
    s.sendSMSBestEffort(ctx, in)
    s.sendPushBestEffort(ctx, in)
    return nil
}
```

## 4.10 نظام الملفات والوسائط (Media Management)

### 4.10.1 التدفق
```
1. POST /api/v1/media/presign → رابط رفع مباشر
2. PUT/POST /api/v1/media/upload → الرفع
3. POST /api/v1/media/complete → الإتمام والتسجيل
```

### 4.10.2 النمط (Go)
```go
// upload — يتحقق من النوع والحجم ثم يخزن ويسجل
func (h *Handler) Upload(c *fiber.Ctx) error {
    file, err := c.FormFile("file")
    if err != nil {
        return validationError("file", "File is required")
    }
    // تحقق من الحجم والنوع → خزّن → سجّل في DB → أعد {success:true, data:{url, key, size}}
    return c.JSON(fiber.Map{"success": true, "data": saved})
}
```

## 4.11 نظام التخزين المؤقت (Caching — Redis)

### 4.11.1 الإعداد
- عبر `REDIS_HOST` / `REDIS_PORT` (افتراضيًا `localhost:6379` من `docker-compose.yml`).
- الاستخدام: كاش القوائم العامة، الجلسات، الـ rate limiting، الـ idempotency.

### 4.11.2 النمط (Go)
```go
// get-or-set بسيط
func Cached(key string, ttl time.Duration, load func() (any, error)) (any, error) {
    if v, ok := redisGet(key); ok {
        return v, nil
    }
    v, err := load()
    if err != nil {
        return nil, err
    }
    redisSet(key, v, ttl)
    return v, nil
}
```

## 4.12 أفضل الممارسات (Best Practices)

### 4.12.1 تنظيم الكود
```go
// 1. كل دومين حزمة مستقلة: handler + service + repository
// 2. التحقق من المدخلات في الـ handler/service (لا ValidationPipe)
// 3. التفويض عبر ميدلوير الأدوار (لا Guards/Decorators)
// 4. الأخطاء عبر المعالج الموحد {success:false, error, message, fields?}
// 5. الوصول للبيانات pgx/v5 يدويًا (لا Prisma Client)
// 6. التسجيل/التجميع المركزي في internal/app/app.go فقط
// 7. الإعداد عبر internal/config فقط (لا ConfigModule)
// 8. الهجرات SQL مرقمة فقط (لا migrate dev/deploy)
// 9. لا SQLite ولا Prisma في أي بيئة
// 10. المراقبة /monitoring/* + /metrics + /api/v1/status دائمًا
```

### 4.12.2 تحسين الأداء
```go
// 1. indexes للأعمدة كثيرة الاستعلام (انظر 06-database-guide)
// 2. pagination لكل القوائم (LIMIT/OFFSET)
// 3. كاش Redis للقوائم العامة
// 4. pool بحجم مناسب (MaxConns)
// 5. ضغط الاستجابات (compress middleware)
// 6. مهام طويلة خارج مسار الطلب (background jobs)
```

### 4.12.3 الأمان
```go
// 1. تحقق دائمًا من المدخلات (النوع/الطول/النطاق)
// 2. استعلامات مُعامَلة ($1, $2) — لا تجميع SQL نصيًا
// 3. JWT HS256 صادر واحد iss=ray-backend-go + JWT_SECRET بطول 32+
// 4. معدل الطلبات (RateLimiter + SlowDown + Auth rate limit)
// 5. CORS من CORS_ORIGIN فقط
// 6. مسارات dev-*-login خلف ALLOW_DEV_*_BOOTSTRAP فقط
// 7. متغيرات حساسة من البيئة فقط (لا أسرار في الكود)
// 8. صيغة أخطاء موحدة لا تسرب تفاصيل داخلية
```

## 4.13 نصائح التطوير (Development Tips)

### 4.13.1 Debugging
```go
// 1. ابدأ من /monitoring/health و /monitoring/ready عند أي عطل
// 2. سجلات Fiber (Logger) مع APP_ENV=development
// 3. تحقق من DATABASE_URL (منفذ 5433) و REDIS_HOST/PORT قبل اتهام الكود
// 4. تحقق من ترتيب الميدلوير (4.4) عند أعطال CORS/auth/rate-limit
// 5. استخدم RequestID لتتبع الطلب عبر السجلات
// 6. تحقق من تسجيل الدومين في app.go عند 404 لمسار جديد
// 7. تحقق من الدور عند insufficient_role (مثال shops/me)
// 8. راقب /metrics للمقاييس
```

### 4.13.2 Testing
```bash
cd gobackend
make test    # كل الاختبارات
make vet     # فحص استاتيكي
go test ./internal/auth/...   # دومين محدد
```

```go
// 1. اختبارات وحدة لكل service
// 2. اختبارات تكامل للـ handlers (Fiber Test)
// 3. اختبارات e2e للمسارات الحرجة (auth → shops/me → orders)
// 4. قواعد بيانات اختبار منفصلة (لا تختبر على ray_marketplace)
// 5. غطِّ حالات insufficient_role و validation_error
```

### 4.13.3 Deployment
```go
// 1. الإعداد من البيئة فقط (PORT/HOST/DATABASE_URL/JWT_SECRET/...)
// 2. DB_MIGRATE_ON_BOOT=true لتطبيق الهجرات عند الإقلاع
// 3. لا تُفعِّل ALLOW_DEV_*_BOOTSTRAP في الإنتاج أبدًا
// 4. فحوصات الحِمل على /monitoring/live و /monitoring/ready
// 5. إيقاف هادئ (graceful shutdown) عند SIGTERM/SIGINT
// 6. نسخ احتياطي لـ PostgreSQL (pg_dump) قبل أي ترقية
// 7. راقب /metrics باستمرار
```
