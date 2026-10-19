# 3) دليل التشغيل المحلي والإعداد الشامل

## 3.1 متطلبات النظام (System Requirements)

### 3.1.1 المتطلبات الأساسية
**Hardware Requirements:**
- **RAM:** 8GB كحد أدنى، 16GB موصى به
- **Storage:** 10GB مساحة حرة على الأقل
- **Processor:** Modern multi-core processor (Intel i5/AMD Ryzen 5 أو أحدث)

**Software Requirements:**
- **Go:** الإصدار 1.25 (للباكند `gobackend/`)
- **Node.js:** الإصدار 18.x LTS أو 20.x LTS (للواجهات الأمامية وسكربتات الجذر)
- **npm:** الإصدار 9.x أو أحدث (يأتي مع Node.js)
- **Git:** للتحكم في الإصدارات
- **Docker + Docker Compose:** لتشغيل PostgreSQL وRedis محليًا
- **VS Code:** محرر الأكواد الموصى به (مع extensions المذكورة لاحقاً)

### 3.1.2 قواعد البيانات (Database Requirements)
**PostgreSQL (قاعدة البيانات الوحيدة — لا Prisma ولا SQLite):**
- **Version:** PostgreSQL 14+ أو 15+
- **Tools:** pgAdmin 4 أو DBeaver للإدارة
- **Connection:** عبر Docker Compose من داخل `gobackend/`
- **المنفذ المحلي:** `5433:5432` (حسب `gobackend/docker-compose.yml`)
- **Connection string الافتراضي:**
```bash
DATABASE_URL=postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable
```

**Redis:**
- **Version:** Redis 6.x أو 7.x
- **Use Case:** Caching, sessions, rate limiting, idempotency
- **المنفذ المحلي:** `6379:6379` (حسب `gobackend/docker-compose.yml`)
- **الإعداد عبر:** `REDIS_HOST` / `REDIS_PORT`

> لا يوجد SQLite في المشروع. أي ذكر قديم لـ `file:./dev.db` أو `schema-sqlite.prisma` محذوف وغير مدعوم.

### 3.1.3 الأدوات المساعدة (Development Tools)
**Recommended VS Code Extensions:**
```json
{
  "recommendations": [
    "golang.go",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-thunder-client"
  ]
}
```

**Browser Tools:**
- **Chrome DevTools:** للـ debugging والـ performance analysis
- **React Developer Tools:** لتطوير React

## 3.2 الإعداد الأولي للمشروع (Initial Setup)

### 3.2.1 خطوات التثبيت (Installation Steps)

**1. استنساخ المشروع:**
```bash
git clone https://github.com/Sayedtaha55/ray-eg.git
cd ray-eg
```

**2. تثبيت اعتماديات الباكند (Go):**
```bash
cd gobackend
go mod download
go version  # يجب أن يكون 1.25
```

**3. تثبيت اعتماديات الواجهات (Node — عند الحاجة):**
```bash
# من جذر المشروع
npm install
```

**4. التحقق من التثبيت:**
```bash
go version
docker --version
docker compose version
node --version
npm --version
```

### 3.2.2 إعداد البيئة (Environment Setup)

**1. ملف البيئة للباكند:**
الباكند يقرأ الإعداد من متغيرات البيئة عبر `gobackend/internal/config/config.go`، وملف `.env` مدعوم محليًا.

```bash
# gobackend/.env — مثال للتطوير المحلي
PORT=4000
HOST=0.0.0.0
APP_ENV=development
DATABASE_URL=postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET="your-32-plus-character-super-secret-jwt-key-here"
FRONTEND_APP_URL="http://localhost:5174"
CORS_ORIGIN="http://localhost:5174,http://localhost:3000"
DB_MIGRATE_ON_BOOT=true
ALLOW_DEV_MERCHANT_BOOTSTRAP=true
ALLOW_DEV_COURIER_BOOTSTRAP=true
ALLOW_DEV_CUSTOMER_BOOTSTRAP=true
```

**2. أهم المتغيرات:**
| المتغير | القيمة الافتراضية / المثال | الوصف |
|---|---|---|
| `PORT` | `4000` | منفذ Fiber |
| `HOST` | `0.0.0.0` | عنوان الاستماع |
| `APP_ENV` | `development` | بيئة التشغيل |
| `DATABASE_URL` | `postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable` | اتصال PostgreSQL |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | اتصال Redis |
| `JWT_SECRET` | (32+ حرف) | توقيع JWT HS256 |
| `FRONTEND_APP_URL` | رابط الواجهة | يستخدم في الروابط والـ CORS |
| `CORS_ORIGIN` | قائمة مفصولة بفواصل | المصادر المسموحة |
| `DB_MIGRATE_ON_BOOT` | `true` | تطبيق الهجرات عند الإقلاع |
| `ALLOW_DEV_*_BOOTSTRAP` | (للتطوير فقط) | تفعيل مسارات `dev-*-login` |

