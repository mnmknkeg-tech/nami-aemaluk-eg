# 7) دليل النشر والتشغيل الإنتاجي الشامل

## 7.1 نموذج النشر (Deployment Model)

### 7.1.1 بنية النشر الموصى بها
```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (CDN)                      │
│                   (Cloudflare/AWS CloudFront)             │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Frontend (3 × Next.js Apps)              │
│         marketplace-next / dashboard-web / business     │
│                   (Vercel/Netlify/CloudFront)           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Backend API (Go 1.25 + Fiber)            │
│                   (Back4app/DigitalOcean/AWS)             │
│                   المصدر: `gobackend/` فقط              │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Database (PostgreSQL)                      │
│                   (Managed/Cloud/On-Premise)             │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Cache Layer (Redis)                        │
│                   (Managed/Cloud/On-Premise)             │
└─────────────────────────────────────────────────────────────┘
```

> الباك الوحيد المعتمد هو Go 1.25 + Fiber في `gobackend/`. باك NestJS القديم حُذف بتاريخ 2026-08-24 وبقاياه في `_archive/` فقط — لا يُستخدم في أي نشر.

### 7.1.2 الخدمات المفصولة
**Frontend (ثلاثة تطبيقات Next.js):**
- **apps/marketplace-next** (السوق العام، SEO)
- **apps/dashboard-web** (لوحات التاجر/الإدارة/المندوب + صفحة `/admin/gate` للدخول التجريبي)
- **apps/business** (موقع الأعمال/الهبوط)
- الاستضافة: **Vercel** (موصى به لـ Next.js) / Netlify / CloudFront+S3 / Cloudflare Pages

**Backend API (Go + Fiber):**
- **Back4app Containers** (موصى به)
- **DigitalOcean** (بديل اقتصادي)
- **AWS EC2/ECS** أو **Google Cloud Run**
- الصور: `gobackend/Dockerfile` للـ API و`Dockerfile.worker` للـ worker (بناء متعدد المراحل)

**Database:**
- **Supabase PostgreSQL** (موصى به)
- **AWS RDS** / **Neon** / **Supabase**

**Cache Layer:**
- **Upstash Redis** (موصى به)
- **Redis Cloud** / **AWS ElastiCache** / **Upstash**

## 7.2 أوامر البناء (Build Commands)

### 7.2.1 بناء الواجهات الأمامية (ثلاثة تطبيقات Next.js)
```bash
# من الجذر — سكربتات التشغيل/البناء لكل تطبيق
npm run dev:marketplace      # marketplace-next (dev)
npm run dev:dashboard-web    # dashboard-web (dev)
npm run dev:business         # business (dev)
npm run dev:all              # تشغيل الثلاثة معًا
npm run go:backend:dev       # تشغيل باك Go في وضع التطوير

# بناء للإنتاج (من داخل كل تطبيق أو عبر سكربت الجذر)
cd apps/marketplace-next && npm run build && npm run start
cd apps/dashboard-web && npm run build && npm run start
cd apps/business && npm run build && npm run start
```

### 7.2.2 بناء الواجهة الخلفية (Go + Fiber)
```bash
# من داخل gobackend/
go build ./...                 # التحقق من البناء
go build -o api ./cmd/api      # بناء ثنائية الـ API
go build -o worker ./cmd/worker # بناء ثنائية الـ worker
go vet ./...                   # فحص ثابت
go test ./...                  # الاختبارات

# بناء صور Docker متعددة المراحل
docker build -f gobackend/Dockerfile -t ray-api:latest gobackend/
docker build -f gobackend/Dockerfile.worker -t ray-worker:latest gobackend/
```

### 7.2.3 التشغيل المحلي للباك (المصدر الوحيد)
```bash
# من داخل gobackend/
docker compose up -d postgres redis
go run ./cmd/api
# الباك يعمل على المنفذ 4000

# التحقق
curl http://localhost:4000/monitoring/ready
curl http://localhost:4000/api/v1/status
```

## 7.3 تشغيل الخادم في الإنتاج

