# 9) استكشاف الأعطال وإصلاحها الشامل

> الباك الوحيد: Go 1.25 + Fiber في `gobackend/` (المنفذ `4000`). باك NestJS القديم حُذف 2026-08-24 وبقاياه في `_archive/` فقط.

## 9.1 مشاكل الواجهة الأمامية (Frontend Issues)

الفرونت ثلاثة تطبيقات Next.js: `apps/marketplace-next` و`apps/dashboard-web` و`apps/business`. سكربتات الجذر: `npm run dev:marketplace|dev:dashboard-web|dev:business|dev:all` و`npm run go:backend:dev`.

### 9.1.1 مشكلة: Frontend يعمل لكن لا تظهر بيانات
**الأعراض:**
- الصفحة تفتح لكن القوائم فارغة
- أخطاء network في المتصفح (404, 500, timeout)
- Loading spinner يدور بدون توقف

**التشخيص السريع:**
1. تحقق من تشغيل باك Go:
   ```bash
   curl http://localhost:4000/monitoring/ready
   curl http://localhost:4000/api/v1/status
   ```
2. تحقق من متغيرات البيئة (رابط الباك في كل تطبيق Next.js):
   ```bash
   # NEXT_PUBLIC_BACKEND_URL يجب أن يشير إلى http://localhost:4000 محليًا
   ```
3. تحقق من الـ Network tab في DevTools (ابحث عن طلبات API الفاشلة وراجع صيغة الخطأ `{success:false, error, message}`).

**الحلول:**
```bash
# 1. شغّل الباك من داخل gobackend/
docker compose up -d postgres redis
go run ./cmd/api

# 2. شغّل الواجهات من الجذر
npm run dev:marketplace
npm run dev:dashboard-web
npm run dev:business
```

---

### 9.1.2 مشكلة: CORS Policy Blocked
**الأعراض:**
- رسائل `Access to fetch ... has been blocked by CORS policy`

**التشخيص السريع:**
1. تحقق من الـ Origin في طلبات المتصفح وقارنه مع `CORS_ORIGIN` في `gobackend/.env`.
2. في الإنتاج: `CORS_ORIGIN` يجب أن يكون قائمة دومينات حقيقية **بدون `*`**.

**الحلول:**
```bash
# في gobackend/.env (محليًا)
CORS_ORIGIN=http://localhost:5174,http://localhost:3000

# أعد تشغيل الباك
# Ctrl+C ثم من داخل gobackend/
go run ./cmd/api
```

---

### 9.1.3 مشكلة: Build Errors (تطبيقات Next.js)
**الأعراض:**
- أخطاء TypeScript أثناء البناء في أحد التطبيقات الثلاثة.

**الحلول:**
```bash
# من داخل مجلد التطبيق المعني
cd apps/marketplace-next   # أو dashboard-web أو business
npm install
npm run build
```

---

### 9.1.4 مشكلة: `Cannot POST /api/v1/auth/logout` (تاريخية)
**الأعراض:**
- الفرونت ينادي `POST /api/v1/auth/logout` فيرجع 404.

**السبب والحل:**
- هذا المسار غير موجود في باك Go — الفرونت كان ينادي مسارًا غير موجود (مشكلة تاريخية من زمن الربط القديم).
- الحل: إزالة/تجاهل النداء من الفرونت والاكتفاء بمسح التوكن محليًا (`ray_token`/`token`/`ray_user`)، لا حاجة لإصلاح في الباك.

---

## 9.2 مشاكل الواجهة الخلفية (Backend Issues — Go)

### 9.2.1 مشكلة: `listen tcp4 0.0.0.0:4000: bind: address already in use`
**الأعراض:**
- الباك يفشل في الإقلاع ويطبع `bind: address already in use`.

**السبب:**
- الباك يعمل مسبقًا على نفس المنفذ (نسخة قديمة من `go run ./cmd/api` ما زالت حية).

**الحل (Windows):**
```bash
netstat -ano | findstr :4000
# حدد الـ PID ثم أوقفه
taskkill /PID <PID> /F
# ثم من داخل gobackend/
go run ./cmd/api
```

---

### 9.2.2 مشكلة: فشل اتصال DB
**الأعراض:**
- `/monitoring/ready` يرجع 503 أو سجلات `database connection failed`.

