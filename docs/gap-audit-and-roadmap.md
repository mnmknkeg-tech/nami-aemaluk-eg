# فحص شامل للنواقص (صفحات + محتوى + APIs) وخطة التنفيذ

**التاريخ:** 2026-09-15
**الطريقة:** فحص فعلي بالكود + Probe حقيقي على `http://localhost:4000` (الباك شغّال) — مفيش تخمين.
**السكربتات:** `scripts/audit-routes2.ps1`, `scripts/audit-full.ps1`, `scripts/audit-links.ps1`, `scripts/audit-catchall.ps1`, `scripts/probe-final.ps1`
**المخرجات الخام:** `probe-final.txt` (237 سطر), `be-paths.txt` (414 مسار باك), `fe-paths.txt` (198 مسار فرونت), `links-out.txt`, `catchall-out.txt`

---

## 0) الملخص التنفيذي

| المؤشر | الرقم |
| --- | --- |
| مسارات الباك المسجلة | **414** |
| مسارات فريدة يطلبها الفرونت | **198** |
| ✅ تعمل بشكل صحيح | **151** (76%) |
| ❌ **مفقودة كلياً (404)** | **47** (25 لوحة تحكم + 22 سوق) |
| صفحات إجمالية في التطبيقات الثلاثة | **206** (36 سوق + 155 لوحة + 15 أعمال) |
| صفحات "قيد التطوير" صلبة (stub) | **13** |
| صفحات catch-all وهمية | **2** (`/dashboard/[...slug]`, `/admin/[...slug]`) |
| روابط جانبية بتقع في الـ catch-all الوهمي | **20** |
| روابط ميتة (dead links) | **11** (6 سوق + 2 لوحة + 3 أعمال) |
| صفحات سوق بلا SEO metadata | **14 من 36** |
| ملفات معالجة أخطاء ناقصة | لوحة التحكم بلا `error.tsx` / `not-found.tsx` / `global-error.tsx` |
---

## 1) النواقص في الباك — 47 مسار مُرجع 404

> المنهجية: كل مسار استُخرج من كود الفرونت (`apiRequest`) وتم نداؤه فعلياً بـ 5 ميثودز. النتيجة `404` على الخمسة = المسار غير موجود أصلاً.

### 1.1 منصة المواقع `websites/*` — 10 مسارات ❌ **عائلة كاملة مفقودة**
| المسار | يستخدمه |
| --- | --- |
| `/websites/{id}/pages` و `/websites/{id}/pages/{id}` | `marketplace-next/src/lib/platform/services.ts` |
| `/websites/{id}/menus` و `/websites/{id}/menus/{id}` | نفس الملف |
| `/websites/{id}/blog` و `/websites/{id}/blog/{id}` | نفس الملف |
| `/websites/{id}/analytics` | نفس الملف |
| `/websites/{id}/seo-report` | نفس الملف |
| `/shops/{id}/website` | `app/site/[slug]/page.tsx` |
| `/templates`, `/templates/{id}`, `/themes` | `lib/platform/services.ts` |

### 1.2 إعدادات المتجر والوسائط — 8 مسارات ❌
| المسار | يستخدمه |
| --- | --- |
| `/shops/{id}/settings` | `lib/platform/services.ts` |
| `/shops/{id}/media` + `/shops/{id}/media/{id}` + `/shops/{id}/media{}` | نفس الملف |
| `/shops/{id}/integrations` + `/shops/{id}/integrations/{id}` | نفس الملف |
| `/shops/{id}/products` | `dashboard-web/.../pos/page.tsx` + `marketplace-next/src/lib/services.ts` |

### 1.3 الذكاء الاصطناعي `ai/*` — 5 مسارات ❌ **عائلة كاملة مفقودة**
| المسار | الصفحة |
| --- | --- |
| `/ai/analysis/shop/{id}` | `dashboard-web/.../ai/analysis/page.tsx` |
| `/ai/automations/shop/{id}` | `.../ai/automations/page.tsx` |
| `/ai/images/shop/{id}` | `.../ai/images/page.tsx` |
| `/ai/insights/shop/{id}` | `.../ai/insights/page.tsx` |
| `/ai/seo/shop/{id}` | `.../ai/seo/page.tsx` |

### 1.4 المحادثات `chats/*` — 3 مسارات ❌ **شكل مختلف**
| المسار المطلوب | البديل الموجود في الباك |
| --- | --- |
| `/chats`, `/chats/{id}`, `/chats/shop/{id}` | `/chat`, `/chat/{id}`, `/chat/{id}/messages` |

