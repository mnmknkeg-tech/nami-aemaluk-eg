# 🧪 اختبارات الربط - Manual Testing Checklist

> السياق الحالي: الباك الوحيد هو `gobackend/` (Go 1.25 + Fiber — باك NestJS القديم حُذف 2026-08-24، وتشغيله عبر `go run ./cmd/api` داخل `gobackend/`)، والفرونت ثلاثة تطبيقات Next.js في `apps/` (marketplace-next, dashboard-web, business)، وقاعدة البيانات PostgreSQL على `localhost:5433` بهجرات SQL في `gobackend/migrations/` (لا Prisma)، وRedis على `6379`.

**الهدف:** التحقق الفعلي من أن جميع الـ APIs تعمل كما هو متوقع

---

## 🔐 1️⃣ **اختبار Authentication**

### 1.1 تسجيل الدخول (Login)
```bash
# أ) اختبر الـ Marketplace login
URL: http://localhost:5174/login
بيانات:
  Email: test@example.com
  Password: correct-password

النتيجة المتوقعة:
  ✅ يتم حفظ token في localStorage (ray_token و token)
  ✅ يعاد التوجيه إلى /profile أو الصفحة السابقة
  ✅ Authorization header يُرسل مع الطلبات
```

### 1.2 تسجيل الدخول Dashboard
```bash
# ب) اختبر Dashboard admin login
URL: http://localhost:3000/admin/gate
بيانات:
  Email: test@shop.local
  Password: correct-password

النتيجة المتوقعة:
  ✅ يتم حفظ token في localStorage
  ✅ يعاد التوجيه إلى Dashboard
  ✅ Shop context يُحمّل بنجاح
```

### 1.3 Token Normalization
```bash
# جـ) التحقق من Dual Token Support
في الـ Browser Console:
  localStorage.getItem('ray_token')  → يجب أن يكون متساوي
  localStorage.getItem('token')      → يجب أن يكون متساوي

النتيجة المتوقعة:
  ✅ كلا الـ tokens متطابقة
  ✅ أي واحدة تعمل مع جميع الـ requests
```

---

## 🛍️ 2️⃣ **اختبار Marketplace**

### 2.1 عرض المنتجات
```bash
# أ) تحميل الصفحة الرئيسية
URL: http://localhost:5174/

الفحص:
  ✅ GET /api/v1/products → يجلب المنتجات
  ✅ المنتجات تُعرض بشكل صحيح
  ✅ لا توجد أخطاء CORS في Console

Response Format المتوقع:
{
  "success": true,
  "data": [
    { "id": "...", "name": "...", "price": 100, ... }
  ]
}
```

### 2.2 البحث عن المنتجات
```bash
# ب) اختبر Search
URL: http://localhost:5174/search?q=test

الفحص:
  ✅ GET /api/v1/search/products?q=test
  ✅ النتائج تُعرض بسرعة
  ✅ لا توجد أخطاء API

النتيجة المتوقعة:
  قائمة بالمنتجات المطابقة
```

### 2.3 عملية الشراء
```bash
# جـ) اختبر Checkout
1. أضف منتجات للسلة
2. اذهب إلى /checkout
3. املأ بيانات التوصيل
4. اختر طريقة الدفع

الفحص:
  ✅ POST /api/v1/orders
  ✅ Response يحتوي على order details
  ✅ تُعرض رسالة نجاح
  ✅ السلة تُمسح بعد النجاح

Request Format:
{
  "shopId": "...",
  "items": [
    { "productId": "...", "quantity": 1 }
  ],
  "customerPhone": "01000000000",
  "deliveryAddressManual": "Cairo, Nasr City, 123 Street",
  "deliveryLat": 30.0123,
  "deliveryLng": 31.0456,
  "paymentMethod": "COD",
  "total": 500
}

Response المتوقع:
{
  "success": true,
  "data": {
    "id": "ORD-...",
    "status": "pending",
    "total": 500,
    "createdAt": "2026-08-13T..."
  }
}
```

### 2.4 تتبع الطلب
```bash
# د) اختبر Order Tracking
URL: http://localhost:5174/track/ORD-123

الفحص:
  ✅ GET /api/v1/orders/{orderId}
  ✅ تفاصيل الطلب تُعرض بشكل كامل
  ✅ حالة التوصيل محدثة

Response المتوقع:
{
  "success": true,
  "data": {
    "id": "ORD-...",
    "status": "delivered",
    "items": [...],
    "tracking": {
      "lat": 30.01,
      "lng": 31.01,
      "status": "on_the_way"
    }
  }
}
```

