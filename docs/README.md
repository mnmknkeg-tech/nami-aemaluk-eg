
# 💎 Ray - Hyper-Modern Marketplace Platform

[English](#english) | [العربية](#arabic)

---

<a name="arabic"></a>
## 🇪🇬 الرؤية (باللغة العربية)

**Ray (تست)** هو مشروع طموح يهدف إلى إعادة تعريف تجربة التسوق في مصر. المنصة ليست مجرد متجر إلكتروني، بل هي نظام بيئي متكامل يربط بين المحلات التجارية والمطاعم والعملاء باستخدام أحدث تقنيات الذكاء الاصطناعي والويب المكاني (Spatial Web).

### 🚀 المميزات الرئيسية:
- **نظام POS متكامل:** تحويل أي هاتف ذكي إلى نقطة بيع ذكية للمحلات والمطاعم
- **مصمم الصفحات (Page Builder):** تمكين أصحاب الأعمال من تصميم هويتهم الخاصة بأسلوب السحب والإفلات
- **مساعد ذكي (Ray Assistant):** مساعد بحث مدعوم بـ Google Gemini للوصول لأفضل العروض الحقيقية
- **نظام حجز ذكي:** حجز العروض والمنتجات واستلامها من الفرع لضمان التوافر
- **تحليلات متقدمة:** لوحة تحكم للتجار تعرض المبيعات، الزيارات، وتوقعات النمو
- **نظام توصيل ذكي:** إدارة الطلبات والتوصيل مع كابتنات النظام
- **نظام عروض ترويجي:** إنشاء وإدارة العروض والخصومات
- **دفعات إلكترونية:** تكامل مع بوابات الدفع المصرية والدولية

### 🛠 التقنيات المستخدمة:

**المعمارية:** Monorepo بثلاثة تطبيقات Next.js + باك إند Go واحد

**التطبيق الأول — marketplace-next (المتجر):**
- Next.js (App Router) مع SSR لتحسين SEO
- React, TypeScript, Tailwind CSS
- المسار: `apps/marketplace-next/`

**التطبيق الثاني — dashboard-web (لوحة التحكم):**
- Next.js + TypeScript + Tailwind CSS
- المسار: `apps/dashboard-web/`

**التطبيق الثالث — business (بوابة التجار):**
- Next.js + TypeScript + Tailwind CSS
- المسار: `apps/business/`

**الربط بالباك إند (ينطبق على التطبيقات الثلاثة):**
- كل تطبيق يعمل rewrite للمسار `/api/:path*` إلى `BACKEND_URL` (الافتراضي `http://localhost:4000`) — انظر `apps/*/next.config.mjs`
- المصادقة في المتصفح: `localStorage` (`ray_user` / `ray_token` / `token`) + كوكي `ray_session`
- الدخول التجريبي للتطوير عبر صفحة `/admin/gate` (تظهر فقط خارج الإنتاج)

**الـ Backend والـ Database:**
- **Backend:** Go 1.25 + Fiber v2.52.5 في `gobackend/` (الموديول `github.com/Sayedtaha55/ray-eg/gobackend`)
- نقطة الدخول `gobackend/cmd/api/main.go` والتجميع `gobackend/internal/app/app.go`
- **29 موديول دومين** تحت `/api/v1` + المراقبة (`/monitoring/live` و`/monitoring/ready` و`/metrics` و`/api/v1/status`)
- **Database:** PostgreSQL 15 عبر Docker على `localhost:5433` — الهجرات SQL بـ golang-migrate في `gobackend/migrations/` وتُطبق عند الإقلاع (`DB_MIGRATE_ON_BOOT`)
- **Cache:** Redis 7 على `localhost:6379` (كاش + جلسات + تحديد معدل + مهام asynq الخلفية في `gobackend/cmd/worker`)
- **Authentication:** JWT بالأدوار `CUSTOMER`/`MERCHANT`/`ADMIN`/`COURIER`/`CASHIER` (أحرف كبيرة)
- **ملاحظة:** باك NestJS القديم حُذف بتاريخ 2026-08-24 وبقي فقط في `_archive/` — لا Prisma ولا SQLite

### 📊 نماذج الأعمال المدعومة:
- **متاجر إلكترونية:** منتجات متنوعة مع إدارة المخزون
- **مطاعم ومقاهي:** قوائم طعام وحجوزات طاولات
- **صيدليات:** وصفات طبية وحجوزات استشارات
- **عيادات ومستشفيات:** مواعيد وحجوزات طبية
- **وكالات سيارات:** عرض السيارات وحجوزات تجارب القيادة
- **فنادق وشقق مفروشة:** حجوزات إقامة وإدارة الممتلكات
- **خدمات متنوعة:** أي خدمة يمكن حجزها أو تقديمها عبر الإنترنت

---

<a name="english"></a>
## 🌍 Vision (English)

**Ray (Test)** is an ambitious project aimed at redefining the shopping experience in Egypt. The platform is not just an e-commerce store but a comprehensive ecosystem connecting retail shops, restaurants, and customers through AI and Spatial Web technologies.

### 🚀 Key Features:
- **Integrated POS System:** Turns any smartphone into a smart Point of Sale for merchants
- **Dynamic Page Builder:** Allows business owners to design their custom storefronts with ease
- **AI Assistant (Ray Assistant):** A Google Gemini-powered search tool to find real-time deals
- **Smart Reservation System:** Reserve products online and pick them up in-store
- **Advanced Analytics:** A merchant dashboard displaying sales, visits, and growth insights
- **Smart Delivery System:** Order management and delivery with system couriers
- **Promotional Offers:** Create and manage deals and discounts
- **Electronic Payments:** Integration with Egyptian and international payment gateways

### 🛠 Tech Stack:

**Architecture:** Monorepo with three Next.js apps + one Go backend

**App 1 — marketplace-next (Store):**
- Next.js (App Router) with SSR for SEO
- React, TypeScript, Tailwind CSS
- Path: `apps/marketplace-next/`

**App 2 — dashboard-web (Control panel):**
- Next.js + TypeScript + Tailwind CSS
- Path: `apps/dashboard-web/`

**App 3 — business (Merchant portal):**
- Next.js + TypeScript + Tailwind CSS
- Path: `apps/business/`

**Backend binding (applies to all three apps):**
- Each app rewrites `/api/:path*` to `BACKEND_URL` (default `http://localhost:4000`) — see `apps/*/next.config.mjs`
- Browser auth: `localStorage` (`ray_user` / `ray_token` / `token`) + `ray_session` cookie
- Dev demo login via `/admin/gate` (visible only outside production)

**Backend & Database:**
- **Backend:** Go 1.25 + Fiber v2.52.5 in `gobackend/` (module `github.com/Sayedtaha55/ray-eg/gobackend`)
- Entry point `gobackend/cmd/api/main.go`, assembly in `gobackend/internal/app/app.go`
- **29 domain modules** under `/api/v1` + monitoring (`/monitoring/live`, `/monitoring/ready`, `/metrics`, `/api/v1/status`)
- **Database:** PostgreSQL 15 via Docker on `localhost:5433` — SQL migrations with golang-migrate in `gobackend/migrations/`, applied at boot (`DB_MIGRATE_ON_BOOT`)
- **Cache:** Redis 7 on `localhost:6379` (cache + sessions + rate limiting + asynq background jobs in `gobackend/cmd/worker`)
- **Authentication:** JWT with roles `CUSTOMER`/`MERCHANT`/`ADMIN`/`COURIER`/`CASHIER` (uppercase)
- **Note:** the old NestJS backend was deleted on 2026-08-24 and lives only in `_archive/` — no Prisma, no SQLite

### 📊 Supported Business Models:
- **E-commerce Stores:** Various products with inventory management
- **Restaurants & Cafes:** Menus and table reservations
- **Pharmacies:** Prescriptions and consultation bookings
- **Clinics & Hospitals:** Appointments and medical bookings
- **Car Dealerships:** Vehicle displays and test drive reservations
- **Hotels & Furnished Apartments:** Accommodation bookings and property management
- **Various Services:** Any service that can be booked or offered online

---

## 📚 Comprehensive Project Documentation

A detailed, AI-friendly Arabic documentation set is available under [`docs/`](./01-project-overview.md), with structured references for:

### 📖 Documentation Structure:
1. **[01-project-overview.md](./01-project-overview.md)** - نظرة عامة شاملة على المشروع
2. **[02-architecture.md](./02-architecture.md)** - المعمارية الفنية والتقنية
3. **[03-setup-and-run.md](./03-setup-and-run.md)** - إعداد وتشغيل المشروع محلياً
4. **[04-backend-guide.md](./04-backend-guide.md)** - دليل شامل للواجهة الخلفية
5. **[05-frontend-guide.md](./05-frontend-guide.md)** - دليل شامل للواجهة الأمامية
6. **[06-database-guide.md](./06-database-guide.md)** - دليل قاعدة البيانات و Prisma
7. **[07-deployment-operations.md](./07-deployment-operations.md)** - النشر والتشغيل الإنتاجي
8. **[08-api-map.md](./08-api-map.md)** - خريطة الـ API والوحدات
9. **[09-troubleshooting.md](./09-troubleshooting.md)** - استكشاف الأعطال وإصلاحها

### 🎯 Key Documentation Features:
- **AI-Friendly:** Designed for AI model comprehension
- **Comprehensive:** Covers all aspects of development and deployment
- **Practical:** Includes code examples and real-world scenarios
- **Up-to-Date:** Reflects current project state and best practices
- **Bilingual:** Arabic primary with English sections where needed

---

## 🛠 How to run locally / كيف تشغل المشروع محلياً

### 📋 Prerequisites / المتطلبات الأساسية:
- Go 1.25+
- Node.js 20+
- Docker (لتشغيل PostgreSQL 15 و Redis 7)
- Git

### 1️⃣ Services / الخدمات:
```bash
# PostgreSQL 15 على localhost:5433 (يوزر ray_user)
# Redis 7 على localhost:6379
# راجع gobackend/docker-compose.yml وملف gobackend/.env.example
```

سلسلة الاتصال:
```
postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable
```

### 2️⃣ Environment Variables / متغيرات البيئة:
```bash
# Backend (Go) — راجع gobackend/.env.example
# DB_MIGRATE_ON_BOOT=true  (لتطبيق هجرات golang-migrate عند الإقلاع)

# Frontend (تطبيقات apps/* الثلاثة)
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 3️⃣ Start Backend / تشغيل الواجهة الخلفية:
- نقطة الدخول: `gobackend/cmd/api/main.go` (التجميع في `gobackend/internal/app/app.go`)
- الهجرات من `gobackend/migrations/` تُطبق تلقائياً عند الإقلاع عندما تكون `DB_MIGRATE_ON_BOOT` مفعّلة
- عامل المهام الخلفية: `gobackend/cmd/worker` (asynq + Redis)

### 4️⃣ Start Frontend / تشغيل الواجهة الأمامية:
- التطبيقات الثلاثة في `apps/`: `marketplace-next` (المتجر)، `dashboard-web` (لوحة التحكم)، `business` (بوابة التجار)
- كل تطبيق يحوّل `/api/:path*` إلى `BACKEND_URL` عبر `apps/*/next.config.mjs` — كود المتصفح ينادي مسارات `/api/...` نسبية فقط

### 5️⃣ Verify Installation / التحقق من التثبيت:
```bash
# Backend status and health
curl http://localhost:4000/api/v1/status
curl http://localhost:4000/monitoring/live
```

---

## 🚀 Development Workflow / سير العمل التطوير

### 📁 Project Structure / هيكل المشروع:
```
ray-eg/
├── apps/                   # Frontend apps (Next.js)
│   ├── marketplace-next/  # المتجر
│   ├── dashboard-web/     # لوحة التحكم
│   └── business/          # بوابة التجار
├── gobackend/              # Backend الوحيد (Go 1.25 + Fiber v2.52.5)
│   ├── cmd/api/main.go    # نقطة الدخول
│   ├── cmd/worker/        # عامل المهام الخلفية (asynq)
│   ├── internal/app/      # تجميع التطبيق
│   ├── internal/domains/  # دومينات الـ 29
│   └── migrations/        # هجرات SQL (golang-migrate)
├── _archive/               # كود NestJS القديم (مرجع فقط — لا يُستخدم)
├── docs/                   # Documentation
└── scripts/                # Build and deployment scripts
```

### 🎨 Frontend Development / تطوير الواجهة الأمامية:
- **Component Architecture:** Atomic Design pattern
- **State Management:** Redux Toolkit + React Query
- **Routing:** Next.js App Router with lazy loading
- **Backend Binding:** Relative `/api/...` calls, rewritten to `BACKEND_URL` via `apps/*/next.config.mjs`
- **Browser Auth:** `localStorage` (`ray_user` / `ray_token` / `token`) + `ray_session` cookie — dev demo login at `/admin/gate` (non-production only)
- **Styling:** Tailwind CSS with custom theme
- **Forms:** React Hook Form with validation

### 🔧 Backend Development / تطوير الواجهة الخلفية:
- **Framework:** Go 1.25 + Fiber v2.52.5
- **Database:** PostgreSQL 15 + golang-migrate SQL migrations (no Prisma, no SQLite)
- **Authentication:** JWT with uppercase roles (`CUSTOMER`/`MERCHANT`/`ADMIN`/`COURIER`/`CASHIER`)
- **Background Jobs:** asynq worker in `gobackend/cmd/worker` (Redis 7)
- **Monitoring:** `/monitoring/live`, `/monitoring/ready`, `/metrics`, `/api/v1/status`

---

## 📊 Performance & Scaling / الأداء والتوسع

### ⚡ Performance Optimizations / تحسينات الأداء:
- **Frontend:** Code splitting, lazy loading, image optimization
- **Backend:** Database indexing, query optimization, Redis caching
- **Database:** Connection pooling, read replicas
- **Network:** CDN, compression, HTTP/2

### 🔄 Scaling Strategy / استراتيجية التوسع:
- **Horizontal Scaling:** Load balancers + multiple instances
- **Database Scaling:** Read replicas + sharding
- **Cache Strategy:** Redis cluster + CDN
- **Monitoring:** Application performance monitoring (APM)

---

## 🚀 Deployment / النشر

### 🌐 Production Deployment / النشر الإنتاجي:
- **Frontend:** تطبيقات Next.js الثلاثة (Marketplace / Dashboard / Business)
- **Backend:** ثنائية Go من `gobackend/` (API + worker)
- **Database:** Managed PostgreSQL 15
- **Cache:** Managed Redis 7
- **Storage:** AWS S3 or similar

### 📋 Deployment Checklist / قائمة التحقق للنشر:
- [ ] Environment variables configured
- [ ] Database migrations applied (`gobackend/migrations/`)
- [ ] SSL certificates installed
- [ ] Health checks configured (`/monitoring/live`, `/monitoring/ready`)
- [ ] Monitoring set up (`/metrics`)
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit performed

---

## 🔧 Configuration / الإعدادات

### 🌍 Environment Variables / متغيرات البيئة:
```bash
# Backend (Go 1.25 + Fiber) — راجع gobackend/.env.example
PORT=4000

# Database — PostgreSQL 15 على localhost:5433
DATABASE_URL="postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable"
DB_MIGRATE_ON_BOOT=true

# Security — JWT بأدوار كبيرة: CUSTOMER/MERCHANT/ADMIN/COURIER/CASHIER
JWT_SECRET="your-super-secure-jwt-secret"
BCRYPT_ROUNDS=12

# Frontend — عنوان الباك إند الذي يستخدمه الـ rewrite في apps/*/next.config.mjs
BACKEND_URL="http://localhost:4000"
NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"

# Cache — Redis 7 على localhost:6379
REDIS_URL="redis://localhost:6379"

# AI Services
GEMINI_API_KEY="your-gemini-api-key"

# Email
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

### 🔐 Security Configuration / إعدادات الأمان:
- **Authentication:** JWT with refresh tokens (uppercase roles)
- **Authorization:** Role-based access control (RBAC)
- **Input Validation:** Comprehensive input validation
- **Rate Limiting:** API rate limiting (Redis-backed)
- **CORS:** Proper CORS configuration
- **HTTPS:** SSL/TLS encryption

---

## 🧪 Testing / الاختبار

### 📋 Test Types / أنواع الاختبارات:
- **Unit Tests:** Component and function testing
- **Integration Tests:** API and database testing
- **E2E Tests:** Full application testing
- **Performance Tests:** Load and stress testing
- **Security Tests:** Vulnerability scanning

---

## 📊 Monitoring & Analytics / المراقبة والتحليلات

### 📈 Application Monitoring / مراقبة التطبيق:
- **Health Checks:** `/monitoring/live` و`/monitoring/ready` و`/api/v1/status`
- **Performance Metrics:** `/metrics` — response times, error rates
- **Business Metrics:** User activity, conversion rates
- **System Metrics:** CPU, memory, disk usage

### 📊 Analytics Dashboard / لوحة التحليلات:
- **User Analytics:** Registration, engagement, retention
- **Business Analytics:** Sales, revenue, growth
- **Performance Analytics:** Page speed, API performance
- **Error Analytics:** Error rates, common issues

---

## 🤝 Contributing / المساهمة

### 📋 How to Contribute / كيف تساهم:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### 📝 Code Standards / معايير الكود:
- **TypeScript:** Strict mode enabled (frontend)
- **Go:** gofmt + vet clean (backend)
- **ESLint:** Configured with recommended rules
- **Prettier:** Code formatting
- **Husky:** Git hooks for quality checks

---

## 📞 Support & Contact / الدعم والتواصل

### 🆘 Getting Help / الحصول على المساعدة:
- **Documentation:** Check the comprehensive docs in `/docs`
- **Issues:** Report bugs on GitHub Issues
- **Discussions:** Join our GitHub Discussions
- **Email:** Contact our support team

### 📧 Contact Information / معلومات الاتصال:
- **Email:** support@ray-eg.com
- **Website:** https://mnmknk.com
- **GitHub:** https://github.com/Sayedtaha55/ray-eg

---

## 📄 License / الرخصة

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Created with ❤️ by Ray Engineering Team*

**🎯 Mission:** To revolutionize the shopping experience in Egypt through innovative technology and exceptional user experience.

**🔮 Vision:** To become the leading marketplace platform in Egypt, empowering local businesses and delighting customers with cutting-edge technology.
