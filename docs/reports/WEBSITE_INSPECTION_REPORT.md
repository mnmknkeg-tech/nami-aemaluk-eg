# تقرير فحص الموقع — محرر المواقع وما حوله (2026-09-12)

فحص شامل بلا أي تعديل كود. كل بند عليه مسار الملف ورقم السطر كدليل.

## 🔴 المشكلة الجوهرية: النشر لا يعرض شعمل المصمم فعلًا

- الداشبورد بلدر يحفظ شجرة صفحات/مكونات كاملة في `config.website`
  (`apps/dashboard-web/src/components/website-builder/context/BuilderContext.tsx:1911` →
  `PUT /api/v1/builder/:shopId/config`، والباكند يستقبلها في
  `gobackend/internal/domains/shops/builder_dto.go:8` كـ `Website map[string]any`).
- لكن الصفحة العامة `/site/[slug]` (`apps/marketplace-next/app/site/[slug]/page.tsx:64-95`)
  تعرض **قالبًا ثابتًا** يقرأ مفاتيح مسطحة فقط: `bannerUrl`, `homeIntroText`, ألوان,
  theme tokens, `rowsConfig` — ولا يوجد **أي كود** في marketplace-next يعرض
  `config.website.pages` أو `config.website.components`.
- **النتيجة:** التاجر يسحب ويفلت ويضيف صفحات، النشر "ينجح"، لكن الزائر يرى القالب
  الجاهز فقط. الـ liveUrl الذي يراه التاجر (`BuilderContext.tsx:369-377` → `/site/<slug>`)
  يفتح نفس القالب الثابت.

## 🐛 أخطاء مؤكدة (BUG)

1. **Dev fallback بـ hardcoded داخل كود الإنتاج** —
   `BuilderContext.tsx:296-303`: عند فشل `/shops/me` يعمل
   `fetch('http://localhost:4000/api/v1/shops/dev-shop-13e8de3a')`.
   في الإنتاج يفشل صامتًا ويبقى المحرر على بيانات تجريبية (`site_al_majd_auto`).
2. **عدم تطابق مفاتيح التخزين المحلي** — القراءة في الـ catch من
   `ray_builder_site_local` فقط (`BuilderContext.tsx:337`) بينما الحفظ يكتب
   `ray_builder_site_${builderShopId}` (`:1920, :1928`) — الكاش لا يُقرأ أبدًا
   عندما يوجد shopId.
3. **فشل الحفظ يُعرض كنجاح** — `saveDraft` catch يعيّن `autosaveStatus='saved'`
   ويظهر رسالة نجاح (`BuilderContext.tsx:1924-1934`).
4. **بند "الموقع الإلكتروني" قد يختفي من القائمة** — `useVisibleSections.ts`:
   `website` غير موجود في `DEFAULT_FEATURES`؛ أول ما يحفظ التاجر
   `enabledFeatures` بدونه يُخفى البند. كذلك alias قديم ميت `'my-site': 'website'` (سطر 31).
5. **رابط إعادة توجيه مكسور** —
   `apps/business/src/app/builder/page.tsx:4` يعيد التوجيه إلى
   `https://dashboard.mnmknk.com/business/builder` — هذا المسار غير موجود في
   dashboard-web (المسار الفعلي `/dashboard/website`) → 404.

## ⚠️ مخاطر (RISK)

6. **إحصاءات نشر وهمية** — `runPublishPipeline` تعرض `totalSizeKb: 120`,
   `coreWebVitalsEstimatedScore: 98`... أرقام ثابتة في الكود (`BuilderContext.tsx:1941-1960`).
7. **بيانات تجريبية كحالة ابتدائية** — المحرر يبدأ بـ
   `sampleWebsites['site_al_majd_auto']` و `mockTenants` و `mockAssets`
   (`BuilderContext.tsx:182-186`)، ومبدّل الـ tenants مبني على الـ mock (`:2139`).
8. **versioning المحلي فقط** — نقاط الاستعادة في ذاكرة المتصفح، الباكند يخزن
   config واحد بدون إصدارات (جدول `shops.builder_config` JSONB — migration 000036).

## 🧟 كود ميت (DEAD CODE)

9. `apps/marketplace-next/src/components/builder/BuilderEditor.tsx` — غير مستورد
   في أي صفحة، وينادي endpoint غير موجود `/api/v1/websites/:id` (سطر 139).
10. Website Services الخمسة في
    `apps/marketplace-next/src/lib/platform/services.ts:25-50`
    (`getWebsites/getWebsite(id)/createWebsite/updateWebsite/deleteWebsite`) —
    كلها على مسارات غير موجودة في الباكند ولا يستخدمها أحد.
11. `apps/dashboard-web/app/dashboard/(main)/ai/page-builder/page.tsx` — مجرد
    PagePlaceholder (ميزة معلنة غير منفذة).
12. جداول قديمة غير مستخدمة في الباكند: `shop_themes`, `theme_templates`
    (`gobackend/migrations/000001_init.up.sql:304,323`).

## 🔧 ملاحظات أصغر

13. `packages/shared/package.json` exports لا تعرّف subpaths الملفات بامتداد
    → `tsc --noEmit` يفشل على `@ray-eg/shared/components/common/ConsentBanner`
    (`apps/dashboard-web/app/layout.tsx:5-6` — TS2307). الـ build يعمل لأن webpack
    يحل الـ exports، لكن أي فحص TS خام/CI يكسر.
14. `FooterVideoBackground.tsx` اسمه "فيديو" وهو خلفية gradient (فيه comment يوضح).
15. `Sections.tsx`/`MoreSections.tsx` في business هي صفحة تسويقية static —
    ليست ستورفرونت (التسمية مضللة فقط).
16. سطر زائد `*clineproceed*` في `.gitignore` الحالي على main (بقايا من rewrite سابق).
17. `customDomain` يُبنى hardcoded بـ `.mnmknk.com` (`BuilderContext.tsx:311`).

## ✅ ما هو سليم

- مسارات الباكند سليمة ومحصنة: builder CRUD + publish (owner-or-admin)،
  ونشر عام مشروط بـ `status='APPROVED'` و `builder_published_at`.
- الستورفرونت الصحيح هو `marketplace-next/app/site/[slug]` مع ISR (revalidate 120).
- الربط الحالي للداشبورد بالباكند صحيح (`/builder/:shopId/config` + `/publish`).