### 7.3.1 إعداد البيئة للإنتاج
```bash
# gobackend/.env.production (انسخ من gobackend/.env.production.example)
APP_ENV=production
PORT=4000

# قاعدة البيانات
DATABASE_URL="postgresql://user:password@host:5432/database"

# الأمان — إلزامية في الإنتاج
JWT_SECRET="قيمة-عشوائية-طويلة-32-حرف-على-الأقل-وغير-الافتراضية"
ADMIN_BOOTSTRAP_TOKEN="قيمة-غير-الافتراضية"
CSRF_DISABLED=false

# CORS والواجهات — ممنوع استخدام * في الإنتاج
CORS_ORIGIN="https://mnmknk.com,https://www.mnmknk.com"
FRONTEND_URL="https://mnmknk.com"
FRONTEND_APP_URL="https://mnmknk.com"

# Redis — واحد منهما إلزامي
REDIS_URL="redis://host:6379"
# أو REDIS_HOST + REDIS_PORT

# ملفات المثال المرجعية
# gobackend/.env.example
# gobackend/.env.production.example
```

> الدخول التجريبي (`dev-*-login`) يعمل فقط عندما `APP_ENV=development` ومع `ALLOW_DEV_*_BOOTSTRAP=true` — ممنوع في الإنتاج.

### 7.3.2 إعداد Health Checks (باك Go)
```bash
# فحوص الصحة الحقيقية للباك
curl http://localhost:4000/monitoring/live   # هل العملية حية؟
curl http://localhost:4000/monitoring/ready  # هل جاهز (DB + Redis)؟
curl http://localhost:4000/metrics           # مقاييس Prometheus
curl http://localhost:4000/api/v1/status     # حالة الـ API
```

```go
// داخليًا: internal/app يربط مسارات المراقبة قبل مسارات /api/v1
// GET /monitoring/live  -> 200 {success:true,...}
// GET /monitoring/ready -> 200 فقط إذا DB وRedis متصلان، وإلا 503
// GET /metrics          -> Prometheus exposition format
```

### 7.3.3 الإيقاف المرتب (Graceful Shutdown)
```go
// باك Go/Fiber يستخدم الإيقاف المرتب عبر fiber.Shutdown():
// - إيقاف قبول اتصالات جديدة
// - انتظار الطلبات الجارية حتى تكتمل (مهلة)
// - إغلاق مجمع اتصالات PostgreSQL (pgxpool.Close)
// - إغلاق عميل Redis
app.Hooks().OnShutdown(func() error {
    // إغلاق DB وRedis هنا
    return nil
})
// تُستقبل إشارتا SIGTERM/SIGINT من منسّق الحاويات (Docker/K8s).
```

## 7.4 متغيرات البيئة الحرجة للإنتاج

### 7.4.1 متغيرات إلزامية (الإنتاج لن يعمل بأمان بدونها)
```bash
APP_ENV=production
PORT=4000
DATABASE_URL="postgresql://username:password@host:5432/database"

# إلزامية — افشل الإقلاع إن كانت ناقصة/افتراضية:
JWT_SECRET="32-حرف-على-الأقل-وغير-القيمة-الافتراضية"
ADMIN_BOOTSTRAP_TOKEN="غير-القيمة-الافتراضية"
CSRF_DISABLED=false
CORS_ORIGIN="https://mnmknk.com"   # بدون * إطلاقًا
REDIS_URL="redis://host:6379"           # أو REDIS_HOST
```

### 7.4.2 متغيرات الخدمات الخارجية
```bash
# Google Services
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# AI Services
GEMINI_API_KEY="your-gemini-api-key"

# Email Services
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"

# الدخول التجريبي — للتطوير فقط، ممنوع في الإنتاج
# APP_ENV=development
# ALLOW_DEV_MERCHANT_BOOTSTRAP=true
# ALLOW_DEV_ADMIN_BOOTSTRAP=true
```

### 7.4.3 متغيرات التخزين والملفات
```bash
# S3 (اختياري — تحذير "s3 client not available" تحذير فقط، الوسائط تعمل محليًا)
AWS_S3_BUCKET="your-s3-bucket"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
AWS_REGION="us-east-1"

# التخزين المحلي
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760"  # 10MB

# CDN
CDN_URL="https://cdn.mnmknk.com"
```

## 7.5 صحة الخدمة والمراقبة (Health & Monitoring)

### 7.5.1 Health Endpoints (الحقيقية في باك Go)
```bash
GET /monitoring/live    # حياة العملية
GET /monitoring/ready   # الجاهزية (DB + Redis)
GET /metrics            # مقاييس Prometheus
GET /api/v1/status      # حالة الـ API
```