> **القرار:** alias في الباك أحسن من تعديل الفرونت (الفرونت مستخدم في 3 صفحات CRM).

### 1.5 تحليلات وموارد بشرية — 8 مسارات (أسماء مختلفة)
| المطلوب | الموجود فعلاً | الحل |
| --- | --- | --- |
| `/analytics/kpi/shop/{id}` | `/analytics/shop/{id}/overview` | alias |
| `/analytics/charts/shop/{id}` | `/analytics/shop/{id}/overview` + `/traffic` | alias |
| `/analytics/sales-performance/shop/{id}` | `/analytics/shop/{id}/sales-report` | alias |
| `/analytics/visitors/shop/{id}` | `/analytics/shop/{id}/traffic` | alias |
| `/attendance/shop/{id}` | `/hr/shops/{id}/attendance` | alias |
| `/leaves/shop/{id}` | `/hr/shops/{id}/leaves` | alias |
| `/payroll/shop/{id}` | `/hr/shops/{id}/payroll` | alias |
| `/tasks/shop/{id}` | `/hr/shops/{id}/tasks` | alias |

### 1.6 سلات متروكة — 3 مسارات ❌
| المسار | ملاحظة |
| --- | --- |
| `/abandoned-carts` | الباك فيه `/cart-events/abandoned` بشكل مختلف |
| `/abandoned-carts/stats` | مفقود |
| `/abandoned-carts/{id}/recover` | مفقود (فعل حقيقي: إرسال تذكير) |

### 1.7 متفرقات — 10 مسارات
| المسار | الأولوية | ملاحظة |
| --- | --- | --- |
| `/auth/change-password` | 🔴 عالية | موجود بديل `/portal/change-password` — أضف alias |
| `/auth/deactivate` | 🟡 متوسطة | حذف الحساب — **مفقود فعلاً** |
| `/invoices/{id}/send` | 🟡 متوسطة | إرسال فاتورة بالبريد — مفقود |
| `/shops/{id}/customers/{id}/detail` |  متوسطة | الباك فيه `/shops/{id}/customers/{id}` — أضف alias |
| `/products/manage/by-shop/{id}/import-drafts` | 🟢 منخفضة | استيراد منتجات |
| `/contact` | 🔴 عالية | نموذج تواصل السوق — **مفقود تماماً** |
| `/suggestions` | 🟢 منخفضة | صفحة اقتراحات السوق — مفقود |
| `/marketplace` | 🟢 منخفضة | من `platform/services.ts` — غالباً مسار خاطئ |
| `/blog{}` | 🔴 عالية | استخراج خاطئ لـ `/blog?query` — تحقق من الفرونت |

**الخلاصة:** الباك قوي (414 مسار) والفرونت مغطى بنسبة 76%. فيه **3 عائلات كبيرة** ناقصة فعلاً: `websites/*` (منصة المواقع)، `ai/*`، و`chats/*`. والباقي إصلاحات أسماء مسارات (aliases) + محتوى صفحات.

---

## 2) النواقص في الصفحات (الفرونت)

### 2.1 صفحات "قيد التطوير" الصلبة — 13 صفحة
كلها في `dashboard-web` وكلها بتعرض `PagePlaceholder` فقط بلا أي بيانات:

| # | الصفحة | السطور |
| --- | --- | --- |
| 1-8 | `ai/ai-pages`, `ai/brand-identity`, `ai/data-analysis`, `ai/design-assistant`, `ai/page-builder`, `ai/replies`, `ai/suggestions`, `ai/theme-generator` | 21 |
| 9 | `hr/check-out` | 21 |
| 10 | `hr/permissions` | 21 |
| 11 | `bookings/notifications` | 22 |
| 12 | `bookings/reservations` | 22 |
| 13 | `dashboard/[...slug]` (catch-all) | 26 |

### 2.2 صفحات فارغة (تفعل شيئاً لكنها بلا محتوى) — 18 صفحة
| المجموعة | الصفحات | السطور |
| --- | --- | --- |
| مخزون | `inventory/barcode`, `categories`, `low-stock`, `stock-tracking`, `transfers`, `variants` | 6 |
| حجوزات | `bookings/appointments`, `calendar`, `doctors`, `rooms`, `tables` | 7 |
| تسويق | `marketing/coupons`, `discounts`, `email-campaigns`, `hub`, `push-notifications`, `seasonal-offers`, `sms-campaigns` | 10 |
| مالية | `finance/revenue` | 18 |
| تحليلات | `analytics/logistics`, `finance`, `marketing`, `engagement`, `payments`, `operations` | 22-28 |

