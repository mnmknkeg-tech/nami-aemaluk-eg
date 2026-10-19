# 2) المعمارية الفنية الشاملة

## 2.1 النظرة الطبقية للمعمارية (Layered Architecture)

### 2.1.1 طبقة العرض (Presentation Layer)
**الواجهة الأمامية (Frontend):**
- **ثلاثة تطبيقات Next.js** في `apps/`: `marketplace-next` (المتجر)، `dashboard-web` (لوحة التحكم)، `business` (بوابة التجار)
- **Multi-role interfaces:** Public, Merchant, Admin, Courier dashboards
- **Responsive Design:** Mobile-first approach مع Progressive Web App (PWA) features
- **State Management:** React Query + Context API لإدارة الحالة
- **Component Architecture:** Atomic Design pattern مع reusable components
- كل تطبيق يعمل rewrite للمسار `/api/:path*` إلى `BACKEND_URL` (الافتراضي `http://localhost:4000`) — انظر `apps/*/next.config.mjs`

**التقنيات المستخدمة:**
- Next.js مع App Router و Server-Side Rendering
- React مع Concurrent Features
- TypeScript للـ type safety
- Tailwind CSS للـ utility-first styling
- Framer Motion للـ animations
- Lucide React للأيقونات

### 2.1.2 طبقة الـ API (API Layer)
**Fiber Handlers & Middleware (باك Go الوحيد):**
- **RESTful API** تحت البادئة `/api/v1` مكوّن من 29 موديول دومين
- **Authentication Middleware:** JWT-based authentication مع refresh tokens
- **Authorization:** Role-based access control (RBAC) بالأدوار `CUSTOMER`/`MERCHANT`/`ADMIN`/`COURIER`/`CASHIER` (أحرف كبيرة)
- **Validation:** تحقق شامل من المدخلات على مستوى الـ handlers
- **Centralized error handling:** معالجة مركزية للأخطاء
- **Rate Limiting:** تحديد معدل متعدد المستويات للحماية (مدعوم بـ Redis)
- **CORS Configuration:** إعداد CORS حسب الـ environment

**المميزات الأمنية:**
- Helmet middleware لتأمين HTTP headers
- CSRF protection
- XSS prevention مع Content Security Policy
- حماية من حقن SQL عبر استعلامات مُعامَلة (parameterized queries)
- Request/response logging للتدقيق

### 2.1.3 طبقة المجال والتطبيق (Domain/Application Layer)
**Go Services (Business Logic):**
- **Service Layer Pattern:** فصل منطق الأعمال عن الـ handlers
- **Repository Pattern:** تجريد الوصول للبيانات
- **Event-Driven Architecture:** أحداث دومين للـ loose coupling
- **Transaction Management:** عمليات ذرية (atomic operations) على مستوى قاعدة البيانات

**الموديولات الـ 29 الموصولة تحت `/api/v1`:**
analytics, apps, auth, bookings, cartEvents, chat, courier, customers, feedback, gallery, hr, invoice, map, media, measurement, notification, offers, orders, portal, products, reservation, reviews, search, seasonalOffers, shopBuilder, shopImageMap, shops, support, users

### 2.1.4 طبقة البيانات (Data Layer)
**PostgreSQL + golang-migrate (لا Prisma ولا SQLite):**
- **PostgreSQL 15** عبر Docker على `localhost:5433` (يوزر `ray_user`)
- سلسلة الاتصال: `postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable`
- **الهجرات:** ملفات SQL بـ golang-migrate في `gobackend/migrations/` وتُطبق عند الإقلاع (`DB_MIGRATE_ON_BOOT`)
- **Connection Pooling:** إدارة اتصالات قاعدة البيانات بكفاءة
- **Query Optimization:** منع مشكلة N+1
- **Data Validation:** قيود على مستوى الـ schema
- **Soft Deletes:** سياسات الاحتفاظ بالبيانات

**التخزين المؤقت (Caching):**
- **Redis 7** على `localhost:6379` للتخزين المؤقت عالي الأداء
- **Session Storage:** جلسات المستخدمين والبيانات المؤقتة
- **API Response Caching:** طبقة كاش لعمليات القراءة الكثيفة
- **Rate Limiting:** عدّادات تحديد المعدل
- **Background Jobs:** طابور المهام الخلفية (asynq worker في `gobackend/cmd/worker`)

### 2.1.5 طبقة البنية التحتية (Infrastructure Layer)
**External Services Integration:**
- **Payment Gateways:** Fawry, PayMob, وغيرها
- **Email Services:** SendGrid, AWS SES
- **SMS Services:** Twilio, محلية SMS providers
- **Cloud Storage:** AWS S3, Google Cloud Storage
- **Maps & Geolocation:** Google Maps API
- **AI Services:** Google Gemini API

