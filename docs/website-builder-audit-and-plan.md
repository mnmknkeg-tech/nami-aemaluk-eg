# تدقيق Website Builder والمحرر والثيمات والنشر

## القرار التنفيذي

لا نبدأ بإعادة تصميم الثيمات ولا بإعادة كتابة الصفحات الكبيرة. البداية الصحيحة هي تثبيت مصدر الحالة والحفظ، ثم توحيد طريقة العرض، وبعدها إصلاح الارتفاعات والمساحات. أي تعديل بصري قبل هذه الخطوات قد يخفي السبب ويعيد المشكلة عند الحفظ أو النشر.

## الأعراض التي يفسرها التدقيق

- تعديل اسم أو عنوان بسيط يجعل التصميم يتغير أو تظهر مساحة طويلة أسفل الصفحة.
- التعديلات السريعة قد تفقد تعديلًا سابقًا لأن كل عملية تبني نسخة كاملة من `website` من snapshot مغلق داخل callback.
- المعاينة داخل Builder والموقع المنشور لا يستخدمان renderer واحدًا.
- بعض مسارات الكود تستخدم `css/js` بينما مسارات أخرى تستخدم `cssSnippet/jsSnippet`.
- توجد ارتفاعات صريحة في أكثر من طبقة: root `100vh`، fallback `60vh`، preview `85vh`، وpublic `100vh`.

## الأدلة المؤكدة

### 1. تحديث الحالة هش أمام التعديلات المتقاربة

في `apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderComponentOperations.ts`، عمليات `updateNodeProps` و`updateNodeStyle` تبني `newWebsite` من متغير `website` الموجود داخل closure. هذا يحافظ على البيانات في التعديل المنفرد، لكنه يسمح بكتابة snapshot قديم عند حدوث أكثر من تحديث قبل اكتمال render جديد، أو عند اجتماع prop/style/code في نفس الحدث.

`websiteRef` موجود في `BuilderContext` لكنه يستخدم أساسًا للتاريخ والحفظ، وليس كمصدر ذري موحد لكل عمليات التعديل.

### 2. ترتيب الحفظ غير محمي بالكامل

في `useBuilderHistory.ts`، autosave وmanual save يرسلان الموقع كاملًا إلى الخادم، ويستخدمان `clientVersion: 0` دائمًا. هذا يتجاوز حماية النسخ المتزايدة المعلنة في `BuilderContext`. إذا وصل طلب أقدم بعد طلب أحدث، يمكن نظريًا أن يكتب snapshot أقدم فوق الأحدث.

كذلك لا يوجد منع صريح لتشغيل autosave قبل اكتمال hydration وتحميل إعداد المتجر.

### 3. الـ renderers غير موحدة

المعاينة داخل Dashboard تستخدم `ComponentRenderer`، بينما `/shop` يستخدم `BuilderTreeRenderer`، و`/site` الحديث يستخدم في بعض المسارات `PublicSiteRenderer` من `packages/shared`.

هذا يعني أن نفس شجرة الموقع قد تُفسر بثلاث طرق مختلفة، خصوصًا في:

- دمج desktop/tablet/mobile.
- تفسير `height`, `minHeight`, `padding`, و`margin`.
- طريقة عرض root/container.
- المنتجات والسلة والعناصر التفاعلية.
- إخفاء الأقسام أو fallback عند نقص الجذر.

### 4. سبب مباشر محتمل للمساحات الطويلة

فرع root/container في `ComponentRenderer.tsx` يستخدم layout ثابتًا مثل `h-full`, `justify-center`, و`p-8` بدل تطبيق styles المحسوبة بنفس طريقة باقي العقد.

كما توجد fallbacks تفرض `minHeight` كبيرة عند فقدان root أو وجود tree غير صالح. لذلك يجب أولًا التحقق من root وارتفاعات الشجرة بدل معالجة المشكلة بقاعدة عامة مثل `overflow-hidden`.

### 5. الثيمات لا تعيد إنشاء الشجرة لكنها تكتب styles على عدد كبير من العقد

`useBuilderTheme.ts` يمر على components ويضيف قيمًا مشتقة إلى styles desktop عند تطبيق token أو preset. هذا لا يمسح `childrenIds`، لكنه قد يكتب فوق layout يدوي ويجعل المستخدم يشعر أن تعديلًا بسيطًا أعاد تشكيل التصميم.

### 6. عقد Code Editor غير موحدة

`CodeWorkspace.tsx` يكتب `css` و`js`، بينما `updateScopedComponentCode` وrenderers الأخرى تعتمد `cssSnippet` و`jsSnippet`. هذا يسبب عدم ثبات تعديلات CSS/JavaScript بين المحرر والحفظ والنشر.

## ما هو مؤكد وما يحتاج تجربة

### مؤكد

1. تحديث prop العادي يدمج props ولا يمسح styles أو children مباشرة.
2. كل عمليات التعديل لا تمر عبر reducer/functional update موحد.
3. autosave يستخدم snapshot كاملًا و`clientVersion: 0`.
4. preview وpublic renderers مختلفة.
5. توجد حدود ارتفاع متعددة وصريحة.
6. عقد CSS/JS غير موحدة.