### 2.3 روابط جانبية بتقع في الـ catch-all الوهمي — 20 رابط
| المجموعة | الروابط |
| --- | --- |
| `bookings` | `?tab=overview`, `reservations`, `calendar`, `appointments`, `doctors`, `rooms`, `tables`, `notifications`, `settings` (9) |
| `settings` | `?tab=overview`, `store`, `payments`, `notifications`, `apps`, `modules`, `security`, `account`, `social_media`, `receipt_theme` (10) |
| `marketing` | `loyalty-programs` (1) |

> ملاحظة: روابط `settings?tab=` بتعمل redirect لـ `/dashboard/settings` الموجود — التحقق يدوي مطلوب. أما `bookings` فكله وهمي.

### 2.4 روابط ميتة (Dead Links) — 11
| التطبيق | الرابط | من أين |
| --- | --- | --- |
| marketplace | `/profile/orders` | `app/profile/page.tsx` |
| marketplace | `/profile/wishlist` | `app/profile/page.tsx` |
| marketplace | `/profile/addresses` | `app/profile/page.tsx` |
| marketplace | `/profile/settings` | `app/profile/page.tsx` |
| marketplace | `/map/listing/${id}` | `app/map/page.tsx` |
| marketplace | `/fonts/fonts.css` | `app/layout.tsx` — **الملف غير موجود كمورد** (خطأ 404 في كل تحميل) |
| dashboard | `/dashboard/marketing/loyalty-programs` | `marketing/page.tsx` |
| dashboard | `/fonts/fonts.css` | `app/layout.tsx` |
| business | `/solutions` | `components/Sections.tsx` |
| business | `/pending` | `app/signup/page.tsx` |
| business | `/fonts/fonts.css` | `app/layout.tsx` |

> `/shops` في السوق = صفحة redirect من 5 سطور — تحتاج محتوى حقيقي.

---

## 3) نواقص المحتوى والجودة التقنية

| # | النقص | الحالة | الأثر |
| --- | --- | --- | --- |
| 1 | `marketplace-next` بلا SEO metadata | 14 من 36 صفحة | 🔴 ضعف ظهور في جوجل |
| 2 | `dashboard-web` بلا `error.tsx` | مفقود | 🔴 أي خطأ = شاشة بيضاء |
| 3 | `dashboard-web` بلا `not-found.tsx` | مفقود | 🟡 404 بلا هوية |
| 4 | `dashboard-web` بلا `global-error.tsx` | مفقود | 🟡 |
---

## 4) خطة التنفيذ — 5 مراحل

### 🔴 المرحلة 0: إصلاحات فورية (يوم واحد)
- [ ] **T0.1** إنشاء `apps/*/public/fonts/fonts.css` (أو حذف الـ link من الـ 3 layouts) — 3 روابط 404 في كل صفحة
- [ ] **T0.2** إضافة `error.tsx` + `not-found.tsx` + `global-error.tsx` لـ `dashboard-web`
- [ ] **T0.3** إصلاح `/images/app-mockup.png` (إضافة الصورة أو حذف الـ banner)
- [ ] **T0.4** إصلاح 5 روابط ميتة في `marketplace-next` (`/profile/*` و `/map/listing/{id}`)
- [ ] **T0.5** إصلاح روابط `/solutions` و `/pending` في `business`
- [ ] **T0.6** توحيد `loyalty-programs` → مسار حقيقي

### 🟠 المرحلة 1: Aliases في الباك (2-3 أيام) — «أرخص مكسب»
إضافة aliases في `gobackend/internal/app/app.go` بدون كتابة منطق جديد:
- [ ] **T1.1** `analytics/*` aliases (4 مسارات) → `/analytics/shop/{id}/overview|traffic|sales-report`
- [ ] **T1.2** `hr/*` aliases (4 مسارات) → `/hr/shops/{id}/attendance|leaves|payroll|tasks`
- [ ] **T1.3** `chats` aliases (3 مسارات) → `/chat`, `/chat/{id}`, `/chat/{id}/messages`
- [ ] **T1.4** `auth/change-password` alias → `/portal/change-password`
- [ ] **T1.5** `shops/{id}/customers/{id}/detail` alias → `/shops/{id}/customers/{id}`
- [ ] **T1.6** `/abandoned-carts` alias → `/cart-events/abandoned`
- [ ] **T1.7** اختبار: أعد تشغيل `probe-final.ps1` — الهدف: 0 من الفئة دي

