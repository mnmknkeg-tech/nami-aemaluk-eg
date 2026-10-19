# 8) خريطة الـ API والوحدات الشاملة (Go/Fiber)

> **مهم:** هذه الخريطة مرجعية لتسهيل الفهم السريع. المرجع النهائي دائمًا هو كود الباكند Go في `gobackend/internal/` (التجميع في `internal/app/app.go`).
>
> الفرونت يتصل بالباك عبر rewrite `/api/:path*` → `http://localhost:4000` (انظر `apps/dashboard-web/next.config.mjs`).

## 8.1 Base URLs والبيئة

### 8.1.1 URLs الأساسية
```bash
# التطوير المحلي
Local Base URL: http://localhost:4000
API Base URL: http://localhost:4000/api/v1

# المراقبة (خارج /api/v1)
/monitoring/live
/monitoring/ready
/monitoring/health
/metrics
# الحالة داخل /api/v1
/api/v1/status

# الإنتاج
Production Base URL: https://api.ray-eg.com
API Base URL: https://api.ray-eg.com/api/v1
```

### 8.1.2 Headers القياسية
```bash
# لجميع الطلبات
Content-Type: application/json
Accept: application/json

# للمصادقة (JWT HS256 — iss=ray-backend-go)
Authorization: Bearer <jwt_token>

# للـ CORS
Origin: <frontend_domain>
X-Requested-With: XMLHttpRequest
```

### 8.1.3 استجابات قياسية (صيغة الأخطاء الموحدة)
```json
// نجاح
{
  "success": true,
  "data": {}
}

// خطأ (الصيغة الموحدة الوحيدة)
{
  "success": false,
  "error": "insufficient_role",
  "message": "Merchant or admin role required",
  "fields": { "required": ["MERCHANT", "ADMIN"] }
}

// مثال صحة النظام
{
  "status": "up",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

> لا توجد صيغة `{statusCode, path, stack}` القديمة (NestJS) — الصيغة الوحيدة هي `{success:false, error:<code>, message, fields?}`.

## 8.2 المصادقة (Authentication) — `/api/v1/auth`

المصادقة JWT HS256 (`iss=ray-backend-go`) والأدوار `CUSTOMER/MERCHANT/ADMIN/COURIER/CASHIER`.

### 8.2.1 التسجيل (Registration)
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe",
  "phone": "+201234567890",
  "role": "CUSTOMER"
}
```

### 8.2.2 تسجيل الدخول والجلسة
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

POST /api/v1/auth/logout
// Requires: Authorization

POST /api/v1/auth/refresh
// تجديد التوكن

