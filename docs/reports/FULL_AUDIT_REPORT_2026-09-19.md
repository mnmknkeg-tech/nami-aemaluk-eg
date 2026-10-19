# الفحص الشامل الموحد — اللوحة + الماركت + صفحات الهبوط + الباك + الأمان + التوسع

**التاريخ:** 2026-09-19 | **النطاق:** `C:\Users\Dream\ray-eg-1` (مونوربو: 3 واجهات Next.js + باك Go واحد + Postgres + Redis)
**النتيجة التنفيذية:** النظام شغال ومربوط ~85%، لكن **غير جاهز للملايين** (السقف الواقعي آلاف/يوم). توجد **5 ثغرات حرجة** تمنع أي إطلاق إنتاجي قبل إصلاحها، و**خلل جوهري في محرر المواقع** (النشر لا يعرض ما صممه التاجر)، و**فجوة ربط FE↔BE** (~20 endpoint مفقودة/مسماة خطأ)، و**قنبلة أداء** (`images.unoptimized: true` + تجميع التحليلات في المتصفح). كل بند أدناه موثق بـ `ملف:سطر`.

---

## 1) خريطة المشروع (ماذا يوجد فعلا)

| المكون                                           | التقنية                                           | الصفحات/المسارات                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | الحالة                                             |
| ------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `apps/marketplace-next` (الماركت + الهبوط العام) | Next.js App Router                                | ~40 صفحة: `/`, `/about`, `/blog`, `/blog/:slug`, `/checkout`, `/contact`, `/courier`, `/customer-service`, `/dalil`, `/delivery`, `/download-app`, `/login`, `/signup`, `/reset-password`, `/map`, `/notifications`, `/offers` (+3 فرعية), `/privacy`, `/terms`, `/return-policy`, `/product/:id`, `/profile` (+4 فرعية), `/restaurants`, `/search`, `/shop/:slug`, `/shops`, `/site/:slug` (لـ multi-tenant rewrite فقط), `/suggestions`, `/support`, `/track/:id`, `/wishlist`, `/activity/:activity` + `POST/GET /api/revalidate` | يعمل، SEO جيد، لكن i18n مكسور وog-image مفقودة     |
| `apps/dashboard-web` (اللوحة)                    | Next.js                                           | **157 صفحة**: `/login`, `/pending`, `/onboarding/kyc`, `/admin/*` (13 صفحة), `/dashboard/*` (الباقي: ai, analytics, bookings, branches, crm, customers, finance, hr, inventory, marketing, sales, pos, team, website, settings) + كثير منها `published:false` (مخفي إنتاجيا)                                                                                                                                                                                                                                                         | يعمل جزئيا، mock data في الـ builder، TODOs مفتوحة |
| `apps/business` (لاندنج B2B)                     | Next.js                                           | 15 صفحة: `/`, `/about`, `/features`, `/blog` (بلا تفاصيل), `/contact`, `/help`, `/login`, `/signup`, `/new`, `/download-app`, `/terms`, `/privacy`, `/builder` (redirect خارجي), `/dashboard` (redirect خارجي), `/map/add-listing` (بلا `/map`!)                                                                                                                                                                                                                                                                                     | تسويقي static، روابط مكسورة، بيانات وهمية          |
| `apps/cashier-desktop`                           | Electron (كاشير)                                  | خارج نطاق هذا الفحص التفصيلي — يحتاج فحصا مستقلا                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                                  |
| `gobackend` (الباك الوحيد)                       | Go 1.25 + Fiber                                   | **40 دومين** تحت `/api/v1` عبر `gobackend/internal/app/app.go` + `/metrics` + `/api/v1/status` + `/monitoring/health\|live\|ready`                                                                                                                                                                                                                                                                                                                                                                                                   | شغال، غالبية SQL سليمة، لكن 5 ثغرات حرجة           |
| DB / Infra                                       | Postgres 15 (5433) + Redis + MinIO + asynq worker | 70 migration up (000001→000073 مع فجوات)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Indexes ممتازة، pooling بدائي، بلا replicas        |

إطار مشترك سليم: `rewrites /api/:path* → backend` في التطبيقات الثلاثة، هيدرات أمنية (CSP/HSTS/X-Frame-SAMEORIGIN)، `loading.tsx` + `error.tsx` + `not-found.tsx` في معظم المسارات.

---

