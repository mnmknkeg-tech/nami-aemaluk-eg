# 📊 dashBoard-Web — لوحة تحكم التاجر

واجهة المثلث للمتاجر — **تصميم الصفحات، البيع، المبيانات، وإدارة المتجر**.

---

## 1. المعمارية

| القطعة      | التقنية                              | المسار                        |
| ----------- | ------------------------------------ | ----------------------------- |
| لوحة التحكم | Next.js 16 + TypeScript + Tailwind 4 | `apps/dashboard-web/`         |
| الباك إند   | Go 1.25 + Fiber                      | `gobackend/`                  |
| البنية      | Mono-repo (npm workspaces)           | `apps/*/`, `packages/shared/` |

الربط: كل تطبيق يعمل **rewrite** للمسار `/api/:path*` إلى `BACKEND_URL` (الافتراضي `http://localhost:4000`).

---

## 2. المهارات الرئيسية

| القسم               | المهارات                                               |
| ------------------- | ------------------------------------------------------ |
| **المتجر**          | إدارة المنتجات، الفواتير، الحسابات، المراجعات، العملاء |
| **المبيانات**       | الدخل، المصروفات، الربح، الفواتير، التسويق             |
| **الموارد البشرية** | الفريق، المهن، الحضور، الرواتب، الإجازات، المهام       |
| **النظام**          | الإعدادات، الأمان، الإشعارات، التكاملات، المستودعات    |

---

## 3. الإعداد والتشغيل

```bash
# 1. تثبيت التبعيات
npm install

# 2. إعداد البيئة (اختياري — defaults كافية للتطوير)
cp .env.example .env

# 3. تشغيل الخادم المحلي
npm run dev
# يفتح على http://localhost:3000
```

### متغيرات البيئة

| المتغير                                   | الافتراضي               | الوصف                    |
| ----------------------------------------- | ----------------------- | ------------------------ |
| `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:4000` | عنوان الباك إند          |
| `NEXT_PUBLIC_BUSINESS_URL`                | `http://localhost:1000` | رابط بوابة الأعمال (dev) |
| `NODE_ENV`                                | `development`           | `production` للنشر       |

---

## 4. الميزات والأمثلة

### التخطيط الصفحات (Page Builder)

- سحب وإفلات: `apps/dashboard-web/src/components/website-builder/`
- إدخال النصوص الغنية: `RichDescriptionEditor.tsx` (يحتوي `sanitizeHtml()` لمنع XSS)
- مُنسق الصور: `SmartImage.tsx`
- سياق البناء: `BuilderContext.tsx`

### المبيانات

- `fetchMyOrders()` / `fetchShopOrders()` / `fetchAdminOrders()` — pagination server-side (cursor + limit)
- `PerformanceAreaChart` — الرسم الرئيسي بالـ Recharts
- `Sparkline` / `StatusDonut` — متجانسون (React.memo)

### المزامنة مع الخادم

- Authentication: `HttpOnly` access/refresh cookies + `X-CSRF-Token` double-submit
- Token refresh: single-flight (core/auth.ts)
- **Security:** CSP header، HSTS، X-Frame-Options، Referrer-Policy، strict HTTPS

### دوره إطلاق السوق

- `HIDE_UNPUBLISHED` (config/sidebar.ts) — يخفي `published: false` الميزات في الإنتاج
- `sales/`, `inventory/`, `pos/`, `bookings/`, `settings/` — sections مُنشأة

---

## 5. الإخلاص والأمان

- صور: `next/image` مع `formats: ['image/avif', 'image/webp']`
- الصفحات: RTL (العربية)، `dir="rtl"`, `lang="ar"`
- _not-found_: `/404` مخصص لغويًا
- _error_: `/error.tsx` مخصص لغويًا

---

## 6. تحديثات أمنية ودورية

| التاريخ    | التعديل                                                                      |
| ---------- | ---------------------------------------------------------------------------- |
| 2026-11-30 | إزالة `authedFetch` المستقل في `imageMaps.ts` — استخدام `apiRequest`(`core`) |
| 2026-11-30 | `callback/page.tsx` — نفس المنصب، `sanitizeHtml`، `clearToken`               |
| 2026-11-30 | `RichDescriptionEditor.tsx` — `sanitizeHtml` مطبق على `innerHTML`            |
| 2026-11-30 | `StoreTab.tsx` — `innerHTML` آمن                                             |

الملفات الأمنية الإضافية في `gobackend/README.md`.