GET /api/v1/auth/me
// بيانات المستخدم الحالي
// Requires: Authorization
```

### 8.2.3 مسارات التطوير فقط
```http
POST /api/v1/auth/dev-merchant-login
POST /api/v1/auth/dev-courier-login
POST /api/v1/auth/dev-customer-login
```
- تُفعَّل فقط عند `ALLOW_DEV_*_BOOTSTRAP` (للتطوير فقط).
- لا تُستخدم في الإنتاج.

### 8.2.4 مثال صلاحيات (متجر التاجر)
```http
GET /api/v1/shops/me
Authorization: Bearer <jwt_token>
// يتطلب دور MERCHANT أو ADMIN
// وإلا: { "success": false, "error": "insufficient_role", ... }
```

## 8.3 الدومينات الـ 29 تحت `/api/v1`

تُجمَّع في `internal/app/app.go`:
`analytics, apps, auth, bookings, cartevent, chat, courier, customers, feedback, gallery, hr, invoice, mapdomain, measurement, media, notification, offers, orders, portal, products, reservation, reviews, search, seasonaloffers, shopimagemap, shops, support, users`

بالإضافة إلى:
- `/monitoring/live|ready|health` و`/metrics` (خارج `/api/v1`)
- `/api/v1/status` (داخل `/api/v1`)

### 8.3.1 Shops — `/api/v1/shops`
- `POST /` — إنشاء متجر (MERCHANT/ADMIN)
- `GET /me` — متجر التاجر الحالي (MERCHANT أو ADMIN وإلا `insufficient_role`)
- `PATCH /me` — تحديث متجر التاجر
- `GET /` — قائمة عامة (page, limit, category, search)
- `GET /:slug` و`GET /:id` — تفاصيل عامة
- `POST /:id/visit` — تسجيل زيارة
- `POST /:id/follow` — متابعة (مصادقة)
- `GET /admin/list` — (ADMIN)
- `PATCH /admin/:id/status` — (ADMIN)

### 8.3.2 Products — `/api/v1/products`
- `GET /` — قائمة عامة (page, limit, category, shopId, search, sortBy, priceRange)
- `GET /:id` — تفاصيل منتج
- `POST /` — إنشاء (MERCHANT)
- `PATCH /:id` — تحديث (MERCHANT/ADMIN)
- `DELETE /:id` — حذف (MERCHANT/ADMIN)
- `PATCH /:id/stock` — تحديث المخزون (MERCHANT)
- `GET /manage/by-shop/:shopId` — منتجات المتجر للإدارة (MERCHANT)
- `POST /manage/by-shop/:shopId/import-drafts` — استيراد مسودات (MERCHANT)

### 8.3.3 Orders — `/api/v1/orders`
- `POST /` — إنشاء طلب (مصادقة)
- `GET /me` — طلباتي
- `GET /:id` — تفاصيل طلب
- `PATCH /:id` — تحديث طلب
- `PATCH /:id/assign-courier` — (ADMIN/MERCHANT)
- `PATCH /:id/courier` — (COURIER)
- `GET /courier/me` — طلبات الكابتن
- `GET /admin` — كل الطلبات (ADMIN)
- `GET /:id/returns` و`POST /:id/returns` — الإرجاع

### 8.3.4 Reservation — `/api/v1/reservation`
- `POST /` — إنشاء حجز
- `GET /me` — حجوزاتي
- `GET /` — قائمة
- `PATCH /:id/status` — تحديث حالة

### 8.3.5 Offers — `/api/v1/offers`
- `GET /` — العروض النشطة (عام)
- `GET /:id` — تفاصيل عرض
- `POST /` — إنشاء (MERCHANT)
- `DELETE /:id` — حذف (MERCHANT/ADMIN)

### 8.3.6 SeasonalOffers — `/api/v1/seasonaloffers`
- عروض موسمية (نفس نمط offers — راجع `internal/app/app.go` للتثبيت الدقيق).

### 8.3.7 Invoice — `/api/v1/invoice`
- `GET /me` — فواتيري
- `GET /summary/me` — ملخص فواتيري
- `GET /` — كل الفواتير (ADMIN)
- `GET /summary` — الملخص (ADMIN)
- `GET /:id` — تفاصيل فاتورة
- `POST /` — إنشاء فاتورة
- `PATCH /:id` — تحديث فاتورة

### 8.3.8 Gallery — `/api/v1/gallery`
- `POST /upload` — رفع ملف
- `GET /:shopId` — محتويات مجلد المتجر
- `DELETE /:id` — حذف ملف
- `POST /:id/caption` — تحديث الوصف

### 8.3.9 Media — `/api/v1/media`
- `GET /ping` — فحص
- `GET /status` — حالة
- `POST /presign` — رابط presigned للرفع المباشر
- `POST /upload` و`PUT /upload` — رفع
- `POST /complete` — إتمام الرفع

### 8.3.10 Analytics — `/api/v1/analytics`
- `GET /system` — تحليلات النظام (ADMIN)
- `GET /system/timeseries` — سلاسل زمنية
- `GET /system/activity` — النشاط

### 8.3.11 Notification — `/api/v1/notification`
- `GET /me` — إشعاراتي
- `GET /me/unread-count` — عدد غير المقروء
- `PATCH /me/read` — تعليم الكل كمقروء
- `PATCH /me/:id/read` — تعليم واحد كمقروء
- `GET /shop/:shopId` — إشعارات المتجر
- `GET /shop/:shopId/unread-count`
- `PATCH /shop/:shopId/read`
- `PATCH /shop/:shopId/:id/read`

### 8.3.12 Feedback — `/api/v1/feedback`
- `POST /public` — إرسال عام
- `POST /` — إرسال (مصادقة)
- `GET /admin` — (ADMIN)
- `PATCH /admin/:id/status` — (ADMIN)
- `DELETE /admin/:id` — (ADMIN)

### 8.3.13 Customers — `/api/v1/customers`
- `GET /shop/:shopId` — عملاء المتجر
- `PUT /:customerId/status` — تحديث حالة
- `POST /send-promotion` — إرسال ترويج
- `POST /convert` — تحويل

#### 8.3.13.1 Dashboard CRM — Segments & Tags
Segments and customer tags are stored per shop and wired to the dashboard CRM.

**Segments — `/api/v1/shops/:shopId/segments`:**
- `GET /` — list segments (returns `{ success, data: [...] }`)
- `POST /` — create segment
  ```json
  {
    "name": "VIP Customers",
    "nameAr": "عملاء VIP",
    "description": "string",
    "criteria": { "minSpent": 5000, "minOrders": 3 },
    "isActive": true
  }
  ```
- `PATCH /:id` — update segment (name, nameAr, description, criteria, isActive)
- `DELETE /:id` — delete segment

Segment fields returned:
`id, shop_id, name, nameAr, description, criteria (object), isActive, createdAt, updatedAt`

**Tags — `/api/v1/shops/:shopId/tags`:**
- `GET /` — list tags
- `POST /` — create tag
  ```json
  { "name": "VIP", "nameAr": "VIP", "color": "#F59E0B", "description": "string", "isActive": true }
  ```
- `PATCH /:id` — update tag
- `DELETE /:id` — delete tag

Tag fields returned:
`id, shop_id, name, nameAr, color, description, isActive, createdAt, updatedAt`

All segment/tag routes require authentication and authorize the caller to the `:shopId` (admin or merchant owner of the shop).

### 8.3.14 Courier — `/api/v1/courier`
- `GET /state` — حالة الكابتن (COURIER)
- `PATCH /state` — تحديث الحالة (COURIER)
- `GET /offers` — عروض التوصيل (COURIER)
- `POST /offers/:id/accept` — قبول (COURIER)
- `POST /offers/:id/reject` — رفض (COURIER)

### 8.3.15 Users — `/api/v1/users`
- `PATCH /me` — تحديث بروفايلي
- `GET /couriers` — (ADMIN)
- `POST /couriers` — (ADMIN)
- `GET /couriers/pending` — (ADMIN)
- `PATCH /couriers/:id/approve` — (ADMIN)
- `PATCH /couriers/:id/reject` — (ADMIN)

### 8.3.16 بقية الدومينات (مثبتة في `app.go`)
- `apps` — `/api/v1/apps`
- `bookings` — `/api/v1/bookings`
- `cartevent` — `/api/v1/cartevent`
- `chat` — `/api/v1/chat`
- `hr` — `/api/v1/hr`
- `mapdomain` — `/api/v1/mapdomain` (اسم الحزمة `mapdomain` لتفادي تعارض الكلمة المحجوزة)
- `measurement` — `/api/v1/measurement`
- `portal` — `/api/v1/portal`
- `reviews` — `/api/v1/reviews`
- `search` — `/api/v1/search`
- `shopimagemap` — `/api/v1/shopimagemap`
- `support` — `/api/v1/support`

> لأي دومين غير موثّق تفصيليًا أعلاه: المرجع هو `gobackend/internal/<domain>/` + تسجيل المسار في `internal/app/app.go`.

## 8.4 مسارات تشغيلية خارج `/api/v1`
- `GET /monitoring/live` — liveness
- `GET /monitoring/ready` — readiness (يفحص DB/Redis)
- `GET /monitoring/health` — صحة شاملة
- `GET /metrics` — مقاييس Prometheus
- `GET /api/v1/status` — حالة API داخل النسخة

## 8.5 رموز الخطأ الشائعة (Common Error Codes)

الصيغة دائمًا: `{success:false, error:<code>, message, fields?}`.

### 8.5.1 رموز المصادقة
```
unauthorized: غير مصدَّق (توكن مفقود/منتهي/غير صالح)
insufficient_role: الدور غير كافٍ (مثال: GET /api/v1/shops/me بدون MERCHANT/ADMIN)
forbidden: ممنوع
not_found: غير موجود
```

### 8.5.2 رموز التحقق
```
validation_error: حقل مفقود أو تنسيق خاطئ (مع fields)
conflict: المورد موجود مسبقًا
```

### 8.5.3 رموز العمل
```
insufficient_stock: مخزون غير كافٍ
shop_inactive: المتجر غير نشط
payment_failed: فشل الدفع
```

### 8.5.4 رموز النظام
```
internal_error: خطأ داخلي
rate_limited: تجاوز حد المعدل
service_unavailable: الخدمة غير متاحة مؤقتًا
```

## 8.6 أفضل الممارسات (Best Practices)

### 8.6.1 استخدام الـ API
```
// 1. استخدم الـ Authorization header دائماً للمصادقة
Authorization: Bearer <jwt_token>

// 2. استخدم الـ Content-Type المناسب
Content-Type: application/json
Content-Type: multipart/form-data (للرفع)

// 3. تعامل مع الـ pagination بشكل صحيح
GET /api/v1/products?page=1&limit=20

// 4. استخدم الـ filtering والـ sorting
GET /api/v1/products?category=electronics&sortBy=price&order=asc

// 5. تعامل مع صيغة الخطأ الموحدة
{
  "success": false,
  "error": "insufficient_role",
  "message": "Merchant or admin role required"
}
```

### 8.6.2 Rate Limiting
```
// حدود المعدل مطبَّقة عبر middleware (RateLimiter + SlowDown + Auth rate limit)
// Auth endpoints: حدود أشد (login/signup/refresh)
// راجع ترتيب الميدلوير في docs/04-backend-guide.md
```

### 8.6.3 اتصال الفرونت
```
// الفرونت لا يتصل بـ :4000 مباشرة في الكود — يستخدم نفس الأصل + rewrite:
// /api/:path* → http://localhost:4000 (apps/dashboard-web/next.config.mjs)
```