## 2) أخطاء مؤكدة (BUG) — مرتبة بالأولوية

### B0 — جوهري: النشر لا يعرض ما صممه التاجر (من `WEBSITE_INSPECTION_REPORT.md`، ما زال قائما)

- الداشبورد يحفظ شجرة كاملة في `config.website` (`apps/dashboard-web/src/components/website-builder/context/BuilderContext.tsx:1911` → `PUT /api/v1/builder/:shopId/config`، يستقبلها `gobackend/internal/domains/shops/builder_dto.go:8` كـ `Website map[string]any`).
- لكن `/site/[slug]` (`apps/marketplace-next/app/site/[slug]/page.tsx:64-95`) يعرض **قالبا ثابتا** يقرأ مفاتيح مسطحة فقط (`bannerUrl`, `homeIntroText`, ألوان) — لا كود يعرض `config.website.pages/components`.
- **الأثر:** التاجر يسحب ويفلت وينشر "بنجاح" والزائر يرى القالب الجاهز فقط. **الإصلاح:** بناء renderer للشجرة في `marketplace-next` أو تقليص وعود المحرر.

### B1 — أخطاء BuilderContext (إنتاجية)

1. Dev fallback بـ hardcoded: `BuilderContext.tsx:296-303` ينادي `http://localhost:4000/api/v1/shops/dev-shop-13e8de3a` عند الفشل — في الإنتاج يفشل صامتا ويبقى على بيانات تجريبية.
2. مفاتيح تخزين غير متطابقة: القراءة من `ray_builder_site_local` (`:337`) والحفظ في `ray_builder_site_${builderShopId}` (`:1920,1928`) — الكاش لا يُقرأ أبدا.
3. فشل الحفظ يُعرض كنجاح: `saveDraft` catch يضع `autosaveStatus='saved'` (`:1924-1934`).
4. بند "الموقع الإلكتروني" قد يختفي: `website` غائب من `DEFAULT_FEATURES` في `useVisibleSections.ts` + alias ميت `'my-site'`.
5. إحصاءات نشر وهمية: `totalSizeKb: 120`, `coreWebVitalsEstimatedScore: 98` ثوابت (`:1941-1960`).
6. `customDomain` hardcoded بـ `.mnmknk.com` (`:311`) + `localhost:5174` hardcoded (`:699-701`, `:2456-2458`).

### B2 — ربط FE↔BE مكسور (تحقق ميداني 2026-09-19)

| #   | نداء الفرونت                                                                                                                    | الحالة                                                                                                                                   | الدليل                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | `jsonRequest('/users/me')` في `checkout/page.tsx:41`                                                                            | **404** — لا `GET /users/me` في الباك (الموجود `PATCH /users/me`, `GET /auth/me`) ويفشل صامتا بـ `.catch(()=>{})` فلا يتعبأ الاسم/الهاتف | `apps/marketplace-next/app/checkout/page.tsx:41` |
| 2   | `POST /contact`, `POST /suggestions`                                                                                            | **مفقودة** — لا `/contact` ولا `/suggestions` في الباك                                                                                   | `ContactForm.tsx`, `SuggestionsForm.tsx`         |
| 3   | `GET /blog`, `/templates*`, `/themes*`, `/websites/*`                                                                           | **مفقودة كلها** في الباك                                                                                                                 | `platform/services.ts:25-50,138,147`             |
| 4   | `/abandoned-carts*`                                                                                                             | **تسمية موازية** — الباك عنده `/cart-events/*` فقط                                                                                       | `fe-calls.tsv`                                   |
| 5   | `/ai/*/shop/*`, `/analytics/{charts,kpi,...}`, `/attendance\|leaves\|payroll\|tasks/shop/*`, `/chats*`, `/auth/change-password` | **مفقودة/مسماة differently**                                                                                                             | `missing-endpoints-report.md:26-56`              |
| 6   | `GET /marketing/seasonal-offers/public`, `GET /shops/{}/reviews`                                                                | **500 — handler يكرش** (الأول تعتمد عليه الرئيسية!)                                                                                      | `missing-endpoints-report.md:96-105`             |
| 7   | `/couriers/${courier`, `/accounting/journal/shop/{}${filterStatus`                                                              | **template literals مكسورة** تنتج URLs مشوهة                                                                                             | `delivery/page.tsx`, `finance/journal/page.tsx`  |
| 8   | `/media/upload` (FE) مقابل `/media/presign`+`/complete` (BE)                                                                    | **drift** — الرفع من الداشبورد عبر route وسيط                                                                                            | `be-paths.txt:349-350`                           |
| 9   | `sitemap.ts:94` ينادي `/shops/published-slugs`                                                                                  | **خطأ** — الباك عنده `GET /builder/published-slugs` فقط                                                                                  | `be-paths.txt:79`                                |
| 10  | `/products/manage/by-shop/{}/import-drafts`, `/invoices/{}/send`, `/shops/{}/website`, `/users/{}/bookmarks`                    | **مفقودة**                                                                                                                               | `missing-endpoints-report.md:79-94`              |