**Monitoring & Observability:**
- **Application Logging:** تسجيل منظم (structured logging)
- **Performance Monitoring:** أزمنة الاستجابة ومقاييس الإنتاجية
- **Health Checks:** نقاط `/monitoring/live` و`/monitoring/ready` و`/api/v1/status`
- **Metrics:** نقطة `/metrics`
- **Error Tracking:** Sentry أو similar

## 2.2 الهيكل العام للمجلدات والملفات

### 2.2.1 الواجهة الأمامية (Frontend Structure)
```
apps/
├── marketplace-next/          # المتجر (Next.js)
│   ├── app/                   # App Router pages
│   └── next.config.mjs        # rewrite: /api/:path* → BACKEND_URL
├── dashboard-web/             # لوحة التحكم (Next.js)
│   ├── app/
│   └── next.config.mjs        # rewrite: /api/:path* → BACKEND_URL
└── business/                  # بوابة التجار (Next.js)
    ├── app/
    └── next.config.mjs        # rewrite: /api/:path* → BACKEND_URL

components/ (داخل كل تطبيق أو الحزمة المشتركة)
├── pages/                    # Route-level components
│   ├── public/              # Public-facing pages
│   ├── business/            # Merchant dashboard
│   ├── admin/               # Admin panel
│   └── courier/             # Courier app
├── layouts/                 # Layout components
│   ├── PublicLayout.tsx
│   ├── BusinessLayout.tsx
│   ├── AdminLayout.tsx
│   └── CourierLayout.tsx
├── features/                # Feature-specific components
│   ├── auth/               # Authentication components
│   ├── shop/               # Shop management
│   ├── product/            # Product components
│   ├── order/              # Order management
│   └── payment/            # Payment components
├── ui/                     # Reusable UI components
├── hooks/                  # Custom React hooks
├── services/               # API services (تتكلم مع /api عبر الـ rewrite)
├── utils/                  # Utility functions
└── types/                  # TypeScript type definitions
```

**المصادقة في المتصفح (مشتركة بين التطبيقات الثلاثة):**
- `localStorage`: المفاتيح `ray_user` / `ray_token` / `token`
- كوكي `ray_session`
- الدخول التجريبي للتطوير عبر صفحة `/admin/gate` (تظهر فقط خارج الإنتاج)

### 2.2.2 الواجهة الخلفية (Backend Structure)
```
gobackend/                            # الموديول github.com/Sayedtaha55/ray-eg/gobackend
├── cmd/
│   ├── api/main.go                   # نقطة الدخول الوحيدة للـ API
│   └── worker/                       # عامل المهام الخلفية (asynq + Redis)
├── internal/
│   ├── app/app.go                    # تجميع التطبيق وتوصيل الموديولات
│   ├── modules/                      # موديولات الدومين الـ 29
│   │   ├── analytics/
│   │   ├── apps/
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── cartEvents/
│   │   ├── chat/
│   │   ├── courier/
│   │   ├── customers/
│   │   ├── feedback/
│   │   ├── gallery/
│   │   ├── hr/
│   │   ├── invoice/
│   │   ├── map/
│   │   ├── media/
│   │   ├── measurement/
│   │   ├── notification/
│   │   ├── offers/
│   │   ├── orders/
│   │   ├── portal/
│   │   ├── products/
│   │   ├── reservation/
│   │   ├── reviews/
│   │   ├── search/
│   │   ├── seasonalOffers/
│   │   ├── shopBuilder/
│   │   ├── shopImageMap/
│   │   ├── shops/
│   │   ├── support/
│   │   └── users/
│   ├── middleware/                   # مصادقة JWT، تفويض، تحديد معدل، CORS
│   └── platform/                     # اتصالات Postgres/Redis والبنية المشتركة
├── migrations/                       # هجرات SQL (golang-migrate)
└── pkg/                              # حزم مساعدة مشتركة
```

> باك NestJS القديم حُذف من المستودع بتاريخ 2026-08-24 وموجود فقط في `_archive/` ونسخ احتياطية خارجية — ممنوع توثيق أي أمر يخصه (لا `backend/main.ts` ولا `app.module.ts` ولا Prisma).