### 🟡 المرحلة 2: عائلات APIs جديدة (1-2 أسبوع)
- [ ] **T2.1** `ai/*` — 5 endpoints (service + repo + handler + migration للـ settings)
- [ ] **T2.2** `websites/*` — 10 endpoints (pages, menus, blog, analytics, seo-report) — **أكبر عائلة**
- [ ] **T2.3** `templates` / `themes` — 3 endpoints
- [ ] **T2.4** `shops/{id}/settings|media|integrations|website|products` — 8 endpoints
- [ ] **T2.5** `auth/deactivate` + `invoices/{id}/send` + `contact` + `suggestions`
- [ ] **T2.6** `abandoned-carts/stats` + `abandoned-carts/{id}/recover`
- [ ] **T2.7** `products/manage/by-shop/{id}/import-drafts`
- [ ] **T2.8** اختبار: `probe-final.ps1` → 0 مسار 404

### 🟢 المرحلة 3: بناء الصفحات الوهمية (3-4 أسابيع)
| الأولوية | الصفحة | متطلبات الباك |
| --- | --- | --- |
| 1 | `bookings/*` (5 صفحات) | `/reservations` موجود — اربطها |
| 2 | `marketing/coupons\|discounts\|email-campaigns\|sms-campaigns` (4) | موجودة (401 = محتاجة auth فقط) |
| 3 | `admin/customer-service` (tickets) | `/support/*` موجود |
| 4 | `crm/chats` | alias T1.3 |
| 5 | `inventory/variants\|categories\|low-stock\|transfers\|barcode` (5) | موجودة (401) |
| 6 | `hr/*` (3) | alias T1.2 |
| 7 | `ai/*` (8) | T2.1 |
| 8 | `analytics/*` (6) | alias T1.1 |
| 9 | `website/*` | T2.2 |
| 10 | `marketing/hub\|push-notifications\|seasonal-offers` (3) | جديدة |

### 🔵 المرحلة 4: المحتوى والسيو (أسبوع)
- [ ] **T4.1** إضافة `metadata`/`generateMetadata` للـ 14 صفحة الناقصة في السوق
- [ ] **T4.2** بناء `/shops` كصفحة دليل حقيقي (مش redirect)
- [ ] **T4.3** بناء صفحات `/profile/orders|wishlist|addresses|settings`
- [ ] **T4.4** بناء `/map/listing/{id}` (تفاصيل من الـ pins الموجودة)
- [ ] **T4.5** PWA manifest للوحة التحكم
- [ ] **T4.6** استبدال `/dashboard/[...slug]` و `/admin/[...slug]` بـ 404 حقيقي بعد اكتمال المرحلة 3

### ⚪ المرحلة 5: التجهيز للمستقبل (الموبايل والتوسع)
- [ ] **T5.1** Cursor pagination لكل endpoints الـ lists
- [ ] **T5.2** فصل الـ media عبر CDN (R2 + Cloudflare)
- [ ] **T5.3** ETag / If-None-Match على الـ GETs العامة
- [ ] **T5.4** `/api/v2/mobile/*` BFF routes
- [ ] **T5.5** Redis caching للصفحات read-heavy

---

## 5) KPIs للتحقق من الإنجاز

| المرحلة | مقياس النجاح | الأداة |
| --- | --- | --- |
| 0 | 0 رابط 404 في الـ 3 layouts | فحص يدوي |
| 1 | 404 → **32** مسار (من 47) | `probe-final.ps1` |
| 2 | 404 → **0** مسار | `probe-final.ps1` |
| 3 | stub pages → **0** (من 13) | `audit-links.ps1` |
| 4 | dead links → **0** (من 11) | `audit-links.ps1` |

---

## 6) إعادة تشغيل الفحص

```powershell
cd c:\Users\Dream\ray-eg-1
powershell -ExecutionPolicy Bypass -File scripts\audit-routes2.ps1   # جرد المسارات
powershell -ExecutionPolicy Bypass -File scripts\probe-final.ps1     # probe حقيقي
powershell -ExecutionPolicy Bypass -File scripts\audit-links.ps1     # روابط ميتة
powershell -ExecutionPolicy Bypass -File scripts\audit-catchall.ps1  # صفحات وهمية
```
| 5 | `dashboard-web` بلا PWA manifest | مفقود | 🟡 |
| 6 | `marketplace-next` بلا `not-found` مخصص لكل قسم | 1 عام فقط | 🟡 |
| 7 | صور `AppDownloadBanner` | تشير لـ `/images/app-mockup.png` | 🔴 **الملف غير موجود** |
| 8 | `apps/business/public/manifest.json` | موجود لكن غير مربوط؟ | تحقق |
| 9 | صفحة `download-app` | mockup placeholder | 🟡 |
| 10 | `shop/[slug]` | تخطيط قديم hardcoded | 🟡 |