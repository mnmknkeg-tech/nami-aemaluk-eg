# تقرير تدقيق شامل: منشئ المواقع ومواقع التاجر والثيمات والقوالب ومحرر الأكواد

**المستودع:** `mnmknkeg-tech/nami-aemaluk-eg`

**نطاق التدقيق:**
- منشئ المواقع والـ Canvas والـ Inspector والـ Layers.
- مسارات المعاينة والنشر وموقع التاجر العام.
- بطاقات المنتجات وشبكات المنتجات.
- القوالب والثيمات ومكتبة الأقسام.
- محرر الأكواد المخصص.
- الحفظ التلقائي، النشر، والتوافق بين البيانات القديمة والجديدة.
- فحص TypeScript المتاح.

> لم يتم تعديل أي ملف في المستودع أثناء هذا التدقيق.

## الخلاصة التنفيذية

المشكلة الظاهرة في الصورة ليست مجرد CSS بسيط. السبب الرئيسي هو أن النظام لديه **مصادر عرض متعددة غير موحدة** للبطاقة نفسها، وبعضها لا يفهم عقدة بطاقة المنتج أصلًا. لذلك يمكن أن تظهر البطاقة في المعاينة بشكل، وفي `/site` بشكل آخر، وفي Marketplace بشكل ثالث.

أخطر خلل مؤكد هو أن `BuilderTreeRenderer` في موقع التاجر لا يحتوي مسارًا لعرض عقدة `card` التي تحمل `image + price` كمنتج. هذا المسار يعيدها كـ generic card ويعرض `renderChildren()` فقط. في المقابل، `NodeView` المشترك يحتوي مسارًا مختلفًا لعرض `PublishedProductCard`. هذه الازدواجية تفسر ظهور البطاقة في مكان غير متوقع أو اختلافها بين رابط المعاينة والرابط المنشور.

## الأخطاء المؤكدة

### P0 — بطاقة المنتج غير مدعومة في Renderer الخاص بموقع التاجر

**الدليل:**
- `apps/marketplace-next/src/components/BuilderTreeRenderer.tsx:888-967`
- المسار يعرّف `card` على أنه testimonial / bento / FAQ / generic card فقط.
- لا يوجد شرط مماثل لمسار المحرر:
  `if (node.props.image && node.props.price) { ... ProductCardView ... }`
- البطاقة التي تحتوي `image` و`price` تنتهي في generic card عند السطور `961-967`، فتُعرض كحاوية مع الأبناء فقط، وليس كبطاقة منتج.

**الأثر:**
- عقدة موجودة في شجرة المنشئ قد لا تُعرض في موقع التاجر بنفس المعنى.
- إذا كانت العقدة ضمن Hero أو Grid، فقد تظهر بقالب أو ترتيب غير متوقع.
- أي إصلاح في `ProductCardView` داخل dashboard لا يضمن إصلاح الموقع الحقيقي.

**الإصلاح المطلوب:**
إنشاء Renderer واحد مشترك لبطاقة المنتج، ثم استخدامه في:
1. Canvas داخل dashboard.
2. المعاينة الحية.
3. `/site`.
4. Marketplace `BuilderTreeRenderer`.

كحل سريع مؤقت، يجب إضافة شرط `image + price` قبل generic card في `BuilderTreeRenderer`، لكن الحل الصحيح هو إزالة تكرار منطق البطاقة وربطه بـ `PublishedProductCard`/مكون مشترك واحد.

---

### P0 — اختلاف مباشر بين خصائص Inspector وخصائص Renderer

**الدليل:**
- `ProductCardSection.tsx:102` يقرأ `p.shape`.
- `packages/shared/src/builder/productCard.ts:91-93` يقرأ `p.cardShape`.
- Inspector يحفظ `shape` في السطر `165`، بينما الـ renderer يعتمد افتراضيًا على `cardShape`.

**الأثر:**
- اختيار شكل البطاقة من Inspector قد لا يغيّر البطاقة الفعلية.
- يظهر للمستخدم أنه عدّل الشكل، لكن النشر قد يبقى على `classic`.