### 2.2.3 قاعدة البيانات (Database Structure)
```
gobackend/migrations/       # ملفات هجرات SQL مرقّمة (golang-migrate)
├── *.up.sql                # هجرة للأمام
└── *.down.sql              # تراجع عن الهجرة
```
- تُطبق الهجرات تلقائياً عند إقلاع الـ API عندما تكون `DB_MIGRATE_ON_BOOT` مفعّلة
- لا يوجد `schema.prisma` ولا سكيمات SQLite — أي إشارة إليها مهملة

## 2.3 معمارية الواجهة الأمامية (Frontend Architecture)

### 2.3.1 نقطة الدخول والتهيئة (Entry Point & Bootstrap)
**Next.js App Router - Application Bootstrap (لكل تطبيق في `apps/`):**
```
- تهيئة التطبيق عبر app/layout.tsx
- ErrorBoundary configuration
- ToastProvider setup
- Theme provider initialization
- Auth bootstrap من localStorage (ray_user / ray_token / token) وكوكي ray_session
```

### 2.3.2 نظام التوجيه (Routing System)
**App Router - Central Route Tree:**
```
- Public/business/admin/courier routes
- Nested layouts
- Shared suspense wrappers
- Legacy redirects
```

**app/routerHelpers / routeWarmup:**
```
- suspense fallback helpers
- redirect components
- route warmup heuristics
```

```
- Dynamic routing عبر الـ App Router
- Lazy loading للـ code splitting
- Route guards للمصادقة والتفويض (حسب الدور من الـ JWT)
- Nested routes للـ layouts
- Redirect handlers للـ legacy routes
- SEO optimization مع RouteSeoManager
```

**نماذج التحميل (Loading Patterns):**
- **Lazy Loading:** معظم الصفحات يتم تحميلها عند الطلب
- **Suspense Boundaries:** Loading states و error boundaries
- **Prefetching:** Intelligent prefetching للصفحات المحتملة
- **Progressive Loading:** Content streaming للصفحات الكبيرة

### 2.3.3 إدارة الحالة (State Management)
**Multi-layer State Management:**
- **Local State:** useState, useReducer للـ component state
- **Global State:** Context API للتطبيق-wide state
- **Server State:** React Query للـ API data (عبر rewrite إلى `BACKEND_URL`)
- **Form State:** React Hook Form للـ form management
- **URL State:** URL parameters للـ shareable state

### 2.3.4 مكونات التصميم (Design System)
**Component Architecture:**
- **Atomic Design:** Atoms, Molecules, Organisms, Templates, Pages
- **Compound Components:** المكونات المعقدة القابلة للتخصيص
- **Render Props:** المرونة في الـ component composition
- **Custom Hooks:** Logic reuse و state abstraction

### 2.3.5 تحسين الأداء (Performance Optimization)
**Optimization Strategies:**
- **Code Splitting:** Route-based و feature-based splitting
- **Tree Shaking:** Dead code elimination
- **Image Optimization:** Lazy loading, WebP format, responsive images
- **Bundle Analysis:** تحليل الحزم المولّدة
- **Caching Strategies:** Service worker caching, HTTP caching

## 2.4 معمارية الواجهة الخلفية (Backend Architecture)

### 2.4.1 تهيئة التطبيق (Application Bootstrap)
**gobackend/cmd/api/main.go - Server Bootstrap:**
```
- تحميل إعدادات البيئة
- إعداد CORS
- Security middleware (Helmet، تحديد المعدل)
- معالجة مركزية للأخطاء
- تطبيق هجرات golang-migrate عند الإقلاع (DB_MIGRATE_ON_BOOT)
- إغلاق منظم (Graceful shutdown)
```

### 2.4.2 نظام الموديولات (Module System)
**gobackend/internal/app/app.go - Module Registration:**
```
- توصيل موديولات الدومين الـ 29 تحت /api/v1
- عزل موديولات المزايا (feature module isolation)
- إعداد الوحدات المشتركة (DB pool، Redis، الإعدادات)
- حقن الاعتماديات (dependency injection) يدوياً
```

### 2.4.3 الموديولات الأساسية (Core Modules)

#### Authentication Module (`auth`)
```
- إدارة JWT tokens
- تدوير refresh tokens
- تكامل OAuth (Google)
- التحقق من قوة كلمة المرور
- آليات قفل الحساب
- الأدوار: CUSTOMER / MERCHANT / ADMIN / COURIER / CASHIER
```

#### Shop & Product Modules (`shops`, `products`, `shopBuilder`, `shopImageMap`, `gallery`, `media`)
```
- إنشاء المتاجر وتخصيصها
- إدارة كتالوج المنتجات
- تتبع المخزون
- إدارة الفئات والوسوم
- صفحات المتجر المبنية (shopBuilder) وخرائط الصور
```