### B3 — روابط وصفحات مكسورة/ناقصة

- business `href="/solutions"` (`Sections.tsx:579`) → لا `src/app/solutions/` → **404 مؤكد**.
- business `router.push('/pending')` (`signup/page.tsx:206`) → لا `/pending` في business (موجود في dashboard-web فقط).
- business `/map` غير موجود (فقط `/map/add-listing`)؛ `/admin/gate` مجلد فارغ؛ `MoreSections.tsx:552 href="#"`.
- business `/builder` و`/dashboard` يعملان redirect لـ `https://dashboard.mnmknk.com/...` بينما `marketplace config` تشير لـ `vercel.app` — **تشتت 3 دومينات** لنفس الشيء.
- `NEXT_PUBLIC_DASHBOARD_URL=https://localhost:3010` في `marketplace .env.example` — قيمة مثال خاطئة (https + بورت غير مستخدم).
- تكرار غريب: `src/app/account/privacy/page.tsx` نسخة يتيمة (الحي في `app/account/privacy/`).
- `og-image.png` **غير موجودة** في `public/` (تحققت: `Test-Path` = False) بينما `config.ts:7` و`layout.tsx:32,38` تشيران لها → كل بطاقات OG/Twitter تفتح 404.
- `sessions` دومين موجود كمجلد (`gobackend/internal/domains/sessions`) **غير مسجل في `app.go`** — كود ميت أو ميزة معطلة.

### B4 — i18n مكسور فعليا (تحقق مرتين)

- `getI18n` في `marketplace-next/src/lib/i18n.ts:9` **غير مستخدمة في أي ملف**، ومسار التحميل نفسه خطأ (`../../packages/...` تصل لمسار غير موجود؛ الصحيح `../../../../packages/...`).
- الواقع: `<html lang="ar" dir="rtl">` ثابت (`app/layout.tsx:66`) بلا مبدل لغة — الإنجليزية معلنة في `config.ts` وغير مفعلة.

### B5 — mock/placeholder في كود الإنتاج

- `BuilderContext.tsx:22,401` يستورد ويعرض `mockTenants[0]` كأول tenant + `sampleWebsites` + `mockAssets` كـ fallback بدل شاشة فارغة.
- `dashboard`: TODOs مفتوحة (`VariantsView.tsx:159,171` bulk delete/activate، `CategoriesView.tsx:139,151`، `purchase-orders:482,541` suppliers، `loyalty` bulk points) + نظام `published:false` يخفي أقسام كاملة إنتاجيا (branches, crm, team, أجزاء sales/finance).
- marketplace: `download-app` شارة Coming Soon، الدفع بالبطاقات "قريبا"، صورة `/placeholder-product.png`.
- business: `wa.me/20000000000`, `tel:+20000000000`, `support@mnmknk.com` — أرقام وهمية؛ `download-app` يشير لـ GitHub releases.

---

## 3) الثغرات الأمنية — مرتبة بالخطورة (كلها تحققت من الكود)

### حرجة (تمنع الإطلاق قبل إصلاحها)

