# Deploy Guide — Railway + Supabase + external Redis (Go backend)

> الباك الوحيد: Go 1.25 + Fiber في `gobackend/` (المنفذ `4000`). باك NestJS القديم حُذف 2026-08-24.

## الخدمات المطلوبة (كلها مجانية)

| الخدمة | الاستخدام | الرابط |
|--------|-----------|--------|
| Supabase | PostgreSQL database | supabase.com |
| Upstash | Redis (`REDIS_URL`) | upstash.com |
| Cloudflare R2 | File storage (اختياري — تحذير `s3 client not available` تحذير فقط) | cloudflare.com |
| Resend | Email | resend.com |
| Railway | Hosting الـ Go API + الـ Worker | railway.app |

الصور: `gobackend/Dockerfile` للـ API و`gobackend/Dockerfile.worker` للـ worker (بناء متعدد المراحل).

---

## الخطوات بالترتيب

### 1. Supabase — إعداد قاعدة البيانات

1. روح [supabase.com](https://supabase.com) → New Project
2. احتفظ بـ **Database Password**
3. روح: Project Settings → Database → Connection String → URI
4. انسخ الـ URI وحطه في `.env.production` كـ `DATABASE_URL`
   - استخدم **Session mode** (port **5432**، المضيف `db.<ref>.supabase.co`)
   - الـ Backend بيضيف `?sslmode=require` تلقائيًا للمضيفات البعيدة، فمش لازم تكتبها
   - لو المزود أعطاك رابط فيه `schema=public` أو `connection_limit=` (صيغة Prisma)، فالـ Backend بيشيلها تلقائيًا — انسخه زي ما هو
5. **مهم:** على أول Deploy قاعدة البيانات فاضية تمامًا، فلازم `DB_MIGRATE_ON_BOOT=true`
   - لو نسيته: السيرفر يقوم و`/monitoring/ready` يقول `schema: incomplete` وكل طلب يرجّع `internal app error`

### 2. شغل الـ Migrations على Supabase

```bash
cd gobackend

# انسخ الـ example وعدل القيم
copy .env.production.example .env.production

# شغل الـ migrations (golang-migrate تحت migrations/)
go run scripts/migrate.go up
```

### 3. Upstash — إعداد Redis

1. روح [upstash.com](https://upstash.com) → Create Database
2. اختار region قريبة
3. انسخ الـ `REDIS_URL` وحطه في `.env.production` (إلزامي إنتاجيًا — أو `REDIS_HOST`)

### 4. Cloudflare R2 — إعداد Storage (اختياري)

1. Cloudflare Dashboard → R2 → Create Bucket → اسمه `ray-media`
2. R2 → Manage R2 API Tokens → Create Token
3. حط الـ keys في `.env.production`
4. ملاحظة: بدون S3 سترى تحذير `s3 client not available` — تحذير فقط، والوسائط تعمل محليًا.

### 5. متغيرات الإنتاج الإلزامية

قبل الـ Deploy تأكد من (المرجع: `gobackend/.env.example` و`.env.production.example`):

- `JWT_SECRET` — بطول 32+ حرف وغير القيمة الافتراضية
- `ADMIN_BOOTSTRAP_TOKEN` — غير القيمة الافتراضية
- `CSRF_DISABLED=false`
- `CORS_ORIGIN` — بدون `*` (دوميناتك الحقيقية فقط)
- `REDIS_URL` أو `REDIS_HOST`
- الدخول التجريبي (`dev-*-login`) ممنوع إنتاجيًا — يعمل فقط مع `APP_ENV=development` و`ALLOW_DEV_*_BOOTSTRAP=true`

### 6. Deploy الـ API والـ Worker على Railway

1. أنشئ **API service** و**Worker service** من نفس GitHub repository، وحدد Root Directory باسم `gobackend`.
2. لكل service أضف متغيرات الإنتاج نفسها، وبالأخص:
   - `DATABASE_URL`: سلسلة اتصال Supabase (Session Pooler).
   - `REDIS_URL`: رابط Redis الخارجي، وليس `localhost`.
   - `APP_ENV=production` و`CSRF_DISABLED=false`.
3. للـAPI استخدم start command مبني على `go run ./cmd/api` أو binary المبني من `gobackend/Dockerfile` حسب إعداد Railway.
4. للـworker استخدم `go run ./cmd/worker` أو `gobackend/Dockerfile.worker`.
5. لا تنشئ PostgreSQL أو Redis كـRailway services لهذا المشروع؛ Supabase هو مصدر البيانات وRedis هو التخزين المؤقت والجلسات.

### 7. التحقق بعد النشر

```bash
# Readiness (DB + Redis)
curl https://your-api-domain.com/monitoring/ready

# Liveness
curl https://your-api-domain.com/monitoring/live

# Status
curl https://your-api-domain.com/api/v1/status

# Metrics (Prometheus)
curl https://your-api-domain.com/metrics
```

الأخطاء تأتي بصيغة موحدة: `{success:false, error, message}`.

---

## حل المشاكل الشائعة بعد التحويل لـ Supabase

### 1. `internal app error` متكرر في اللوج مع إن `/monitoring/ready` أخضر

السبب الأشهر: قاعدة بيانات Supabase **جديدة وفاضية بدون Migrations**.
الاتصال ناجح، فـ Ping شغال، لكن الجداول مش موجودة فكل استعلام يفشل.

- تأكد من نقطة الجاهزية: `curl https://your-api/monitoring/ready`
  - `"schema": "ok"` → كل الجداول موجودة
  - `"schema": "incomplete"` → الـ Migrations لم تُشغَّل
- الحل: `DB_MIGRATE_ON_BOOT=true` وأعد النشر، أو شغّل يدويًا:
  ```bash
  cd gobackend
  go run scripts/migrate.go up
  go run scripts/migrate.go version   # للتأكد من الرقم الحالي
  ```
- من الآن أي `internal app error` في اللوج بيطبع `root_cause` فيه رسالة Postgres
  الحقيقية (مثل `relation "users" does not exist` أو `column ... does not exist`)
  مع `method` و`path` و`code` — اقرأها قبل أي حاجة تانية.

### 2. `prepared statement "stmtcache_..." does not exist`

معناها إنك متصل بـ Supabase **Transaction pooler**. الباك بيكتشف ده تلقائيًا من
المنفذ `6543` ومن `pgbouncer=true` ويطفي الـ prepared statements. لو لسه بتظهر:

- تأكد إن `DB_QUERY_EXEC_MODE=auto` (أو `simple`)
- الأفضل: استخدم **Session mode** (منفذ `5432`) بدل الـ pooler

### 3. `FATAL: unrecognized configuration parameter "schema"`

رابط فيه `?schema=public` (صيغة Prisma). الباك بيشيل `schema` و`connection_limit`
و`pool_timeout` و`socket_timeout` تلقائيًا، فلو لسه بتظهر تأكد إنك بتستخدم نسخة
حديثة من الكود.

### 4. `pgxpool: MinConns must be <= MaxConns` أو رفض اتصالات من Supabase

قلّل حجم الـ pool:
```
DB_MAX_OPEN_CONNS=10
DB_MAX_IDLE_CONNS=3
```

### 5. `Application not found` من الرابط العام

لو الدومين يرجّع `{"status":"error","code":404,"message":"Application not found"}`
مع هيدر `x-railway-fallback: true`، فده **رد منصة الاستضافة نفسها** ومعناه إن مفيش
Service مربوط بالدومين ده — مش مشكلة في الكود. اربط الدومين بالـ Service أو استخدم
الدومين الافتراضي اللي المنصة بتديه.

### 6. إنذار "DNS Resolving problem" على دومين `.eg`

لو `nslookup` على سيرفرات نطاق `.eg` الرسمية رجّع `Non-existent domain`، فالدومين
غير مُفوَّض (not delegated) في الـ TLD نفسه — مش مشكلة انتشار DNS. تحقق بـ:
```powershell
nslookup -type=NS ray.eg 193.227.1.1   # سيرفر نطاق .eg المصري
```
لازم ترجع NS records. لو رجّعت NXDOMAIN، خلّص تسجيل الدومين وربطه عند المسجّل.

---

## لو عايز تشغل محلياً

```bash
cd gobackend

# التشغيل المحلي: postgres + redis ثم Go
docker compose up -d postgres redis
go run ./cmd/api

# التحقق
curl http://localhost:4000/monitoring/ready
curl http://localhost:4000/api/v1/status
```

```bash
# صور Docker الكاملة:
docker build -f Dockerfile -t ray-api:latest .
docker build -f Dockerfile.worker -t ray-worker:latest .

# للـ production (Supabase + Redis خارجي)
docker-compose -f docker-compose.prod.yml up --build
```

الفرونت محليًا (من الجذر): `npm run dev:marketplace` و`npm run dev:dashboard-web` و`npm run dev:business` (أو `npm run dev:all`)، والباك عبر `npm run go:backend:dev`.

---

## ملاحظات مهمة

- **مش محتاج** تشغل NestJS — باك NestJS القديم حُذف 2026-08-24 وبقاياه في `_archive/` فقط. الباك الوحيد هو Go في `gobackend/`.
- الـ migrations بتشتغل عند الإقلاع (يتحكم فيها `DB_MIGRATE_ON_BOOT`) أو يدويًا عبر `go run scripts/migrate.go up`.
- لو عايز تضيف migration جديدة: اعمل ملف `NNNNNN_your_change.up.sql` (و`.down.sql`) في `migrations/`.
- لو المنفذ `4000` مشغول (`bind: address already in use`) فالباك يعمل مسبقًا — تحقق عبر `netstat -ano | findstr :4000`.
- لو ظهر `insufficient_role` على `/shops/me`: امسح `ray_token/token/ray_user` من `localStorage` وأعد الدخول التجريبي من `/admin/gate` (تطوير فقط).