### 2.5 الإشعارات
```bash
# هـ) اختبر Notifications
URL: http://localhost:5174/notifications

الفحص:
  ✅ GET /api/v1/notifications/me
  ✅ قائمة الإشعارات تُحمّل بشكل صحيح
  ✅ PATCH /api/v1/notifications/me/{id}/read يعمل

Response المتوقع:
{
  "success": true,
  "data": [
    {
      "id": "notif-...",
      "title": "...",
      "read": false,
      "createdAt": "2026-08-13T..."
    }
  ]
}
```

---

## 📊 3️⃣ **اختبار Dashboard**

### 3.1 تسجيل الدخول
```bash
URL: http://localhost:3000/admin/gate

خطوات:
  1. اختر "Merchant" أو "Admin"
  2. انقر "Dev Login"
  3. يجب أن يتم التوجيه إلى Dashboard

الفحص:
  ✅ Token يُحفظ بشكل صحيح
  ✅ Shop context يُحمّل
  ✅ الـ Sidebar يعرض معلومات المتجر
```

### 3.2 الجرد (Inventory)
```bash
URL: http://localhost:3000/dashboard/inventory

الفحص:
  ✅ GET /api/v1/shops/me
  ✅ GET /api/v1/products/manage/by-shop/{shopId}?limit=200
  ✅ قائمة المنتجات تُحمّل

إذا حدث خطأ:
  ❌ تحقق من Authorization header
  ❌ تحقق من Response format
  ❌ تحقق من CORS settings

الخطوات:
  1. انقر "إضافة منتج جديد"
  2. ملأ البيانات
  3. اضغط "حفظ"

الفحص:
  ✅ POST /api/v1/products
  ✅ المنتج يُضاف للقائمة
  ✅ لا توجد أخطاء validation
```

### 3.3 الطلبات (Sales)
```bash
URL: http://localhost:3000/dashboard/sales

الفحص:
  ✅ GET /api/v1/orders
  ✅ قائمة الطلبات تُحمّل بشكل كامل
  ✅ التصفية حسب الحالة تعمل

إذا حدث خطأ:
  ❌ تحقق من format البيانات
  ❌ تحقق من دعم الـ pagination

الخطوات:
  1. اختر طلب
  2. انقر "تفاصيل"
  3. انقر "تحديث الحالة"

الفحص:
  ✅ PATCH /api/v1/orders/{id}
  ✅ تُعرض رسالة نجاح
  ✅ الحالة تتحدث على الفور
```

### 3.4 الحجوزات (Bookings)
```bash
URL: http://localhost:3000/bookings

الحالة الحالية: ⚠️ قيد الانتظار

الـ Endpoints الجاهزة:
  POST /api/v1/bookings/guest
  POST /api/v1/bookings/
  GET /api/v1/bookings/me
  GET /api/v1/bookings/

الفحصات المتوقعة:
  [ ] الـ UI يعرض بيانات صحيحة
  [ ] إنشاء حجز جديد يعمل
  [ ] تحديث الحالة يعمل
```

---

## 📸 4️⃣ **اختبار Media/Uploads**

### 4.1 رفع صورة منتج
```bash
في Dashboard → Inventory → Edit Product

الخطوات:
  1. اختر صورة (مثلاً: test.jpg - 2MB)
  2. اضغط "رفع"

الفحص في Network Tab:
  ✅ POST /api/v1/media/presign
    - Request: { "filename": "test.jpg", "mimeType": "image/jpeg", "size": 2097152 }
    - Response: { "uploadUrl": "...", "fields": {...} }

  ✅ PUT <uploadUrl> (صورة مباشرة إلى S3)
    - Body: محتوى الصورة
    - Response: 200 OK

  ✅ POST /api/v1/media/complete
    - Request: { "uploadId": "...", "filename": "test.jpg" }
    - Response: { "url": "https://cdn.../..." }

النتيجة المتوقعة:
  ✅ الصورة تظهر في المعاينة
  ✅ الملف مخزن في S3/R2
  ✅ الرابط يعمل عند الضغط عليه
```

### 4.2 اختبار الملفات الكبيرة
```bash
الملف: large-video.mp4 (100MB)

الفحص:
  ✅ يتم التعامل مع الملفات الكبيرة
  ✅ الضغط والتحسين يعمل
  ✅ بدون timeout أو disconnect

إذا حدث فشل:
  ❌ تحقق من MAX_UPLOAD_SIZE في الـ config
  ❌ تحقق من S3 bucket permissions
  ❌ تحقق من timeout settings
```

---