**الحل:**
```bash
# 1. تأكد أن حاوية postgres على 5433 تعمل (من داخل gobackend/)
docker compose up -d postgres redis
docker ps | findstr postgres

# 2. تأكد أن DATABASE_URL صحيح في gobackend/.env
curl http://localhost:4000/monitoring/ready
```

---

### 9.2.3 مشكلة: تحذير `s3 client not available`
**الأعراض:**
- سطر تحذيري في سجلات الباك عند الإقلاع.

**الحل:**
- تحذير فقط — الوسائط تعمل محليًا (تخزين محلي). لا حاجة لضبط S3 في التطوير المحلي. اضبط متغيرات `AWS_*` فقط إذا كنت تحتاج S3 فعلًا.

---

### 9.2.4 مشكلة: الباك لا يقلع — متغيرات ناقصة
**التشخيص:**
```bash
# قارن gobackend/.env مع gobackend/.env.example
# في الإنتاج قارن مع gobackend/.env.production.example
# الإلزامي إنتاجيًا: JWT_SECRET (32+ وغير الافتراضية)، ADMIN_BOOTSTRAP_TOKEN
# (غير الافتراضية)، CSRF_DISABLED=false، CORS_ORIGIN (بدون *)، REDIS_URL أو REDIS_HOST
```

---

## 9.3 مشاكل قاعدة البيانات (Database Issues)

### 9.3.1 مشكلة: الاتصال مرفوض / الحاوية متوقفة
```bash
# من داخل gobackend/
docker compose up -d postgres redis
curl http://localhost:4000/monitoring/ready
```
- تأكد أن postgres على `5433` تعمل وأن `DATABASE_URL` يشير إليها.

### 9.3.2 مشكلة: استعلامات بطيئة
```sql
-- 1. تحقق من الاستعلامات البطيئة
SELECT query, mean_time, calls FROM pg_stat_statements
WHERE mean_time > 100 ORDER BY mean_time DESC LIMIT 10;

-- 2. أنشئ فهارس للأعمدة الأكثر استعلامًا (shops/products/orders)
-- 3. حدّث الإحصائيات
VACUUM ANALYZE products;
```

---

## 9.4 مشاكل المصادقة (Authentication Issues)

### 9.4.1 مشكلة: `ليس لديك صلاحية للوصول (insufficient_role)` على `/shops/me`
**الأعراض:**
- الرد بصيغة `{success:false, error:"insufficient_role", message:"ليس لديك صلاحية للوصول"}`.

**الأسباب:**
1. المستخدم الحالي ليس `MERCHANT`/`ADMIN`، أو
2. التوكن قديم/مخزّن من جلسة سابقة في `localStorage` (`ray_token`).

**الحل:**
```javascript
// في كونسول المتصفح امسح مفاتيح الجلسة القديمة:
localStorage.removeItem('ray_token')
localStorage.removeItem('token')
localStorage.removeItem('ray_user')
```
ثم أعد الدخول التجريبي من `/admin/gate` في `dashboard-web` (صفحة البوابة تستخرج التوكن المتداخل `data.data.token.accessToken`).

### 9.4.2 مشكلة: 401 على endpoints محمية
**فحص:**
- هل `JWT_SECRET` مضبوط (32+ حرف وغير الافتراضية)؟
- هل الترويسة بصيغة `Authorization: Bearer <token>`؟
- هل التوكن منتهي؟ أعد الدخول التجريبي (يعمل فقط عندما `APP_ENV=development` ومع `ALLOW_DEV_*_BOOTSTRAP=true` — ممنوع في الإنتاج).

### 9.4.3 مشكلة: الدخول التجريبي (`dev-*-login`) لا يعمل
**فحص:**
- يعمل فقط عندما `APP_ENV=development` ومع `ALLOW_DEV_*_BOOTSTRAP=true`.
- في الإنتاج هو ممنوع by design — استخدم `POST /api/v1/auth/bootstrap-admin` مع `ADMIN_BOOTSTRAP_TOKEN` لتهيئة الإدارة.

---

## 9.5 مشاكل التخزين والملفات (Storage & File Issues)

### 9.5.1 مشكلة: File Upload Failed
- تحقق من حجم الملف (الحد الافتراضي) ونوعه.
- تحقق من مجلد `uploads/` وصلاحياته محليًا.

### 9.5.2 ملاحظة S3
- `s3 client not available` تحذير فقط — الوسائط تعمل محليًا بدون S3.

---

## 9.6 مشاكل الأداء (Performance Issues)