**أمثلة أخرى على اختلاف أسماء الخصائص:**
- Inspector: `showBadges` مقابل resolver: `hideBadge` / `badgeHidden` / `showBadge`.
- Inspector: `showStockStatus` مقابل resolver: `showStock` و`hideStock`.
- Inspector يعرض `showPrice`، بينما بعض العقد القديمة تستخدم `hidePrice`.
- Inspector يعرض `columnsDesktop` و`columnsMobile`، بينما بعض الشبكات تعتمد `gridColumns` أو `productsPerRow`.

**الإصلاح المطلوب:**
اعتماد schema موحد canonical، مثل:
```ts
interface ProductCardProps {
  cardShape: ProductCardShape;
  showBadge: boolean;
  showPrice: boolean;
  showStock: boolean;
  showSizes: boolean;
  showDescription: boolean;
  buyButtonMode: BuyButtonMode;
  columnsDesktop: number;
  columnsMobile: number;
}
```
ثم إضافة migration/normalizer واحد للبيانات القديمة، وعدم القراءة المباشرة من أسماء متعددة داخل كل مكون.

---

### P0 — مساران مختلفان لنفس المنتج: `ProductsRenderer` و`CardGridRenderer`

**الدليل:**
- `ComponentRenderer.tsx:634-655` يرسل `card` و`grid` إلى `CardGridRenderer`.
- `ComponentRenderer.tsx:808` يرسل `products` إلى `ProductsRenderer`.
- كلاهما يستورد `ProductCardView`، لكن كل مسار يقرر البيانات والشبكة والتفاعل بطريقة مختلفة.
- النشر يستخدم `PublishedProductCard` داخل `NodeView.tsx:1898-1967`، بينما Marketplace يستخدم منطقًا مخصصًا داخل `BuilderTreeRenderer.tsx:345-553`.

**الأثر:**
- اختلاف الأحجام، الأزرار، روابط التفاصيل، سلوك السلة، والمنتج الحقيقي بين أنواع العقد.
- صعوبة ضمان أن القالب الذي يراه التاجر في المنشئ سيظهر نفسه بعد النشر.

**الإصلاح المطلوب:**
توحيد العقدة إلى نوعين واضحين فقط:
- `product-section`: قسم يحتوي شبكة منتجات حقيقية.
- `product-card`: بطاقة مفردة قابلة للوضع داخل أي Parent.

ويجب أن يمر كلاهما عبر `ProductCardModel` و`ProductCardRenderer` مشتركين.

---

### P1 — تحكم التموضع موجود في البيانات، لكن لا توجد حماية بنيوية تمنع خروج البطاقة من التدفق

**الدليل:**
- `ComponentRenderer.tsx:177-182` يمرر `position`, `top`, `right`, `bottom`, `left`, `zIndex` مباشرة إلى CSS.
- `mergeResponsiveStyles` في `packages/shared/src/builder/responsiveStyles.ts:9-17` يدمج القيم دون أي validation.
- `StyleProperties` يدعم التموضع، لكن Inspector لا يقدم نظامًا واضحًا يبين هل العنصر `flow` أم `absolute` أم `fixed`، ولا يربط ذلك بصلاحية الـ parent.

**الأثر:**
- بطاقة بخصائص قديمة أو موروثة مثل `position:absolute` يمكن أن تبقى فوق العنوان أو خارج القسم.
- إذا كان parent غير `position:relative`، فإن `absolute` قد يتموضع بالنسبة إلى ancestor آخر.
- `zIndex` قد يجعل البطاقة تبدو كعنصر ثابت فوق الصفحة، حتى لو كانت داخل الشجرة.

**الإصلاح المطلوب:**
- أي عنصر `absolute` يجب أن يجعل أقرب parent المباشر `position: relative` تلقائيًا، أو يظهر تحذيرًا واضحًا.
- عدم السماح بـ `fixed` و`sticky` على `product-card` افتراضيًا.
- إضافة زر واضح في Inspector: `ضمن التدفق / مطلق داخل القسم / ثابت`.
- عند تغيير Parent أو نقل العقدة، إعادة حساب التموضع أو تصفير `top/right/bottom/left` عند الحاجة.
- إضافة `data-builder-node-id` لكل wrapper لتسهيل تتبع العنصر في الموقع المنشور.