## 🌐 5️⃣ **اختبار CORS**

### 5.1 الطلبات من origins مختلفة
```bash
في Browser Console:

// من http://localhost:5174 (Marketplace)
fetch('http://localhost:4000/api/v1/products', {
  headers: { 'Authorization': 'Bearer ...' }
})
✅ يجب أن تنجح

// من http://localhost:3000 (Dashboard)
fetch('http://localhost:4000/api/v1/shops/me', {
  headers: { 'Authorization': 'Bearer ...' }
})
✅ يجب أن تنجح

// من origin عشوائي
fetch('http://192.168.1.100:4000/api/v1/products')
❌ في production يجب أن يفشل (في development يمر)
```

### 5.2 التحقق من Headers
```bash
في Network Tab:

اختر أي request من الـ API وتحقق من Response Headers:

✅ مطلوب موجود:
  Access-Control-Allow-Origin: http://localhost:5174
  Access-Control-Allow-Credentials: true
  Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS

❌ إذا كانت مفقودة:
  - تحقق من CORS middleware في Go
  - تحقق من CORS_ORIGIN في .env
```

---

## 🔧 6️⃣ **اختبار البيانات والتوافقية**

### 6.1 Response Format Consistency
```bash
جميع الـ responses يجب أن تتبع هذا الشكل:

نجاح:
{
  "success": true,
  "data": { ... }
}

فشل:
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message"
}
```

### 6.2 Token في Session/Cookie
```bash
التحقق:
  ✅ هل يتم حفظ Token في localStorage؟
  ✅ هل يتم إرسال Token في Authorization header؟
  ✅ هل يتم تنفيذ refresh token flow؟

في Console:
  localStorage.getItem('ray_token')
  localStorage.getItem('token')
  
  يجب أن تظهر قيمة token صحيحة
```

### 6.3 Error Handling
```bash
جرب:
  1. تسجيل الدخول برقم خاطئ
  2. محاولة الوصول لـ endpoint بدون token
  3. محاولة الوصول لـ resource بدون صلاحيات

النتيجة المتوقعة:
  ✅ تُعرض رسالة خطأ واضحة
  ✅ يتم التوجيه لـ login إذا اللزم الأمر
  ✅ بدون stack traces في الـ frontend
```

---

## 📋 7️⃣ **جدول الاختبار النهائي**

| الميزة | الحالة | ملاحظات | الأولوية |
|-------|-------|--------|---------|
| Login | [ ] ✅ | - | 🔴 عالية |
| Marketplace Products | [ ] ✅ | - | 🔴 عالية |
| Checkout | [ ] ✅ | - | 🔴 عالية |
| Dashboard Inventory | [ ] ✅ | - | 🟠 متوسط |
| Dashboard Sales | [ ] ✅ | - | 🟠 متوسط |
| Media Upload | [ ] ✅ | - | 🟠 متوسط |
| Notifications | [ ] ✅ | - | 🟡 منخفض |
| Search | [ ] ✅ | - | 🟡 منخفض |
| Bookings | [ ] ⏳ | Deferred | 🟡 منخفض |
| CORS | [ ] ✅ | - | 🔴 عالية |
| Token Management | [ ] ✅ | - | 🔴 عالية |
| Error Handling | [ ] ✅ | - | 🟠 متوسط |

---

## 🐛 **إذا واجهت مشاكل**

### مشكلة: CORS Error
```
Error: Access to XMLHttpRequest blocked by CORS policy

الحل:
1. تحقق من CORS_ORIGIN في .env
2. تحقق من middleware/cors.go
3. أعد تشغيل Go backend
```

### مشكلة: Token Not Sent
```
Error: 401 Unauthorized

الحل:
1. تحقق من localStorage (ray_token و token)
2. تحقق من Authorization header في Network tab
3. تحقق من getStoredAuthToken() function
```

### مشكلة: S3 Upload Failed
```
Error: S3 upload failed

الحل:
1. تحقق من S3 credentials في .env
2. تحقق من bucket permissions
3. تحقق من presign URL expiry
```

### مشكلة: Database Connection
```
Error: Database connection failed

الحل:
1. تأكد من تشغيل PostgreSQL
2. تحقق من DATABASE_URL
3. تحقق من migrations
```

---

## 📞 **الدعم والإبلاغ**

عند اكتشاف مشكلة:
1. اكتب اسم المشكلة
2. الخطوات لتكرار المشكلة
3. Expected vs Actual behavior
4. Screenshots/logs من Console و Network
5. Browser و OS information

---

**آخر تحديث:** 2026-08-13
