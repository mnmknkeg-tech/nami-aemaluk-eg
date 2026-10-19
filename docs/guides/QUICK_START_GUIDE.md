# ⚡ دليل البدء السريع - Quick Start & Troubleshooting

**الهدف:** تشغيل النظام واختباره في 5 دقائق
**الباك الوحيد:** Go 1.25 + Fiber في `gobackend/` (المنفذ `4000`). باك NestJS القديم حُذف 2026-08-24 وبقاياه في `_archive/` فقط.

---

## 🚀 1️⃣ **تحضير البيئة (5 دقائق)**

### الخطوة 1: قاعدة البيانات + Redis
```bash
# من داخل gobackend
cd gobackend
docker compose up -d postgres redis

# تحقق من الاتصال (postgres على 5433)
# إذا فشل، تحقق من:
# - gobackend/.env موجود (انسخه من gobackend/.env.example)
# - DATABASE_URL صحيح: postgresql://ray_user:ray_password@localhost:5433/ray_marketplace
```

### الخطوة 2: Go Backend
```bash
# من مجلد gobackend
cd gobackend

# تنزيل المكتبات
go mod download

# تشغيل الـ Backend
go run ./cmd/api

# يجب أن تظهر:
# ✅ "Server started on :4000"
# ✅ "Database connected"
# ✅ "Redis connected (best-effort)"
# ملاحظة: تحذير "s3 client not available" تحذير فقط — الوسائط تعمل محليًا.
```

### الخطوة 3: Frontend Marketplace
```bash
# من الجذر
npm run dev:marketplace
# أو: cd apps/marketplace-next && npm run dev

# تحقق من env:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# يجب أن يفتح على http://localhost:5174
```

### الخطوة 4: Dashboard (اختياري)
```bash
npm run dev:dashboard-web
# أو: cd apps/dashboard-web && npm run dev

# يجب أن يفتح على http://localhost:3000
# الدخول التجريبي من: http://localhost:3000/admin/gate
# (يعمل فقط عندما APP_ENV=development ومع ALLOW_DEV_*_BOOTSTRAP=true)
```

### الخطوة 5: Business (اختياري)
```bash
npm run dev:business
# أو: cd apps/business && npm run dev
```

> كل السكربتات من الجذر: `npm run dev:marketplace|dev:dashboard-web|dev:business|dev:all` و`npm run go:backend:dev`.

---

## 🧪 2️⃣ **اختبارات سريعة**

### Test 1: Health Check
```bash
# تحقق من أن Go backend يعمل ومتصل (DB+Redis)
curl http://localhost:4000/monitoring/ready
curl http://localhost:4000/api/v1/status

# يجب أن ترى 200 OK
```

### Test 2: CORS Test
```bash
# من الـ Browser Console في Marketplace
fetch('http://localhost:4000/api/v1/products', {
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log('CORS OK:', d))
.catch(e => console.error('CORS ERROR:', e))

# يجب أن ترى البيانات بدون CORS error
# (CORS_ORIGIN في gobackend/.env يجب أن يحتوي http://localhost:5174 وhttp://localhost:3000)
```

### Test 3: Login Test (تجريبي — تطوير فقط)
```bash
# من dashboard-web
1. اذهب إلى http://localhost:3000/admin/gate
2. نفّذ الدخول التجريبي (dev-*-login)
3. تأكد أن التوكن حُفظ (الصفحة تستخرج data.data.token.accessToken المتداخل)

# يجب أن يتم حفظ Token (ray_token/token) و ray_user
```

### Test 4: Orders Test
```bash
# من Marketplace Checkout
1. أضف منتجات للسلة
2. اذهب إلى /checkout
3. ملأ البيانات
4. اضغط "Place Order"

# تحقق من Network tab:
# POST /api/v1/orders → 201 Created
```

---

## 🔍 3️⃣ **Debugging & Logging**

### Log Level في Backend
```bash
# اجعل الـ logs أكثر وضوحاً
# في gobackend/.env:
LOG_LEVEL=debug
go run ./cmd/api
```

### Browser Network Tab
```
Ctrl+Shift+I → Network tab

تحقق من:
1. Request Headers:
   ✅ Authorization: Bearer <token>
   ✅ Content-Type: application/json
   ✅ Origin: http://localhost:5174

2. Response Headers:
   ✅ Access-Control-Allow-Origin: http://localhost:5174
   ✅ Access-Control-Allow-Credentials: true

3. Response Body (نجاح أو خطأ موحد):
   ✅ { "success": true, "data": {...} }
   ✅ { "success": false, "error": "...", "message": "..." }
```