- **C1 — توكن Portal قابل للتزوير + تجاوز OTP:** `portal/service.go:307-311` ترجع `portal_{ownerID}_{unix}` نصا صريحا (ليست JWT) — من يعرف ownerID يصنع توكنا. + `service.go:250-264` و`app.go:422`: `disableOtp` في development يتجاوز الكود كليا. **الإصلاح:** JWT موقعة قصيرة العمر + حذف مسار التجاوز + rate limit على OTP.
- **C2 — بذور تجربة + دخول dev بلا credentials:** `auth/service.go:582-598` تزرع 6 حسابات بباسوردات معروفة (`Admin123!`...) عند كل إقلاع non-prod، و`/dev-merchant-login` و`/dev-courier-login` و`/dev-customer-login` (`handler.go:56-65`) بلا credential — الحماية الوحيدة `APP_ENV==production`. **الإصلاح:** build-tags تحذفها إنتاجيا + اشتراط `ADMIN_BOOTSTRAP_TOKEN` + تدوير أي باسورد ظهر في الكود.
- **C3 — `CSRF_DISABLED=true` في الإعداد الفعلي:** `gobackend/.env:30` (تحققت) + `middleware/csrf.go:42,59-61` يتخطى كل الفحوص. مع `AllowCredentials:true` وخطر حقيقي. **الإصلاح:** حذف المتغير + فشل الإقلاع لو true مع production + فحص CI.
- **C4 — خلط Access/Refresh في الميدلوير:** `middleware/auth.go:60-111` يقبل كوكي `ray_session` (وهو **refresh** بعمر 168h) كبديل Bearer لكل endpoints ولا يتحقق من `typ/iss/aud/jti` (بينما `auth/jwt.go:147-169` صارم — المصدر صارم والمستهلك متساهل). **الإصلاح:** توحيد التحقق عبر `TokenService.Parse` + رفض `typ != access` + فصل الكوكيز + revocation عبر `jti`.
- **C5 — أسرار dev ضعيفة:** `gobackend/.env:24` (`JWT_SECRET=dev-secret-...`)، `:26` (`ADMIN_BOOTSTRAP_TOKEN=change-this-...`)، `:10` باسورد DB افتراضية. إيجابي: `.env` **غير متتبع في git** (تحققت: `git ls-files` فارغ) — لكن أي نشر بهذا الملف = اختراق. **الإصلاح:** أسرار عشوائية 32+ بايت خارج الملف + فحص CI يمنع القيم الافتراضية.

### عالية

- **H1 — `/metrics` مفتوح بلا مصادقة** (`app.go:572`) — استطلاع مجاني. قيده بـ IP/token.
- **H2 — IDOR في المالية:** `finance/handler.go:126-146,183-188,224-244,281-301,337-357` تأخذ `:id` بلا `resolveShop` — تاجر قد يعدل سجلات تاجر آخر. **الإصلاح:** `WHERE id=$1 AND shop_id=$2` في كل update/delete + اختبارات متقاطعة.
- **H3 — Admin IP allowlist صورية:** فارغة = no-op (`adminip.go:27-29`)، و`matchIP` بـ `HasSuffix` يطابق `91.2.3.4` مع `1.2.3.4`! ولا CIDR. **الإصلاح:** مطابقة exact + `netip.ParsePrefix`.
- **H4 — CORS متساهل:** أي origin في dev + قبول `origin == ""` حتى إنتاجيا (`cors.go:32-37`) مع `AllowCredentials:true`.
- **H5 — Rate limit فضفاض وfail-open:** الافتراضي `10000/15m` (`config.go:125`)، مفتاح IP فقط، وعند خطأ Redis → `c.Next()`، و`X-Forwarded-For` موثوق دائما بينما `TrustedProxies` إنتاجيا فقط. شدد global + مفتاح `IP+userID` + fail-closed لمسارات auth.
- **H6 — Bootstrap admin دائم التسجيل** (`auth/handler.go:52`) — عطله بعد أول admin (flag في DB) + قفل بعد N محاولات.
- **H7 — 2FA ناقص:** `TODO: RecoveryCode` (`service.go:470,480,490`) + `Disable2FA(ctx, user.ID, "")` (`handler.go:346`) بلا إعادة مصادقة — سرقة جلسة = إسقاط 2FA. اشترط باسورد + TOTP + رموز hashed single-use.
- **H8 — نقطتا SQL للمراجعة:** `pos/repository.go:140` (`LIMIT %d` عبر Sprintf) و`dashboard/finance.go:291-292,334-335` (filter ملصوق نصيا) — الغالبية parameterized سليمة، لكن أثبت عدم وصول input المستخدم.

### متوسطة

