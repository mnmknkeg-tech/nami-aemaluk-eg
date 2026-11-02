# MAINTENANCE — نتائج التنظيف الشامل 2026-09-20

> ملخص عملية التنظيف والترتيب الكاملة، والقرارات المتخذة، وما تبقّى كخطة متابعة.

## إصلاحات إنتاج — حساب التاجر (2026-09-20)

من سجل أخطاء التاجر على النسخة المنشورة (`dashboard-web-three-kappa.vercel.app`):

| العرض                                                                       | السبب الجذري                                                                                                                                                | الإصلاح                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/shops/me` → **404** يتكرر (عاصفة طلبات + "الإعدادات مش شغاله") | تاجر جديد = لا يوجد صف متجر بعد؛ `GetMyShop` كان يرجع `errors.NotFound` فاعتبر 91 مستورداً للـ endpoint أنه خطأ وأعاد المحاولة                              | الباكند يرجع الآن `200 {data: null}` — الحالة الطبيعية "لا متجر بعد"؛ صفحة الإعدادات تعرض "لم يتم العثور على بيانات المتجر" بدل الخطأ الأحمر، والفlood يختفي (الرد الناجح يُخزَّن في كاش GET) |
| `POST /api/v1/auth/refresh` → **403**                                       | الـ endpoint غير معفى من CSRF، ويُنادى بدون bearer (النقطة كلها أن الـ token انتهى) وبدون هيدر X-CSRF-Token. محلياً لا يظهر لأن CSRF يُتجاوز في development | أُضيف `/auth/refresh` و`/auth/logout` لقائمة الإعفاء (كوكي الجلسة SameSite=Lax لا يُرسل عبر المواقع أصلاً — لا سطح هجوم)، والعميل يرسل الهيدر أيضاً كحزام أمان                                |
| `GET /orders/me?limit=200` → **401** متتالية                                | انعكاس لفشل الـ refresh أعلاه: انتهاء الـ token → refresh يفشل 403 → كل النداءات 401                                                                        | يُحل تلقائياً بإصلاح الـ refresh (401 → refresh ناجح → إعادة المحاولة)                                                                                                                        |
| اختبارات الأمان الجديدة `test/security/*` تفشل typecheck                    | alias `@marketplace-lib/*` غير معرّف                                                                                                                        | أضيف إلى `tsconfig.json` الجذر — الاختبارات العشرة نجحت                                                                                                                                       |

**مهم**: هذه الإصلاحات في الشجرة المحلية — يجب رفع الباكند والفرونت للإنتاج حتى تظهر النتائج.

## ما تم تنفيذه

### 1) إصلاحات حرجة (كانت تكسر النظام)

| المشكلة                                                                                                  | الإصلاح                                                                                                                   |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `migrations/000061` و `000063` بدون `.up.sql` (كسرت أي قاعدة بيانات جديدة)                               | استرجاع الـ up files من الأرشيف القديم                                                                                    |
| إخفاء فشل الـ migrations: `db.go` كان يمسح `dirty` تلقائياً عند الإقلاع                                  | أُزيل السطر — فشل الـ migration يوقف التشغيل كما يجب                                                                      |
| ترجمات marketplace لا تُحمَّل إطلاقاً (مسار `../../packages/...` غير موجود في `src/lib/i18n.ts`)         | استيراد ثابت لملفات JSON عبر `@shared/i18n/locales/...`                                                                   |
| تعارض مسار `/couriers` (دومين courier ظِل خلف مسارات users في Fiber)                                     | حذف دومين `courier` الميت بالكامل (320 سطراً)                                                                             |
| دومين `finance` كامل يضرب جداول `fin_*` **غير المنشأة في أي migration** (تأكدنا من قاعدة البيانات الحية) | تحوّل لتقارير فقط (revenue/profit/cashflow) — 1,485 → 325 سطراً، والـ CRUD للجداول الميتة حُذف (مكرر مع accounting أصلاً) |

### 2) حذف الكود الميت

- **حزم أصداف بالكامل**: `packages/{types,ui,utils,config}` (كانت مجلدات `dist/` فقط بدون source ولا package.json، وصفر استخدام).
- **`packages/shared`**: من 3.2MB/353 ملفاً إلى أقل من 1MB. حُذفت: `components/pages` (94 ملفاً)، `services/`، `hooks/`، `components/{ui,features,ai-visual-editor,seo}`، `utils/` كاملة، `lib/` كاملة، `legacy-types`، `constants` — كلها غير قابلة للوصول من أي تطبيق (الاستخدام الحي: `builder/`، `components/common/{ConsentBanner,BreachNotice,PageVisitTracker,QueryProvider}`، `i18n/`، `types/pageSchema`).
- **gobackend**: `internal/domains/sessions` (غير مسجّل)، `pkg/` (واجهات لم تُربَط)، `sqlc/` (scaffolding لم يُولّد أي كود)، `scripts/tmpmint.go`.
- **صفحات routes ميتة**: `apps/*/src/app/` (كانت مطغاة بـ `app/` الجذري في Next.js، ومنحرفة عن النسخ الحية).
- اختبار ميت كان يستورد `lib/retry-manager` المحذوف.

### 3) توحيد المكرر (مصدر واحد + سحب)

| الكود المكرر                                          | المصدر الوحيد الآن                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `QueryProvider` ×2 (متطابقان)                         | `@ray-eg/shared/components/common/QueryProvider` — نسخ التطبيقات أصبحت re-export        |
| `pageSchema.ts` (marketplace مطابق + dashboard منحرف) | `@ray-eg/shared/types/pageSchema` — marketplace re-export، ونسخة dashboard الميتة حُذفت |
| `types/builder.ts` في marketplace (425 سطراً منحرفاً) | `@ray-eg/shared/builder/types` (re-export)                                              |
| كاتالوج الأنشطة ×2 (906 + 897 سطراً منحرفان)          | `@ray-eg/shared/utils/businessActivityCatalog` — business يسحب منه                      |
| `fmtEGP/fmtNum/fmtPct` ×4 أقسام تحليلات dashboard     | تصدير من `InsightsShared.tsx`                                                           |
| `fail()` + `resolveShop()` بين finance/accounting     | `gobackend/internal/platform/httpx`                                                     |
| إعداد المايّل في api + worker                         | `mailer.FromConfig(cfg)`                                                                |
| دوال bookings في services الحزمة المشتركة             | `apps/dashboard-web/src/lib/api/bookings.ts` (على client الـ dashboard نفسه)            |

### 4) الخردة

- حُذفت ~50MB سجلات + 4 ملفات exe (~200MB) + `bin/` + مخلفات فحص (fe-calls.tsv، probe-final.txt...) + `NUL` + `_archive/` + مجلدات فارغة.
- **git rm** لما كان متتبعاً: `gobackend/_b.txt`، `_gt.txt`، `restart.ps1`، `logo-business.png` (غير مرجع).
- **إلغاء تتبع** شهادات `apps/marketplace-next/certificates/*.pem` (مفتاح خاص كان في git! الملفات باقية على القرص للتطوير).
- تقارير الجذر → `docs/reports/`، الأدلة → `docs/guides/`، سكربتات الفحص الواحد → `scripts/oneoff/`، `gen-cert.js` → `scripts/`.

### 5) ضخ الـ requests (الفلتر)

- **السبب الرئيسي**: dashboard-web فيها QueryProvider لكن **صفر صفحات تستخدم useQuery** — 95 صفحة تعمل `useEffect + apiRequest` خام، فكل تنقّل يعيد كل الطلبات (صفحة analytics تطلق ~19 طلباً بالتوازي عند الفتح).
- **الحل المطبق (بدون تعديل الصفحات)**:
  - `lib/auth.tsx`: كاش GET لمدة 30 ثانية + دمج الطلبات المتطابقة المتزامنة (in-flight dedup) + أي POST/PATCH/DELETE يمسح الكاش.
  - `marketplace lib/api.ts`: نفس الكاش لجانب المتصفح (`next.revalidate` كان يعمل للسيرفر فقط).
  - `useOrderBell`: polling كل 6 ثوانٍ → 30 ثانية + توقف كامل عند إخفاء التبويب.
  - خريطة marketplace: نفس بوابة الـ visibility.
- النتيجة: التنقل داخل dashboard يعيد استخدام البيانات خلال 30 ثانية بدل إطلاق كل شيء من جديد.

## التحقق النهائي

- `tsc --noEmit` نظيف في الجذر + كل الـ workspaces.
- `go build` + `go vet` + `go test ./cmd/... ./internal/...` كلها ناجحة.
- `next build` لتطبيق marketplace ناجح.

## خطة متابعة (لم تُنفَّذ عمداً)

### توحيد صفحات add-product الـ11 (~11,900 سطر)

الصفحات تشترك في ~45% فقط — النصف الآخر حقول/تحقق/أقسام خاصة بكل نشاط، والمستخدم يعمل في نفس المنطقة حالياً. الخطة المقترحة عندما يجهز الوقت:

1. استخراج `AddProductFormBase` في `src/components/inventory/` (الحقول المشتركة: الاسم/السعر/الصور/الستوك/الباركود + منطق الحفظ في `apiRequest('/products/manage/...')`).
2. لكل نشاط ملف إعداد: `verticals/retail.ts` إلخ — يعرّف الحقول الإضافية وقيم الـ defaults وشكل الـ payload.
3. كل صفحة تنكمش إلى ~30 سطراً: `<AddProductFormBase vertical={retail} />`.
4. التنفيذ تيك بيك: نشاطان أولاً (retail + electronics لأنهما الأقرب)، ثم الباقي، مع اختبار إنشاء منتج فعلي لكل نشاط.

### تحسينات لاحقة أخرى

- تبنّي `useQuery` تدريجياً في الصفحات الأثقل (analytics أولاً — 19 طلباً في mount؛ يمكن تحميلها لكل تاب نشط).
- `Product/Shop` types: الـ 9 تعريفات هي أشكال سياقية مختلفة فعلاً — عند توحيد الـ API layer، وحّد الأنواع معه.
- توحيد الـ 6,250 سطراً من بيانات قوالب الأنشطة في `dashboard-web/src/components/website-builder/data/` (تحتاج فهم فروق الشكل أولاً).
- 2FA recovery codes لا تزال TODO في `internal/domains/auth/service.go:470-490`.
- عامل `ImageOptimize` في الـ worker لا يزال no-op.