> متغيرات `ALLOW_DEV_*_BOOTSTRAP` للتطوير فقط ولا تُفعَّل في الإنتاج.

## 3.3 إعداد قاعدة البيانات (Database Setup)

### 3.3.1 PostgreSQL + Redis عبر Docker

**1. تشغيل الاعتماديات (من داخل `gobackend/`):**
```bash
cd gobackend
docker compose up -d postgres redis
```

هذا يستخدم `gobackend/docker-compose.yml`:
- بوستجريس: `5433:5432`
- رديس: `6379:6379`

**2. التحقق من الحاويات:**
```bash
docker compose ps
docker compose logs postgres
docker compose logs redis
```

**3. التحقق من الاتصال:**
```bash
# PostgreSQL
psql "postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable" -c "SELECT 1;"

# Redis
redis-cli -p 6379 ping
# يجب أن تعود بـ "PONG"
```

### 3.3.2 الهجرات (Migrations)
- الهجرات ملفات SQL مرقمة في `gobackend/migrations/` (حتى `000049_*`).
- تُطبَّق عبر golang-migrate.
- عند `DB_MIGRATE_ON_BOOT=true` تُطبَّق تلقائيًا عند إقلاع الباكند.
- التفاصيل الكاملة في `docs/06-database-guide.md`.

### 3.3.3 لا Prisma ولا SQLite
- لا يوجد `prisma generate` / `prisma studio` / `prisma client` / `schema.prisma`.
- لا يوجد `file:./dev.db`.
- كود المستودعات مكتوب يدويًا بـ pgx/v5 (مع `sqlc.yaml` اختياري).

## 3.4 تشغيل الخدمات (Running Services)

> **ملاحظة مهمة:** الباكند Go واحد (`gobackend/`) يخدم كل الواجهات. الفرونت يتصل به عبر rewrite (انظر 3.4.4).

### 3.4.1 تشغيل الواجهة الخلفية (Backend Go/Fiber) — Port 4000

**1. التشغيل المباشر:**
```bash
cd gobackend
go run ./cmd/api
```
نقطة الدخول `gobackend/cmd/api/main.go` (تحمّل `internal/config` ثم `app.New` ثم `Listen`).

**2. عبر سكربت الجذر:**
```bash
npm run go:backend:dev
```

**3. البناء والفحص داخل `gobackend/`:**
```bash
cd gobackend
make build
make test
make vet
```

**4. التحقق من عمل Backend:**
```bash
curl http://localhost:4000/monitoring/health
curl http://localhost:4000/monitoring/ready
curl http://localhost:4000/monitoring/live
curl http://localhost:4000/api/v1/status
curl http://localhost:4000/metrics
```

### 3.4.2 تشغيل Marketplace (Next.js) — Port 5174

```bash
cd apps/marketplace-next
npm run dev
```
**النتيجة:** Marketplace يعمل على `http://localhost:5174`

### 3.4.3 تشغيل Dashboard (Vite SPA) — Port 3000

```bash
cd apps/dashboard
npm run dev
```
**النتيجة:** Dashboard يعمل على `http://localhost:3000`

### 3.4.4 اتصال الفرونت بالباك (Rewrite)
الفرونت يتصل بالباك عبر rewrite:
```
/api/:path* → http://localhost:4000
```
انظر `apps/dashboard-web/next.config.mjs`.

أي أن طلب `GET /api/v1/shops/me` من الفرونت يُحوَّل تلقائيًا إلى `http://localhost:4000/api/v1/shops/me`.

### 3.4.5 التشغيل المتزامن (Concurrent Development)

```bash
# Terminal 1: الاعتماديات
cd gobackend
docker compose up -d postgres redis

# Terminal 2: Backend
cd gobackend
go run ./cmd/api
# أو من الجذر: npm run go:backend:dev

# Terminal 3: Marketplace
cd apps/marketplace-next && npm run dev

# Terminal 4: Dashboard
cd apps/dashboard && npm run dev
```

### 3.4.6 جدول البورتات (Port Reference)

| الخدمة | البورت | المسار | الأمر |
|---|---|---|---|
| Backend (Go/Fiber) | 4000 | `gobackend/` | `go run ./cmd/api` أو `npm run go:backend:dev` |
| PostgreSQL | 5433 (مضيف) → 5432 (حاوية) | `gobackend/docker-compose.yml` | `docker compose up -d postgres` |
| Redis | 6379 | `gobackend/docker-compose.yml` | `docker compose up -d redis` |
| Marketplace | 5174 | `apps/marketplace-next/` | `npm run dev` (من داخل المجلد) |
| Dashboard | 3000 | `apps/dashboard/` | `npm run dev` (من داخل المجلد) |
| Electron | — | `electron/` | `npm run electron:dev` |