---

### P1 — احتمال فقدان ترتيب العقدة أو اختلافه عند السحب والإفلات

**الدليل:**
- `useBuilderComponentOperations.ts:321-371` ينفذ `moveNodePosition`.
- العملية تحدث `parentId` و`childrenIds`، لكنها لا تنظف styles القديمة المرتبطة بالسياق السابق.
- نقل بطاقة من Grid إلى Hero، أو من flow إلى absolute parent، لا يعيد ضبط `display`, `width`, `position`, `zIndex` أو grid-related styles.

**الأثر:**
- البطاقة تنتقل منطقيًا في Layers، لكن تظل بصريًا في مكان خاطئ بسبب styles موروثة.

**الإصلاح المطلوب:**
إضافة `normalizeNodeStylesAfterMove()` بعد النقل، مع قواعد حسب نوع الـ Parent.

---

### P1 — النشر قد يعرض بيانات مختلفة عن المحرر بسبب أولوية المنتجات الحقيقية

**الدليل:**
- `BuilderTreeRenderer.tsx:345-359` يعطي أولوية لـ `ctxProducts` الحقيقية على المنتجات المخبوزة داخل القالب.
- المحرر يعتمد `shopProducts` في `BuilderContext.tsx:326-333`، بينما بعض مسارات المعاينة تستخدم بيانات القالب أو `boundProducts`.

**الأثر:**
- عدد البطاقات، الصور، الأسماء، الأسعار، والأبعاد قد تتغير عند الرفع الحقيقي.
- البطاقة قد تصبح أطول أو أقصر فتدفع العنوان أو العناصر المجاورة.

**الإصلاح المطلوب:**
فصل مصدر البيانات عن layout:
- layout ثابت من العقدة.
- catalog binding واضح ومعلن.
- preview يستخدم نفس mapping والـ fallback المستخدم في production.
- إظهار placeholder بنفس أبعاد المنتج الحقيقي عند عدم وجود بيانات.

---

## مشاكل القوالب والثيمات

### 1. القوالب كثيرة ومجزأة مع تكرار واضح

يوجد عدد كبير من مصادر القوالب:
- `initialWebsites.ts`
- `allActivityTemplates.ts`
- `megaTemplatesData.ts`
- `megaTemplatesData2.ts`
- `sectionLibrary.ts`
- مجلدات `templates/automotive`, `allActivities`, `extraActivities`, `sampleActivities`, و`catalog`.

هذا التقسيم ليس خطأ بحد ذاته، لكن لا توجد طبقة schema موحدة تمنع أن ينتج قالب خصائص قديمة مثل `shape` وقالب آخر `cardShape`.

**المطلوب:**
- مصدر canonical واحد لتعريف ComponentNode وprops schema.
- validator للقوالب عند build/CI.
- منع القالب من استخدام prop غير معتمد.
- snapshot tests لكل قالب: render في builder ثم render في production ومقارنة بنية العقد الأساسية.

### 2. الثيمات تغيّر المكونات لا Tokens فقط

`useBuilderTheme.ts:309-314` يحدّث `theme` وقد يحدّث `components` أيضًا عند تطبيق preset.

**الخطر:**
تطبيق ثيم قد يعيد كتابة خصائص أو styles لعناصر موجودة، فيغير موضع البطاقة أو شكلها دون أن يعرف التاجر ما تم تغييره.

**المطلوب:**
- الثيم يغير design tokens فقط افتراضيًا.
- أي تعديل على components يجب أن يكون اختيارًا منفصلًا باسم واضح: `تطبيق Layout preset`.
- سجل يوضح العناصر المتأثرة قبل التطبيق.
- Undo/Redo يغطي tokens وcomponents معًا.

### 3. تعريف `position` موزع في القوالب

يوجد `position: sticky` في عدة قوالب للـ header، كما توجد مواضع أخرى في templates وshared renderers. يجب التحقق أن هذه القيمة لا تنتقل خطأً إلى product card عند cloning أو تطبيق preset.

## محرر الأكواد

### المشكلة الأساسية

محرر الأكواد يحفظ:
- `tsxSnippet`
- `cssSnippet`
- `jsSnippet`
- `propsSchema`