#### Order & Payment Modules (`orders`, `bookings`, `reservation`, `cartEvents`, `invoice`)
```
- إدارة دورة حياة الطلب
- تكامل بوابات الدفع
- توليد الفواتير
- معالجة الاسترداد والمرتجعات
- تتبع حالة الطلب
- إطلاق الإشعارات
```

#### Courier & Delivery Module (`courier`, `map`)
```
- تسجيل الكابتنات والتحقق منهم
- خوارزميات إسناد الطلبات
- تتبع الموقع في الوقت الفعلي
- تحسين المسارات
- تأكيد التسليم
- تحليلات الأداء
```

### 2.4.4 الأنماط الأمنية (Security Patterns)

#### Authentication & Authorization
```
- مصادقة JWT عديمة الحالة (stateless)
- تحكم بالوصول حسب الدور (RBAC) بالأدوار الكبيرة حصراً
- صلاحيات دقيقة (fine-grained) حسب الحاجة
- إدارة الجلسات مع Redis
- سجل تدقيق (audit logging) للأحداث الأمنية
```

#### Data Protection
```
- التحقق من المدخلات وتنقيتها
- منع حقن SQL عبر استعلامات مُعامَلة
- حماية XSS مع CSP
- التحقق من رموز CSRF
- تشفير البيانات أثناء النقل (TLS) وعند التخزين
- حماية البيانات الشخصية (PII)
```

#### Rate Limiting & Abuse Prevention
```
- تحديد معدل متعدد المستويات (مدعوم بـ Redis)
- Throttling حسب IP
- حصص (quotas) حسب المستخدم
- حماية من DDoS
- كشف البوتات والتخفيف منها
- كشف الشذوذ
```

## 2.5 أوضاع التشغيل (Boot Modes)

### 2.5.1 وضع التشغيل الموحد (Single Binary Boot)
```
الباك إند يعمل كثنائية Go واحدة:
- نقطة الدخول: gobackend/cmd/api/main.go
- التجميع: gobackend/internal/app/app.go
- الموديولات الـ 29 تُوصَّل كلها تحت /api/v1 عند الإقلاع
```
**المراقبة بعد الإقلاع:**
- `/monitoring/live` — فحص الحياة
- `/monitoring/ready` — فحص الجاهزية
- `/metrics` — المقاييس
- `/api/v1/status` — حالة الـ API

### 2.5.2 الهجرات عند الإقلاع (Migrate on Boot)
```
- الهجرات: ملفات SQL في gobackend/migrations/ (golang-migrate)
- تُطبق تلقائياً عند الإقلاع عندما تكون DB_MIGRATE_ON_BOOT مفعّلة
- قاعدة البيانات: PostgreSQL 15 على localhost:5433
```

### 2.5.3 عامل المهام الخلفية (Background Worker)
```
- المهام الخلفية تعمل عبر asynq worker في gobackend/cmd/worker
- الطابور والكاش والجلسات على Redis 7 (localhost:6379)
```

## 2.6 تدفق الطلب (Request Flow)

### 2.6.1 Request Lifecycle
```
1. Client Request (من أحد تطبيقات apps/ الثلاثة عبر rewrite /api/:path*)
2. Fiber Application (gobackend)
3. Middleware Chain:
   - CORS Middleware
   - Security Headers (Helmet)
   - Rate Limiting (Redis)
   - Request Logging
4. Route Middleware:
   - Authentication (JWT)
   - Authorization (Role-based, أدوار كبيرة)
5. Input Validation
6. Handler (Module)
7. Service Layer
8. Repository / Database (PostgreSQL 15)
9. Response Chain (reverse order)
```

### 2.6.2 Error Handling Flow
```
1. Exception Occurs
2. Global Error Handler
3. Error Classification:
   - Validation Errors
   - Authentication Errors
   - Authorization Errors
   - Business Logic Errors
   - System Errors
4. Error Formatting
5. Response Generation
6. Logging & Monitoring
7. Client Notification
```

### 2.6.3 Authentication Flow
```
1. Login Request
2. Credential Validation
3. JWT Token Generation (role بأحرف كبيرة)
4. Refresh Token Creation
5. Response with Tokens (تُحفظ في localStorage: ray_token/token + ray_user)
6. Subsequent Requests:
   - Token Validation
   - User Context Loading
   - Authorization Check
   - Request Processing
7. Token Refresh Flow
```

## 2.7 تدفق الوسائط (Media Flow)