## 3.5 أوضاع التشغيل (Boot Modes)

### 3.5.1 الإقلاع القياسي
```bash
cd gobackend
DB_MIGRATE_ON_BOOT=true go run ./cmd/api
```
- تُطبَّق الهجرات تلقائيًا.
- تُجمَّع كل الدومينات الـ 29 تحت `/api/v1` (انظر `docs/04-backend-guide.md`).

### 3.5.2 وضع التطوير مع مسارات dev-login
```bash
ALLOW_DEV_MERCHANT_BOOTSTRAP=true ALLOW_DEV_COURIER_BOOTSTRAP=true ALLOW_DEV_CUSTOMER_BOOTSTRAP=true go run ./cmd/api
```
يُفعِّل:
- `POST /api/v1/auth/dev-merchant-login`
- `POST /api/v1/auth/dev-courier-login`
- `POST /api/v1/auth/dev-customer-login`

> للتطوير فقط. لا تُفعَّل في الإنتاج.

### 3.5.3 ملاحظة عن الأوضاع القديمة
- لا يوجد `MINIMAL_BOOT` ولا `BOOT_MODULES` ولا `backend:dev:auth` ولا `backend:dev:shop-product`.
- الباكند Go يُقلع كاملًا دائمًا (كل الدومينات الـ 29 + المراقبة).

## 3.6 الأوامر والفحوصات الهامة (Essential Commands)

### 3.6.1 فحص الباكند (Go)
```bash
cd gobackend
make vet
go vet ./...
gofmt -l .
```

### 3.6.2 Testing
```bash
cd gobackend
make test
go test ./...

# اختبارات الواجهات (حسب كل تطبيق)
npm run test:frontend
npm run test:e2e
```

### 3.6.3 Code Quality (Frontend)
```bash
# فحص ESLint
npm run lint

# إصلاح ESLint تلقائياً
npm run lint:fix

# فحص Prettier
npm run format:check

# تنسيق الكود تلقائياً
npm run format:write
```

### 3.6.4 Build Commands
```bash
# بناء الباكند
cd gobackend
make build

# بناء الواجهة الأمامية
npm run build

# بناء للإنتاج
npm run build:production
```

### 3.6.5 Database Commands (بدون Prisma)
```bash
# تشغيل الاعتماديات
cd gobackend
docker compose up -d postgres redis

# الهجرات تُطبَّق تلقائيًا عند الإقلاع عند DB_MIGRATE_ON_BOOT=true
go run ./cmd/api

# فحص ملفات الهجرات
ls migrations/ | tail -20
```

> لا تستخدم: `prisma generate` / `prisma:push` / `prisma studio` / `prisma migrate` — كلها محذوفة.

## 3.7 سير العمل اليومي (Daily Workflow)

### 3.7.1 بداية اليوم
```bash
# 1. تحديث الكود
git pull origin main

# 2. تشغيل الاعتماديات
cd gobackend
docker compose up -d postgres redis

# 3. تحديث اعتماديات Go
go mod download

# 4. تشغيل الباكند
go run ./cmd/api
```

### 3.7.2 أثناء التطوير
```bash
# 1. فحص Go
make vet

# 2. تشغيل الاختبارات
make test

# 3. فحص الفرونت
npm run lint
npm run typecheck
```

### 3.7.3 نهاية اليوم
```bash
# 1. فحص شامل للباكند
cd gobackend
make vet
make test

# 2. بناء الباكند
make build

# 3. commit التغييرات
git add .
git commit -m "Daily work completed"

# 4. push التغييرات
git push origin main
```

## 3.8 حل المشاكل الشائعة (Common Issues)

### 3.8.1 مشاكل التثبيت
**Problem:** `go mod download` يفشل
```bash
# الحل 1: تنظيف كاش الموديولات
go clean -modcache

# الحل 2: إعادة التحميل
go mod download
go mod tidy
```

**Problem:** `npm install` يفشل (للفرونت)
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 3.8.2 مشاكل قاعدة البيانات
**Problem:** فشل الاتصال بقاعدة البيانات
```bash
# التحقق من الحاويات
cd gobackend
docker compose ps

# إعادة تشغيل postgres
docker compose restart postgres

# التحقق من DATABASE_URL
echo $DATABASE_URL
# يجب أن تكون: postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable
```

**Problem:** المنفذ 5432 مشغول بنسخة محلية
- المشروع يستخدم `5433` على المضيف عمدًا لتفادي التعارض. لا تغيّره إلى `5432` إلا إذا أوقفت النسخة المحلية.