لكن مسار النشر في Marketplace، حسب `BuilderTreeRenderer.tsx:225-232`، يعرض `tsxSnippet` كـ HTML sanitized داخل `dangerouslySetInnerHTML`. هذا ليس React/TSX execution حقيقيًا، وبالتالي اسم `component.tsx` مضلل إذا كان التاجر يتوقع JSX يعمل.

**الأثر:**
- خصائص React أو event handlers داخل snippet لن تعمل كـ React.
- CSS وJS المرتبطان بالمكون لا يظهر من الأدلة الحالية أنهما يطبقان في نفس المسار العام.
- schema لا يبدو أنه يفرض validation فعليًا على props.

**المطلوب:**
- إعادة تسمية الملف إلى `markup.html` إذا كان الناتج HTML فقط، أو بناء sandbox/compile pipeline حقيقي للـ TSX.
- تطبيق CSS scoped باستخدام data attribute مثل `[data-builder-node-id="..."]`.
- منع JS العام غير الموثوق، مع API أحداث محدد.
- تطبيق `propsSchema` في Inspector لإنشاء controls تلقائيًا.
- إظهار preview مطابق للنشر مع نفس sanitizer وCSS isolation.

## الحفظ والنشر

### مشكلة versioning واضحة

في `useBuilderPublishing.ts:168-173` يتم إرسال:
```ts
{ clientVersion: 0 }
```
عند النشر، رغم وجود `draftVersionRef` وإدارة optimistic concurrency في `useBuilderHistory.ts`.

**الأثر:**
- قد يحدث رفض أو سلوك غير متسق إذا كانت المسودة على الخادم ليست version صفر.
- واجهة النشر تقول إن النسخة محفوظة، بينما الطلب قد لا يستخدم رقم النسخة الفعلي.

**الإصلاح:**
إرسال `draftVersionRef.current`، وتحديثه من استجابة الحفظ والنشر، مع اختبار تعارض 409.

### مشكلة مصدر الرابط المنشور

`liveWebsiteUrl` في `BuilderContext.tsx:234-237` يشير إلى `/preview` داخل dashboard، بينما الرابط العام يستخدم Marketplace URL في `useBuilderPublishing.ts:66-74`.

يجب وجود contract واحد يحدد بوضوح:
- preview URL.
- draft URL.
- published URL.
- نسخة البيانات التي يعرضها كل رابط.

## فحص TypeScript

تشغيل `npm run typecheck` فشل قبل الوصول إلى فحص ملفات التطبيق بسبب إعدادات البيئة/المشروع:

```text
error TS2688: Cannot find type definition file for 'jest'.
error TS2688: Cannot find type definition file for 'node'.
tsconfig.json(9,5): error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
```

هذا يعني أن CI الحالي لا يعطي ضمانًا موثوقًا بأن أخطاء builder والـ marketplace يتم اكتشافها.

**الإصلاح:**
- تثبيت/ربط `@types/jest` و`@types/node` في workspace الذي يستخدمها.
- إضافة `ignoreDeprecations` مؤقتًا أو إزالة `baseUrl` إن لم يعد مطلوبًا.
- تشغيل typecheck مستقل لكل workspace في CI.
- عدم إخفاء فشل workspace خلف `--if-present`.

## نواقص تمنع الوصول إلى مواقع مخصصة بالكامل

1. **لا يوجد عقد موحد للمكونات** يحدد props وstyles وcapabilities لكل نوع.
2. **لا يوجد parent-aware layout engine** يحدد ما المسموح داخل Hero/Grid/Section.
3. **لا يوجد visual regression test** يقارن Builder وPreview وProduction.
4. **لا توجد آلية منشورة لفحص العقد غير المرتبطة**: node موجود في components لكنه غير موجود في `childrenIds` لأي root.
5. **لا يوجد كشف للتكرار** في props القديمة والجديدة أثناء الحفظ.
6. **لا يوجد CSS isolation واضح** للكود المخصص.
7. **لا يوجد migration pipeline رسمي** للقوالب القديمة.
8. **لا يوجد سجل render diagnostics** يوضح أي renderer عرض العقدة فعليًا.
9. **لا توجد قيود على fixed/sticky/absolute** حسب نوع العنصر.
10. **لا يوجد export/import contract** يضمن أن الموقع القابل للتصدير يعرض نفس الموقع المنشور.
11. **لا يوجد اختبار فعلي لمقاسات RTL والعربية** مع النصوص الطويلة، وهي من أسباب تمدد البطاقات وتحرك العناوين.
12. **لا يوجد empty/loading/error state موحد** للكتالوج الحقيقي، ما قد يغير ارتفاع القسم بعد تحميل المنتجات.