### 9.6.1 مشكلة: Slow Response Times
```bash
curl -w "Response time: %{time_total}s\n" http://localhost:4000/api/v1/status
curl http://localhost:4000/metrics   # مقاييس Prometheus
```
- راجع أبطأ الـ endpoints، وزّع الحمل على نسخ إضافية، واعزل المهام الثقيلة في الـ worker (`Dockerfile.worker`).

---

## 9.7 مشاكل النشر (Deployment Issues)

### 9.7.1 مشكلة: Build Failed (باك Go)
```bash
cd gobackend
go build ./...
go vet ./...
```

### 9.7.2 مشكلة: Container لا يقلع
```bash
docker logs <container_name>
# تحقق أن HEALTHCHECK يستخدم /monitoring/ready وليس أي مسار قديم
```

### 9.7.3 مشكلة: Environment Variables (إنتاج)
- راجع القائمة الإلزامية: `JWT_SECRET` (32+ وغير الافتراضية)، `ADMIN_BOOTSTRAP_TOKEN` (غير الافتراضية)، `CSRF_DISABLED=false`، `CORS_ORIGIN` بدون `*`، `REDIS_URL` أو `REDIS_HOST`.
- المرجع: `gobackend/.env.example` و`.env.production.example`.

---

## 9.8 أدوات التشخيص (Diagnostic Tools)

### 9.8.1 Frontend Tools
```bash
# Browser DevTools: Network / Performance / Console / Application (localStorage: ray_token/token/ray_user)
# Lighthouse لتقييم تطبيقات Next.js الثلاثة
```

### 9.8.2 Backend Tools (Go)
```bash
cd gobackend
go vet ./...
go test ./...
curl http://localhost:4000/monitoring/live
curl http://localhost:4000/monitoring/ready
curl http://localhost:4000/metrics
curl http://localhost:4000/api/v1/status
```

### 9.8.3 Database Tools
```bash
# من داخل gobackend/
docker compose ps
SELECT * FROM pg_stat_activity;
```

### 9.8.4 System Monitoring (Windows)
```bash
netstat -ano | findstr :4000
docker stats
```

---

## 9.9 البيانات المطلوبة للإبلاغ عن المشاكل

### 9.9.1 معلومات أساسية
- **الإصدار:** Ray + Go backend (Go 1.25 + Fiber)
- **البيئة:** Development/Production (`APP_ENV`)
- **الـ OS:** Windows/Linux/macOS
- **التطبيق:** marketplace-next / dashboard-web / business / gobackend

### 9.9.2 الخطأ الكامل
- رسالة الخطأ + الـ body الكامل بصيغة `{success:false, error, message}`
- الـ URL والـ method والـ status code
- الوقت والترويسات (بدون أسرار)

### 9.9.3 السياق
- الخطوات التي أدت إلى الخطأ، الصفحة/المسار، إجراء المستخدم، قيمة `ray_token` موجودة أم لا (بدون لصق التوكن نفسه)

---

## 9.10 قائمة المراجعة السريعة (Quick Reference)

### 9.10.1 Backend (Go)
1. **المنفذ مشغول:** `netstat -ano | findstr :4000` ← الباك يعمل مسبقًا.
2. **DB:** حاوية postgres على `5433` + `DATABASE_URL` صحيح + `/monitoring/ready`.
3. **S3 warning:** تحذير فقط.
4. **فحص سريع:** `curl http://localhost:4000/monitoring/ready` و`curl http://localhost:4000/api/v1/status`.

### 9.10.2 Auth
1. **`insufficient_role` على `/shops/me`:** امسح `ray_token/token/ray_user` وأعد الدخول التجريبي من `/admin/gate`.
2. **dev-login:** يعمل فقط مع `APP_ENV=development` و`ALLOW_DEV_*_BOOTSTRAP=true` — ممنوع إنتاجيًا.
3. **`Cannot POST /api/v1/auth/logout`:** مسار غير موجود تاريخيًا — امسح التوكن محليًا.

### 9.10.3 Deployment
1. صور متعددة المراحل: `gobackend/Dockerfile` و`Dockerfile.worker`.
2. متغيرات الإنتاج الإلزامية + ملفا المثال.
3. Health checks على `/monitoring/ready` و`/metrics`.

هذا الدليل يغطي المشاكل الشائعة الحقيقية في مشروع Ray (باك Go + ثلاثة تطبيقات Next.js) مع حلول مفصلة لكل مشكلة.