- **M1 — Migrations:** 70 up (تحققت بالعد) مع فجوات: لا `000061/000063/000065 up` (يوجد downs فقط) + 35 ملفا بلا down → لا rollback. + `DB_MIGRATE_ON_BOOT=true` في dev خطر.
- **M2 — تسريب أخطاء:** `finance/handler.go:fail` و`dashboard/handler.go:95` ترجعان `err.Error()` (رسائل DB) للعميل — وحد على `platform/errors` envelope.
- **M3 — كوكي access معطل → توكن في JSON + localStorage:** `app.go:246-252` لا يمرر `AccessCookieName` → `handler.go:412` يعود مبكرا. `HttpOnly+Secure+SameSite=Strict` مطلوبة.
- **M4 — Validation غير موحد:** auth/users بـ go-playground، finance بـ validator محلي، dashboard يparse يدويا بلا schema → `data JSONB` تخزن كما هي.
- **M5 — صور خام:** `<img>` بدل `next/image` في `app/page.tsx:111`, `checkout:356`, `SearchBar.tsx:127`, `track/[id]:230`, `login:21`, `signup:23` + `any` منتشر في checkout/Builder.

**سليم تحقق منه:** JWT توقيع HS256 فقط ورفض none + secret≥32؛ security headers؛ `.env` غير متتبع؛ CSRF تصميمه سليم لو فُعّل؛ `LIKE` عبر params ولا ORDER BY ديناميكي.

---

## 4) المحتوى والنواقص (ما ينقص المواقع فعليا)

1. **صفحات ناقصة:** business بلا `/solutions`, `/pending`, `/map`؛ بلا `/blog/:slug`؛ `admin/gate` فارغ. الداشبورد يخفي أقسام `branches/crm/team` وأجزاء sales/finance إنتاجيا — إما نفذها أو احذف روابطها.
2. **SEO/مشاركة:** أضف `og-image.png` الحقيقية (أو غيّر المرجع) + `metadata` لصفحات checkout/search + وحّد sitemap على `/builder/published-slugs`.
3. **i18n:** فعّل الإنجليزية فعلا (مبدل لغة + routing) أو احذف إعلانها.
4. **ثقة العميل:** استبدل الأرقام الوهمية (`20000000000`) والإيميل العام، ووضّح "قريبا" (الدفع، التطبيق) بتواريخ أو أخفها.
5. **حالات فارغة:** وحّد رسائل "لا توجد بيانات" وصور placeholder بأصول حقيقية مضغوطة.

---

## 5) هل يتحمل الملايين؟ لا — والعنق مرتب هنا

**السقف الواقعي اليوم: آلاف/يوم** (وليس عشرات الآلاف فضلا عن الملايين).

| العنق                          | الدليل                                                                                                                                      | الأثر                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| صور غير محسنة                  | `images.unoptimized: true` (تحققت من `next.config.mjs`) — `formats avif/webp` بلا أثر، كل صورة بحجمها الأصلي                                | أكبر مضخم bandwidth وLCP                                           |
| لا كاش للقراءات الساخنة        | صفر استخدام Redis في `domains/products`؛ `Cache-Control: no-store` على كل API (`security.go:37`)                                            | كل زيارة = كويري PG + `COUNT(*)`                                   |
| الفرونت يسحب 200 ويُجمّع محليا | `inventory/products:135`, `sales:438`, `admin/orders:126` بـ `?limit=200` + كل تبويبات analytics (`KpiSection:218`...) تحسب KPIs في المتصفح | انهيار الذاكرة + سقف 200 يخفي الداتا + نقل زائد                    |
| `OFFSET` + `COUNT(*)`          | كل repositories `LIMIT/OFFSET` + total                                                                                                      | يتدهور عند الملايين؛ لا cursor pagination ولا virtualization فعلية |
| نسخة DB واحدة + pool صغير      | `DB_MAX_OPEN_CONNS=25/IDLE=5`، بوستجريس واحدة، بلا PgBouncer/replicas/partitioning                                                          | سقف بضع مئات concurrent                                            |
| لا CDN/edge                    | `cdn-config.md` docs فقط (صفر تطبيق)؛ `docker-compose.prod.yml` مصغر بلا postgres/prometheus/nginx                                          | كل بايت من origin واحد، لا DDoS حقيقية                             |
| عمى تشغيلي                     | عدّادات telemetry بلا `/metrics` endpoint فعلي، بلا Sentry/Jaeger wiring (مفاتيح env فقط)، e2e معلق في CI                                   | أي حادث تحت الحمل يُشخص بالتخمين                                   |