## خطة الإصلاح المقترحة

### المرحلة الأولى — منع الخطأ الظاهر

1. إضافة دعم `product card` في `BuilderTreeRenderer` قبل generic card.
2. توحيد `shape` إلى `cardShape` أو عمل migration صريح.
3. توحيد `showBadges/showBadge/hideBadge` وخصائص stock/price.
4. منع `fixed` على بطاقات المنتجات، وضمان `position: relative` للـ parent عند استخدام absolute.
5. إضافة اختبار يعرض نفس JSON في dashboard وMarketplace.

### المرحلة الثانية — إزالة التكرار

1. نقل نموذج البطاقة إلى shared package.
2. جعل `ProductCardView` و`PublishedProductCard` واجهتين لنفس model/renderer أو دمجهما.
3. إلغاء منطق البطاقة المكرر في `BuilderTreeRenderer` و`NodeView`.
4. إضافة `normalizeWebsiteForRender()` قبل أي render.

### المرحلة الثالثة — تمكين التخصيص الحقيقي

1. Component schema موحد.
2. Inspector مولد من schema.
3. Layout constraints حسب Parent.
4. Code editor آمن ومطابق للنشر.
5. Theme tokens منفصلة عن Layout presets.
6. visual regression snapshots.
7. template validator وmigration versions.

## معايير القبول بعد الإصلاح

- بطاقة المنتج التي يضعها التاجر داخل Hero تبقى داخل Hero في Builder وPreview وProduction.
- نقل البطاقة إلى قسم آخر يغير Parent فعليًا ولا يترك styles تموضع قديمة.
- تغيير شكل البطاقة من Inspector يغيرها في المعاينة والموقع المنشور.
- `absolute` لا يعمل دون Parent واضح `relative` أو تحذير للمستخدم.
- المنتجات الحقيقية لها نفس wrapper والأبعاد في المعاينة والنشر.
- لا توجد عقد orphan أو duplicate IDs أو children غير موجودة.
- typecheck وtests يمران من root وworkspaces.
- تطبيق الثيم لا ينقل بطاقة أو يعيد تموضعها دون سجل تغيير واضح.

## الملفات الأهم للبدء

1. `apps/marketplace-next/src/components/BuilderTreeRenderer.tsx`
2. `apps/dashboard-web/src/components/website-builder/components/canvas/ComponentRenderer.tsx`
3. `apps/dashboard-web/src/components/website-builder/components/canvas/renderers/CardGridRenderer.tsx`
4. `apps/dashboard-web/src/components/website-builder/components/canvas/renderers/ProductCardView.tsx`
5. `packages/shared/src/builder/PublishedProductCard.tsx`
6. `packages/shared/src/builder/NodeView.tsx`
7. `packages/shared/src/builder/productCard.ts`
8. `apps/dashboard-web/src/components/website-builder/components/inspector/panels/ProductCardSection.tsx`
9. `apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderComponentOperations.ts`
10. `apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderPublishing.ts`

## الحكم النهائي

المنتج الحالي قريب من وجود أساس قوي، لكنه لا يزال يعمل كعدة أنظمة عرض متجاورة بدل أن يكون Website Runtime واحدًا. لذلك التاجر يستطيع بناء شجرة تبدو صحيحة داخل المنشئ، لكن لا يوجد ضمان أن نفس الشجرة ستنتج نفس الشكل عند النشر. إصلاح بطاقة المنتج يجب أن يبدأ من توحيد عقدة العرض والـ props والـ parent/layout، وليس من تعديل `top` أو `margin` في CSS فقط.