### 2.7.1 Upload Process
```
1. Client Upload Request
2. Pre-upload Validation:
   - File type checking
   - Size limits
   - User permissions
3. Presigned URL Generation (S3/Cloud Storage)
4. Direct Upload to Cloud Storage
5. Upload Completion Callback
6. Metadata Storage in Database
7. Thumbnail Generation
8. CDN Distribution
```

### 2.7.2 Storage Strategy
**Multi-tier Storage:**
- **Hot Storage:** Frequently accessed media (CDN)
- **Warm Storage:** Recently uploaded media (Cloud Storage)
- **Cold Storage:** Archived media (Glacier/Similar)
- **Cache Layer:** Redis cache for metadata

### 2.7.3 Image Processing Pipeline
```
1. Original Image Upload
2. Validation & Security Scanning
3. Format Optimization (WebP, AVIF)
4. Multiple Resolutions Generation
5. Quality Compression
6. Watermarking (if required)
7. CDN Distribution
8. Cache Invalidation Strategy
```

## 2.8 نظام الإشعارات (Notification System)

### 2.8.1 Notification Channels
**Multi-channel Delivery:**
- **In-App Notifications:** Real-time notifications
- **Email Notifications:** Transactional and marketing emails
- **SMS Notifications:** Critical alerts and confirmations
- **Push Notifications:** Mobile app notifications
- **Webhook Notifications:** Third-party integrations

### 2.8.2 Notification Types
**Categorized Notifications:**
- **Order Updates:** Order status changes
- **Payment Alerts:** Payment confirmations and failures
- **Delivery Updates:** Courier location and ETA
- **Promotional:** Marketing messages and offers
- **System Alerts:** Maintenance and downtime notices
- **Security Alerts:** Login attempts and password changes

### 2.8.3 Delivery Strategy
**Intelligent Delivery:**
- **User Preferences:** Channel selection per user
- **Priority Levels:** Critical, high, normal, low priority
- **Retry Logic:** Exponential backoff for failed deliveries
- **Rate Limiting:** Per-user and per-channel limits
- **Analytics:** Delivery rates and engagement metrics

## 2.9 نظام التحليلات (Analytics System)

### 2.9.1 Data Collection
**Multi-source Data:**
- **User Interactions:** Clicks, page views, session duration
- **Business Metrics:** Sales, orders, revenue
- **System Performance:** Response times, error rates
- **Courier Performance:** Delivery times, success rates
- **Market Data:** Trends, seasonal patterns

### 2.9.2 Real-time Analytics
**Live Dashboards:**
- **Order Flow:** Real-time order tracking
- **User Activity:** Concurrent users and sessions
- **System Health:** Performance metrics and alerts
- **Revenue Tracking:** Live revenue calculations
- **Geographic Data:** Location-based analytics

### 2.9.3 Batch Analytics
**Periodic Processing:**
- **Daily Reports:** End-of-day summaries
- **Weekly Trends:** Pattern analysis
- **Monthly Insights:** Business intelligence
- **Custom Reports:** On-demand analytics
- **Predictive Analytics:** AI-powered forecasting

## 2.10 قابلية التوسع (Scalability Architecture)

### 2.10.1 Horizontal Scaling
**Stateless Design:**
- **Load Balancing:** Multiple application instances
- **Database Sharding:** Data distribution across servers
- **Cache Clustering:** Redis cluster for distributed caching
- **Microservices Migration:** Gradual service decomposition
- **Container Orchestration:** Kubernetes deployment

### 2.10.2 Performance Optimization
**Caching Strategies:**
- **Application Cache:** In-memory caching
- **Database Cache:** Query result caching (Redis)
- **CDN Caching:** Static asset distribution
- **API Response Caching:** Intelligent response caching
- **Session Caching:** User session storage (Redis)

### 2.10.3 Monitoring & Scaling
**Auto-scaling Logic:**
- **Metrics-based Scaling:** CPU, memory, response time
- **Queue-based Scaling:** Background job processing (asynq)
- **Predictive Scaling:** AI-powered scaling decisions
- **Manual Scaling:** Administrative override capabilities
- **Cost Optimization:** Resource usage optimization


### 2.3.6 إعادة تنظيم الملفات الكبيرة
- تم فصل شجرة الـ routes عن `App.tsx` إلى `app/AppRoutes.tsx`.
- تم فصل helpers الخاصة بالتوجيه إلى `app/routerHelpers.tsx`.
- تم فصل route warmup logic إلى `app/routeWarmup.ts`.
- تم تقسيم الصفحة الرئيسية إلى منسّق حالة (`HomeFeed.tsx`) + أقسام UI مستقلة داخل `components/pages/public/home/`.
- التفاصيل العملية موجودة في `docs/10-frontend-structure-refactor.md`.