### 3.8.3 مشاكل التشغيل
**Problem:** Port conflicts (4000)
```bash
# البحث عن العمليات التي تستخدم الـ ports (Windows PowerShell)
netstat -ano | findstr :4000

# أو تغيير الـ PORT في .env
PORT=4001
```

**Problem:** CORS errors
```bash
# التحقق من إعدادات CORS في .env (gobackend)
CORS_ORIGIN="http://localhost:5174,http://localhost:3000"
FRONTEND_APP_URL="http://localhost:5174"
```

**Problem:** `JWT_SECRET` قصير
- يجب أن يكون 32+ حرف. راجع `internal/config/config.go` لرسالة الخطأ.

## 3.9 أدوات التطوير المتقدمة (Advanced Development Tools)

### 3.9.1 Docker Development
```bash
cd gobackend
# تشغيل الاعتماديات فقط (الوضع المدعوم)
docker compose up -d postgres redis

# إيقاف
docker compose down
```

### 3.9.2 المراقبة المحلية
```bash
curl http://localhost:4000/monitoring/live
curl http://localhost:4000/monitoring/ready
curl http://localhost:4000/monitoring/health
curl http://localhost:4000/metrics
curl http://localhost:4000/api/v1/status
```

### 3.9.3 Load Testing
```bash
# تثبيت k6 للـ load testing
npm install -g k6

# تشغيل load test
k6 run scripts/load-test.js
```

## 3.10 التحقق من النجاح (Success Checklist)

### 3.10.1 Installation Checklist
- [ ] Go 1.25 مثبت (`go version`)
- [ ] Docker + Compose يعملان
- [ ] Node.js 18+ أو 20+ مثبت (للفرونت)
- [ ] المشروع مستنسخ بنجاح
- [ ] `go mod download` نجح داخل `gobackend/`
- [ ] ملف `.env` (gobackend) معد بشكل صحيح

### 3.10.2 Database Checklist
- [ ] حاويتا postgres وredis تعملان (`docker compose ps`)
- [ ] `DATABASE_URL` صحيح (منفذ 5433)
- [ ] الهجرات طُبقت (`DB_MIGRATE_ON_BOOT=true` ولا أخطاء عند الإقلاع)
- [ ] لا توجد أي إشارة لـ Prisma أو SQLite

### 3.10.3 Backend Checklist
- [ ] Backend يعمل على البورت الصحيح (4000)
- [ ] `/monitoring/live` و`/monitoring/ready` و`/monitoring/health` تعمل
- [ ] `/metrics` و`/api/v1/status` تستجيب
- [ ] API endpoints تستجيب (`/api/v1/*`)
- [ ] Authentication تعمل (signup/login/me)
- [ ] لا توجد أخطاء في الـ console
- [ ] صيغة الأخطاء موحدة `{success:false, error, message, fields?}`

### 3.10.4 Frontend Checklist
- [ ] Frontend يعمل على البورت الصحيح (5174 / 3000)
- [ ] الصفحة الرئيسية تعرض بشكل صحيح
- [ ] Routing يعمل بين الصفحات
- [ ] API calls تعمل عبر rewrite `/api/:path*` → `http://localhost:4000` بدون أخطاء CORS
- [ ] لا توجد أخطاء في browser console

### 3.10.5 Integration Checklist
- [ ] Frontend يتصل بـ Backend بنجاح عبر الـ rewrite
- [ ] Authentication flow يعمل بالكامل (JWT HS256)
- [ ] Data flow بين الواجهتين يعمل
- [ ] Error handling يعمل بشكل صحيح (صيغة موحدة)
- [ ] Performance مقبولة للتطوير

## 3.11 النصائح والحيل (Tips & Tricks)

### 3.11.1 Development Tips
- استخدم `cd gobackend && go run ./cmd/api` لتشغيل Backend
- أو استخدم `npm run go:backend:dev` من الجذر
- استخدم `docker compose up -d postgres redis` من داخل `gobackend/` قبل الإقلاع
- استخدم `make build` / `make test` / `make vet` داخل `gobackend/`
- راجع `apps/dashboard-web/next.config.mjs` لفهم الـ rewrite
- **لا تستخدم** أوامر NestJS القديمة (`backend:dev:stable`, `backend:dev:auth`...) — محذوفة
- **لا تستخدم** أوامر Prisma (`prisma:generate`, `prisma:studio`...) — محذوفة

### 3.11.2 Performance Tips
- استخدم `make vet` للكشف عن الأخطاء مبكراً
- استخدم Redis للكاش (عبر `REDIS_HOST`/`REDIS_PORT`)

### 3.11.3 Debugging Tips
- افحص `/monitoring/health` أولًا عند أي عطل
- افحص سجلات Fiber (Logger middleware) مع `APP_ENV=development`
- افحص اتصال PostgreSQL (منفذ 5433) وRedis (منفذ 6379) قبل اتهام الكود