### 7.5.2 صيغة الأخطاء الموحدة
```json
// كل أخطاء الباك بهذه الصيغة:
{ "success": false, "error": "insufficient_role", "message": "ليس لديك صلاحية للوصول" }
```

### 7.5.3 نظام التنبيه
```bash
# راقب هذه المؤشرات في الإنتاج:
# - /monitoring/ready يرجع 503 ← مشكلة DB أو Redis
# - زمن استجابة /api/v1/* أعلى من 2s
# - معدل الأخطاء {success:false} أعلى من 5%
# - امتلاء القرص / نفاد اتصالات PostgreSQL
```

## 7.6 التعامل مع الضغط العالي (High Load Handling)

### 7.6.1 Rate Limiting (مدمج في باك Go)
```bash
# الباك يطبق تحديد معدل عام + تحديد صارم على مسارات المصادقة.
# عند الضغط: راجع سجلات التحذيرات، وزّع الحمل على نسخ إضافية من حاوية الـ API.
```

### 7.6.2 Caching Strategy
```bash
# Redis يستخدم للتخزين المؤقت وتحديد المعدل.
# تأكد من ضبط REDIS_URL أو REDIS_HOST في الإنتاج،
# وراقب زمن الاستجابة عبر /metrics.
```

### 7.6.3 Worker للمهام الثقيلة
```bash
# المهام الثقيلة تعمل في ثنائية الـ worker:
docker build -f gobackend/Dockerfile.worker -t ray-worker:latest gobackend/
# شغّل الـ worker كخدمة منفصلة تشارك نفس DATABASE_URL وREDIS_URL.
```

## 7.7 إغلاق آمن للخدمة (Secure Shutdown)

### 7.7.1 Graceful Shutdown (باك Go)
```bash
# عند SIGTERM/SIGINT يقوم Fiber بالإيقاف المرتب:
# 1. إيقاف قبول اتصالات جديدة
# 2. انتظار الطلبات الجارية (بمهلة)
# 3. إغلاق اتصالات PostgreSQL وRedis
# لا حاجة لأي كود NestJS — السلوك مدمج في ثنائية Go.
```

### 7.7.2 Zero-Downtime Deployment
```bash
#!/bin/bash
# scripts/zero-downtime-deploy.sh
echo "Starting zero-downtime deployment..."

# 1. بناء الصورة الجديدة
docker build -f gobackend/Dockerfile -t ray-api:new gobackend/

# 2. تشغيل النسخة الجديدة على بورت مختلف
docker run -d -p 4001:4000 --env-file gobackend/.env.production ray-api:new

# 3. انتظار الجاهزية
sleep 10
if curl -f http://localhost:4001/monitoring/ready; then
    echo "New version is healthy"
    # 4. حوّل الـ load balancer إلى 4001 ثم أوقف القديمة
else
    echo "Health check failed, rolling back..."
    docker stop $(docker ps -q --filter "publish=4001")
    exit 1
fi
```

## 7.8 Docker Configuration

### 7.8.1 صور متعددة المراحل (باك Go)
```dockerfile
# gobackend/Dockerfile (API) — بناء متعدد المراحل
# مرحلة البناء: golang:1.25 ثم نسخ الثنائية إلى صورة نهائية صغيرة
# HEALTHCHECK --interval=30s CMD curl -f http://localhost:4000/monitoring/ready || exit 1
# EXPOSE 4000
# CMD ["./api"]

# gobackend/Dockerfile.worker (worker) — نفس الأسلوب لثنائية الـ worker
```

### 7.8.2 Docker Compose للإنتاج
```yaml
# التشغيل المحلي من داخل gobackend/
# docker compose up -d postgres redis   ثم  go run ./cmd/api
#
# للإنتاج: ابنِ صورتي API والـ worker وشغّلهما مع Postgres/Redis مدارين،
# مع متغيرات الإنتاج الإلزامية: JWT_SECRET، ADMIN_BOOTSTRAP_TOKEN،
# CSRF_DISABLED=false، CORS_ORIGIN (بدون *)، REDIS_URL أو REDIS_HOST.
```

## 7.9 Platform-Specific Deployments