### Go Backend Errors
```bash
# في terminal حيث يعمل Go backend ستظهر أخطاء مثل:

# ❌ "listen tcp4 0.0.0.0:4000: bind: address already in use"
#    → الباك يعمل مسبقًا — تحقق بـ: netstat -ano | findstr :4000

# ❌ "database connection failed"
#    → تحقق أن حاوية postgres على 5433 تعمل وأن DATABASE_URL صحيح

# ❌ "insufficient_role / ليس لديك صلاحية للوصول" على /shops/me
#    → المستخدم ليس MERCHANT/ADMIN أو التوكن قديم — امسح ray_token/token/ray_user
#      وأعد الدخول التجريبي من /admin/gate

# ⚠️ "s3 client not available"
#    → تحذير فقط — الوسائط تعمل محليًا
```

---

## 🛠️ 4️⃣ **المشاكل الشائعة و الحلول**

### مشكلة 1: "CORS Error in Console"
```
Error: Access to XMLHttpRequest at 'http://localhost:4000/api/v1/products'
from origin 'http://localhost:5174' has been blocked by CORS policy

الحل:
1. تحقق من gobackend/.env:
   CORS_ORIGIN=http://localhost:5174,http://localhost:3000

2. أعد تشغيل Go backend:
   Ctrl+C (في terminal)
   cd gobackend && go run ./cmd/api

3. نظف الـ Browser cache:
   Ctrl+Shift+Delete → Clear all
```

### مشكلة 2: "401 / insufficient_role على /shops/me"
```
Error: { "success": false, "error": "insufficient_role",
         "message": "ليس لديك صلاحية للوصول (insufficient_role)" }

الحل:
1. تحقق من الدور: يجب أن يكون المستخدم MERCHANT أو ADMIN.
2. التوكن قد يكون قديمًا في localStorage — امسح:
   localStorage.removeItem('ray_token')
   localStorage.removeItem('token')
   localStorage.removeItem('ray_user')
3. أعد الدخول التجريبي من http://localhost:3000/admin/gate
   (صفحة البوابة تستخرج data.data.token.accessToken المتداخل).
```

### مشكلة 3: "Database Connection Failed"
```
Error: database connection failed / /monitoring/ready → 503

الحل:
1. تحقق من الحاويات (من داخل gobackend):
   docker compose up -d postgres redis
   docker ps

2. تأكد من DATABASE_URL (postgres على 5433):
   مثال: postgresql://ray_user:ray_password@localhost:5433/ray_marketplace

3. تحقق:
   curl http://localhost:4000/monitoring/ready
```

### مشكلة 4: "المنفذ 4000 مشغول"
```
Error: listen tcp4 0.0.0.0:4000: bind: address already in use

الحل:
1. الباك يعمل مسبقًا — تحقق:
   netstat -ano | findstr :4000
2. أوقف العملية القديمة:
   taskkill /PID <PID> /F
3. أعد التشغيل:
   cd gobackend && go run ./cmd/api
```

### مشكلة 5: "Cannot POST /api/v1/auth/logout"
```
الحل:
- مسار غير موجود تاريخيًا — الفرونت كان ينادي مسارًا غير موجود.
- تجاهل النداء وامسح التوكن محليًا (ray_token/token/ray_user).
```

---

## 📝 5️⃣ **قائمة التحقق قبل الإطلاق**

### Backend Readiness
- [ ] PostgreSQL تعمل (حاوية postgres على `5433`)
- [ ] Redis تعمل (best-effort)
- [ ] Go Backend يستجيب على :4000 (`cd gobackend && go run ./cmd/api`)
- [ ] `/monitoring/ready` يرجع 200
- [ ] `/api/v1/status` يرجع 200
- [ ] JWT_SECRET محدد (32+ وغير الافتراضية) — إلزامي إنتاجيًا
- [ ] ADMIN_BOOTSTRAP_TOKEN غير الافتراضية — إلزامي إنتاجيًا
- [ ] CSRF_DISABLED=false إنتاجيًا
- [ ] CORS_ORIGIN بدون `*` إنتاجيًا
- [ ] REDIS_URL أو REDIS_HOST مضبوط إنتاجيًا
- [ ] الدخول التجريبي معطّل إنتاجيًا (APP_ENV=production)