**ملاحظة أمانة علمية:** `SCALING_IMPROVEMENTS.md` يدعي `nginx.conf` و`prometheus.yml` و"10k users" — **لا يوجد أي منها في الريبو** (فُحص الجذر + `gobackend/`) والأرقام تقديرية بلا قياس. `FAULT_TOLERANCE.md` و`MEDIA_OPTIMIZATION.md` نصف حقيقية (circuit breaker/health/lazy موجودة؛ backup scripts وsharp/BullMQ تخص ستاك NestJS المتقاعد).

---

## 6) نتائج التشغيل والتحليل (2026-09-19)

- `go vet ./internal/platform/middleware/...` → **نظيف (pass)**.
- `npx jest --listTests` → **timeout بعد 120s** (عدد/ثقل التستات أو بيئة Windows) — يحتاج تشغيل مجزأ في CI.
- فحوص القراءة المباشرة أكدت: `og-image.png` مفقودة، `CSRF_DISABLED=true`، `images.unoptimized: true`، توكن `portal_*` نصي، فجوات migrations (061/063/065 up)، `.env` غير متتبع (سليم).

---

## 7) خارطة الإصلاح (ماذا تفعل وبأي ترتيب)

### P0 — قبل أي إنتاج (أيام)

1. إصلاح C1 (توكن Portal + حذف `disableOtp`) وC2 (حذف seeds/dev-logins إنتاجيا + تدوير الأسرار) وC3 (تفعيل CSRF) وC4 (تشديد `RequireAuth` + فصل refresh).
2. إصلاح B0 (renderer الشجرة أو تقليص وعود المحرر) + B1 (أكاذيب الحفظ/الإحصاءات).
3. إصلاح 500s (`seasonal-offers/public`, `shops/{}/reviews`) — الرئيسية تعتمد عليها.
4. إغلاق `/metrics` + إصلاح IDOR المالية (H2).

### P1 — للإطلاق المستقر (أسابيع)

5. تسجيل الـ endpoints الغائبة (contact/suggestions/blog/import-drafts/invoices-send) أو حذف نداءاتها + إصلاح template literals + توحيد `/builder/published-slugs` + إصلاح `/users/me` في checkout.
6. إصلاح الروابط المكسورة (solutions/pending/map) وتوحيد الدومينات الثلاثة + إضافة `og-image.png` + تفعيل/حذف i18n الإنجليزية + استبدال الأرقام الوهمية.
7. إكمال 2FA recovery + حماية Disable2FA + إصلاح matchIP/CORS/rate-limit + كوكي access + توحيد الأخطاء والـ validation + downs للـ migrations الحرجة.
8. أداء P0: فعّل تحسين الصور + انقل تجميع analytics للسيرفر (endpoints `GROUP BY`) + Redis read-through للـ hot paths + اكشف `/metrics` فعليا مع تنبيهات.

### P2 — للـ 100k+/يوم ثم المليون+

9. cursor pagination + حد limit عام 50 + إزالة `COUNT(*)` من كل طلب + فهارس تغطية + virtualized tables.
10. PgBouncer + read replica + فصل كتابة/قراءة + طبق `cdn-config.md` فعلا (Cloudflare + R2) + edge rate limiting وWAF.
11. Sentry + OpenTelemetry + idempotency + partitioning للأوامر/الزيارات + شغّل k6 ووثق أرقاما حقيقية + صحح الـ docs لتطابق الكود.
12. فحص مستقل لـ `cashier-desktop` + تفعيل e2e في CI + اختبارات IDOR متقاطعة + اختبار حمل موثق.

---

## 8) الملاحق — أدلة سريعة

- تقارير سابقة محفوظة: `WEBSITE_INSPECTION_REPORT.md` (خلل النشر الجوهري)، `INTEGRATION_STATUS_REPORT.md` (85% ربط)، `missing-endpoints-report.md` و`missing-endpoints-followup.md` (الفجوات)، `fe-calls.tsv` × `be-paths.txt` × `fe-paths.txt` (تقاطع الربط)، `SCALING_IMPROVEMENTS.md` / `FAULT_TOLERANCE.md` / `MEDIA_OPTIMIZATION.md` / `cdn-config.md` (ادعاءات التوسع — تحقق منها كما في §5).
- أوامر إعادة التحقق: `go vet ./internal/...` ، `npx jest --listTests` (مجزأ)، `git ls-files | grep env` (يجب أن يبقى فارغا)، `Test-Path apps/marketplace-next/public/og-image.png` (يجب أن يصبح True).