### 7.9.1 Vercel (الواجهات الثلاث)
```bash
# انشر كل تطبيق Next.js على حدة:
# apps/marketplace-next / apps/dashboard-web / apps/business
# اضبط NEXT_PUBLIC_BACKEND_URL على رابط الـ API المنتج.
```

### 7.9.2 Back4app Containers (باك Go)
```bash
# Root Directory: gobackend
# Build: go build -o api ./cmd/api
# Start: ./api
# Healthcheck Path: /monitoring/ready
# أضف متغيرات الإنتاج الإلزامية من gobackend/.env.production.example
```

### 7.9.3 AWS ECS (باك Go)
```json
{
  "family": "ray-api",
  "containerDefinitions": [
    {
      "name": "ray-api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/ray-api:latest",
      "portMappings": [{ "containerPort": 4000, "protocol": "tcp" }],
      "environment": [
        { "name": "APP_ENV", "value": "production" },
        { "name": "PORT", "value": "4000" }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:4000/monitoring/ready || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

## 7.10 أفضل الممارسات للنشر (Deployment Best Practices)

### 7.10.1 Security Best Practices
```bash
# 1. HTTPS دائمًا + security headers (مدمجة في باك Go)
# 2. CSRF_DISABLED=false في الإنتاج
# 3. CORS_ORIGIN بدون * — قائمة الدومينات الحقيقية فقط
# 4. JWT_SECRET بطول 32+ حرف وغير الافتراضية
# 5. ADMIN_BOOTSTRAP_TOKEN غير الافتراضية
# 6. الدخول التجريبي (dev-*-login) ممنوع في الإنتاج
```

### 7.10.2 Performance Best Practices
```bash
# 1. ضغط الاستجابات (مدمج في Fiber)
# 2. تخزين مؤقت عبر Redis
# 3. worker منفصل للمهام الثقيلة (Dockerfile.worker)
# 4. نسخ أفقية من حاوية الـ API خلف load balancer
```

### 7.10.3 Monitoring Best Practices
```bash
# 1. سجلات منظمة (zap) في باك Go
# 2. مقاييس Prometheus عبر /metrics
# 3. فحوص /monitoring/live و/monitoring/ready في الـ load balancer
# 4. تنبيه عند 503 من /monitoring/ready (DB/Redis)
```

## 7.11 التحقق من النجاح (Success Checklist)

### 7.11.1 Pre-Deployment Checklist
- [ ] صورة الـ API تُبنى من `gobackend/Dockerfile` بدون أخطاء
- [ ] صورة الـ worker تُبنى من `gobackend/Dockerfile.worker`
- [ ] متغيرات الإنتاج الإلزامية مضبوطة (JWT_SECRET، ADMIN_BOOTSTRAP_TOKEN، CSRF_DISABLED=false، CORS_ORIGIN بدون *، REDIS_URL أو REDIS_HOST)
- [ ] ملفات المثال مراجعة (`gobackend/.env.example` و`.env.production.example`)
- [ ] الدخول التجريبي معطّل (APP_ENV ليس development في الإنتاج)

### 7.11.2 Post-Deployment Checklist
- [ ] `GET /monitoring/ready` يرجع 200
- [ ] `GET /api/v1/status` يرجع 200
- [ ] `GET /metrics` يعرض مقاييس Prometheus
- [ ] Database وRedis متصلان
- [ ] الواجهات الثلاث تصل إلى الـ API بدون CORS errors

### 7.11.3 Performance Checklist
- [ ] Response times < 200ms للـ 95% من الطلبات
- [ ] Uptime > 99.9%
- [ ] Memory usage < 80%
- [ ] CPU usage < 70%

### 7.11.4 Security Checklist
- [ ] HTTPS يعمل بشكل صحيح
- [ ] CSRF مفعّل (CSRF_DISABLED=false)
- [ ] CORS بدون * في الإنتاج
- [ ] JWT_SECRET وADMIN_BOOTSTRAP_TOKEN غير الافتراضيتين
- [ ] الدخول التجريبي لا يعمل في الإنتاج
- [ ] Access controls تعمل (الأخطاء بصيغة {success:false, error, message})

هذا الدليل الشامل يغطي جميع جوانب النشر والتشغيل الإنتاجي لمشروع Ray (باك Go 1.25 + Fiber في `gobackend/`)، مع التركيز على الأمان والأداء والموثوقية.