### Frontend Readiness
- [ ] Marketplace يعمل على :5174 (`npm run dev:marketplace`)
- [ ] Dashboard يعمل على :3000 (`npm run dev:dashboard-web`)
- [ ] NEXT_PUBLIC_BACKEND_URL = http://localhost:4000
- [ ] لا توجد errors في Console عند التحميل

### Integration Readiness
- [ ] الدخول التجريبي يعمل من `/admin/gate` (تطوير فقط)
- [ ] Token يُحفظ في localStorage (ray_token و token + ray_user)
- [ ] طلبات API تحتوي على Authorization header
- [ ] CORS errors لا تظهر
- [ ] صيغة الاستجابة صحيحة (`{success, data}` أو `{success:false, error, message}`)

---

## 🚨 6️⃣ **Emergency Restart**

إذا توقف النظام عن العمل:

```bash
# 1. أوقف كل شيء
# في كل terminal: Ctrl+C

# 2. امسح الـ cache (اختياري)
# rmdir /s /q node_modules\.cache  (Windows)

# 3. نظّف Browser cache
# Ctrl+Shift+Delete

# 4. أعد تشغيل Docker services (من داخل gobackend)
cd gobackend
docker compose down
docker compose up -d postgres redis

# 5. شغّل البرامج:
# Terminal 1:
cd gobackend && go run ./cmd/api

# Terminal 2:
npm run dev:marketplace

# Terminal 3:
npm run dev:dashboard-web
```

---

## 📊 7️⃣ **Performance Baseline**

قم بقياس الأداء الأساسية:

```bash
# Response time للـ endpoints الرئيسية:

curl -w "\nTime: %{time_total}s\n" http://localhost:4000/api/v1/status
curl http://localhost:4000/metrics   # مقاييس Prometheus

متوقع:
  ✅ GET /api/v1/status → < 200ms
  ✅ GET /api/v1/shops/me → < 200ms (بتوكن MERCHANT/ADMIN صالح)

إذا كانت أبطأ:
  - تحقق من database indexes
  - تحقق من اتصال Redis
  - قلل حجم البيانات المرجعة
```

---

## 📞 8️⃣ **Getting Help**

### اطرح السؤال مع:
1. **المشكلة:**
   - ماذا تحاول أن تفعل؟
   - ماذا حدث؟ (مع الـ body الكامل `{success:false, error, message}`)

2. **الملفات الصلة:**
   - الـ endpoint المستخدم
   - Request format
   - Response format

3. **الأدلة:**
   - Browser console errors
   - Go backend logs
   - Network tab screenshots
   - `curl http://localhost:4000/monitoring/ready` النتيجة
   - .env configuration (without sensitive data)

### أماكن البحث:
- [ ] Check [docs/09-troubleshooting.md](docs/09-troubleshooting.md)
- [ ] Check [docs/07-deployment-operations.md](docs/07-deployment-operations.md)
- [ ] Check [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)
- [ ] Check [gobackend/.env.example](gobackend/.env.example)

---

## ✅ نصائح مهمة

1. **الباك يُشغّل دائمًا من داخل gobackend:**
   ```bash
   cd gobackend
   docker compose up -d postgres redis
   go run ./cmd/api
   ```

2. **Server-side requests use absolute URLs:**
   ```javascript
   // في getServerSideProps أو API routes
   const baseURL = process.env.BACKEND_URL || 'http://localhost:4000'
   fetch(`${baseURL}/api/v1/products`)
   ```

3. **Always include Authorization:**
   ```javascript
   fetch('/api/v1/orders', {
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     }
   })
   ```

4. **Handle errors gracefully (الصيغة الموحدة):**
   ```javascript
   try {
     const res = await fetch('/api/v1/...')
     const data = await res.json()
     if (!data.success) throw new Error(data.message || data.error)
     return data.data
   } catch (err) {
     console.error('API call failed:', err)
     // Show user-friendly message
   }
   ```

5. **عند `insufficient_role`:** امسح `ray_token/token/ray_user` وأعد الدخول من `/admin/gate`.

---

**آخر تحديث:** 2026-09-03
**الإصدار:** 1.0 (Go backend فقط)
