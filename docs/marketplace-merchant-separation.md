# فصل Marketplace عن مواقع التجار

## القرار المعماري

- **Nami Dashboard / Website Builder**: إدارة التاجر ومنشئ الموقع.
- **Menmakank Marketplace**: تجربة اكتشاف موحدة بهوية من مكانك، وصفحة متجر موحدة لكل التجار.
- **Merchant Storefront**: تطبيق نشر مستقل لموقع كل تاجر، بهوية التاجر وسلته وCheckout الخاص به.
- **Go Backend + PostgreSQL**: مصدر الحقيقة المشترك للمتاجر والمنتجات والمخزون والطلبات.

فصل التطبيقات لا يعني تكرار بيانات المنتجات أو المخزون أو حسابات التجار.

## سياسة Marketplace

داخل Marketplace، كل مسارات اكتشاف المتاجر تفتح دائمًا صفحة `/shop/:slug` بهوية من مكانك، سواء كان موقع التاجر منشورًا أم لا:

- كروت المتاجر.
- البحث.
- pins الخريطة.
- روابط المتجر من صفحة المنتج.
- الروابط المباشرة إلى صفحة المتجر.

تمت إزالة مسار `?view=site` من صفحة Marketplace الموحدة حتى لا يتحول رابط داخل Marketplace إلى قالب التاجر. نشر الموقع يفعّل فقط رابط «الموقع الرسمي» الصريح، ولا يغيّر وجهة اكتشاف المتجر.

## تطبيق Merchant Storefront المستقل

تم إنشاء workspace جديد في `apps/merchant-storefront`:

- يعرض الموقع المنشور باستخدام renderer الحالي من Builder.
- يركّب `SiteCartProvider` منفصلًا لكل slug.
- يوفّر Checkout الموقع المنشور، صفحة الحجز، وتتبع الطلب.
- يدعم subdomains الخاصة بالمنصة مثل `{slug}.mnmknk.com` و`{slug}.ray.eg` بعد ضبط wildcard DNS وربط الدومين بمشروع النشر الجديد.
- يدعم مؤقتًا الروابط القديمة `/site/:slug` على دومين المتجر ويحوّلها داخليًا إلى مسار التطبيق المستقل.

هذا **فصل على مستوى التطبيق والنشر**، لكنه ما زال يعيد استخدام بعض ملفات renderer من `apps/marketplace-next`. الخطوة اللاحقة هي نقل runtime المشترك إلى package مستقل لإزالة الاعتماد على مصدر تطبيق آخر.

## إعدادات النشر المطلوبة

أنشئ مشروع Vercel منفصلًا واجعل Root Directory:

`apps/merchant-storefront`

المتغيرات المطلوبة:

```env
BACKEND_URL=https://<go-backend-origin>
NEXT_PUBLIC_MERCHANT_ROOT_DOMAINS=mnmknk.com,ray.eg
NEXT_PUBLIC_MERCHANT_STOREFRONT_MODE=standalone
NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE=https://{slug}.mnmknk.com
```

يجب ضبط `NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE` أيضًا في مشروع Marketplace حتى يفتح زر «الموقع الرسمي» التطبيق المستقل. يجب أن يتطابق القالب مع النطاقات التي تم إعداد DNS لها.

**لا يتم تحويل DNS أو إيقاف renderer القديم قبل نجاح build وsmoke tests على مشروع النشر الجديد.** أبقِ `/site/:slug` القديم كمسار rollback مؤقتًا.

### حدود النطاقات المخصصة

التطبيق الجديد لا يخمّن أن اسم الدومين المخصص هو slug متجر. ربط custom domains يحتاج endpoint موثوقًا من Backend يحلّ الدومين إلى متجر، مع إثبات ملكية الدومين وحالة التفعيل. لا تفعّل custom domains قبل إضافة هذا المسار.

## فصل السلات والطلبات

- Marketplace يستخدم `CartProvider` وسلة متعددة المتاجر وCheckout الخاص بالـ Marketplace.
- Merchant Storefront يستخدم `SiteCartProvider` بمفتاح منفصل لكل تاجر وCheckout الموقع.
- الطلبات تظل مرتبطة بمتجر واحد في نموذج الطلب الحالي؛ Marketplace ينشئ طلبًا مستقلًا لكل متجر في checkout متعدد المتاجر.
- أضيف حقل `salesChannel` مستقل عن `source` القديم:
  - `marketplace`
  - `website`
  - `pos`
- migration `000093_orders_sales_channel` تضيف الحقل والفهرس مع إبقاء `source` للتوافق.

**لم يتم تنفيذ Parent Order / Child Orders بعد.** Checkout متعدد المتاجر ما زال ينشئ طلبًا لكل متجر؛ تحويله إلى Parent Order جامع يحتاج تصميمًا واختبارات ذرية للإلغاء والاسترداد والتوصيل والرسوم، ولا ينبغي ادعاء اكتماله في هذه المرحلة.

## متطلبات التحقق قبل الإطلاق

1. Build وtypecheck لتطبيق Merchant Storefront.
2. اختبار متجر منشور وغير منشور، وموقع مجهول يجب أن يرجع 404.
3. اختبار إضافة المنتجات للسلة والتأكد أن سلة الموقع لا تختلط بسلة Marketplace.
4. اختبار checkout كضيف وكعميل مسجل، والتحقق من `salesChannel` في DB ولوحة التاجر.
5. اختبار subdomain والجذر والروابط المتداخلة وcheckout والتحديث وزر الرجوع.
6. اختبار official-site link من Marketplace إلى النطاق المستقل.
7. اختبار أن Marketplace يفتح دائمًا `/shop/:slug` ولا يفتح قالب التاجر.
8. اختبار rollback إلى renderer القديم قبل تحويل DNS.
9. لا تفعّل custom domains حتى اكتمال domain resolution والتحقق من الملكية.