### يحتاج إعادة إنتاج وتسجيل

1. هل المقصود بـ«تعديل الاسم» اسم layer (`node.name`) أم prop مثل `title`؟
2. هل المساحة الطويلة تأتي من root `100vh` أو من `minHeight/padding` في عقدة معينة؟
3. هل هناك race فعلي بين طلبين PUT، أم أن المشكلة من renderer فقط؟
4. هل tree المحفوظ يحتوي root واحدًا صحيحًا أم orphan/cycle أو parent-child mismatch؟

## خطة التنفيذ بالترتيب

### المرحلة 0 — تجميد الفوضى

- عدم إضافة features أو sections أو presets جديدة.
- عدم تعديل renderer بصريًا قبل وجود fixture ثابت.
- حفظ نسخة backup قبل كل مرحلة.
- إضافة logging مؤقت آمن يحتوي operation، nodeId، rootNodeId، revision، وpayload hash فقط.

### المرحلة 1 — مصدر حالة ذري وآمن

- إنشاء pure reducer/operation layer لتعديل `website` من `prevWebsite`.
- جعل تعديل prop يحافظ صراحة على styles وchildren وcustomCode.
- جعل تعديل style يحافظ على بقية breakpoints وprops وchildren.
- تحويل `rename` إلى عملية لا تعدل إلا `name`.
- تحويل UI callbacks الحالية إلى wrappers متوافقة حتى لا نكسر المكونات الحالية.
- إضافة اختبارات للتعديلات المتتالية والمتزامنة.

### المرحلة 2 — hydration وautosave

- منع autosave قبل اكتمال تحميل المشروع.
- استخدام request sequence أو AbortController لتجاهل نتيجة الطلب الأقدم.
- إعادة استخدام draft version بطريقة تدريجية مع التعامل مع conflict.
- جعل Undo/Redo يضع الحالة إلى `unsaved`.
- اختبار edit A ثم B مع تأخير response A.

### المرحلة 3 — تطابق العرض

- اختيار renderer مرجعي واحد أو استخراج helpers مشتركة.
- توحيد merge styles للـ desktop/tablet/mobile.
- توحيد تفسير root/container.
- جعل preview وpublic يستخدمان نفس قواعد الارتفاع والـ spacing.
- اختبار نفس fixture في Builder وpreview و`/site`.

### المرحلة 4 — إصلاح الارتفاعات

- إزالة `h-full/justify-center/p-8` الثابتة من root عندما تتعارض مع styles المحفوظة.
- فصل ارتفاع إطار المعاينة عن ارتفاع الموقع نفسه.
- جعل `minHeight` الافتراضي محدودًا وقابلًا للتتبع.
- التحقق من root/orphans/cycles قبل الحفظ والنشر.
- عدم استخدام `overflow-hidden` لإخفاء السبب.

### المرحلة 5 — الثيمات والمحرر

- فصل token-derived styles عن user overrides.
- تطبيق preset على theme tokens دون overwrite لتعديلات layout اليدوية إلا بتأكيد واضح.
- توحيد `css/js` و`cssSnippet/jsSnippet` مع adapter backward-compatible.
- اختبار round-trip: CodeWorkspace → save → reload → public renderer.

### المرحلة 6 — النشر والطلبات

- publish validation للشجرة والروابط والارتفاعات غير الطبيعية.
- ضمان أن `/site/:slug` يعرض نفس website المحفوظ الذي عاينه المستخدم.
- إبقاء cart وcheckout وطلبات التاجر خارج أي تغيير غير ضروري في renderer.

## الاختبارات المطلوبة

- تعديل prop يحافظ على `childrenIds`, `styles`, `customCode`.
- تعديل style يحافظ على props وبقية breakpoints.
- rename يغير `name` فقط.
- عمليتا prop/style في نفس الدورة لا تفقدان أي تعديل.
- autosave لا يحفظ blank قبل hydration.
- response قديم لا يستبدل response أحدث.
- Undo/Redo يحفظان النتيجة.
- preset لا يغير ids أو parentId أو childrenIds.
- fixture واحد يعطي نفس ترتيب العناصر وcomputed styles في preview وpublic.
- root فارغ، title طويل، missing root، custom code، وmobile/tablet لا ينتجون فراغًا غير مقصود.
- كل ملفات code editor تحفظ وتعيد تحميل HTML/CSS/JS/schema بنفس العقد.

## أول دفعة تنفيذ مقترحة

نبدأ بالمرحلة 1 فقط في commit مستقل:

1. إضافة reducer/utility pure.
2. ربط `updateNodeProps`, `updateNodeStyle`, `renameNode`, و`updateNodeCustomCode` به.
3. إضافة tests للحفاظ على tree وstyles والـ breakpoints.
4. تشغيل typecheck/lint/build.
5. بعد نجاحها ننتقل إلى autosave، ولا نلمس الثيمات أو renderer قبل ذلك.

هذا الترتيب يمنع أن نصلح العرض ثم تعيده عملية الحفظ إلى الحالة القديمة، ويجعل كل خطوة قابلة للمراجعة والرجوع.
