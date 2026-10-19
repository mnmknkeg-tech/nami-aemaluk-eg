# خطة نقل الباك إند إلى Go — مكتملة (الباك الحالي: `gobackend`)

> ✅ الترحيل اكتمل: الباك الوحيد الحالي هو `gobackend/` (Go 1.25 + Fiber). باك NestJS القديم حُذف من المستودع بتاريخ 2026-08-24 (نسخة احتياطية مرجعية في `C:\Users\Dream\ray-backups\` وتاريخ git). الفرونت ثلاثة تطبيقات Next.js في `apps/` (marketplace-next, dashboard-web, business)، وقاعدة البيانات PostgreSQL على `localhost:5433` بهجرات SQL في `gobackend/migrations/` (لا Prisma)، وRedis على `6379`.
>
> **الحالة:** 29 موديول موصولة تحت `/api/v1` عبر `gobackend/internal/app/app.go`.
> **الاستثناءات المعروفة:** دومينات `pos` و`dashboard` و`productcategories` لها handlers لكنها **غير موصولة** في `internal/app/app.go`، ودومين `finance` (service+repo فقط) **بلا handler**.

## القرار الحالي (بعد الاكتمال)

- `gobackend` هو الباك إند الحالي والوحيد للشغل الجديد.
- `backend` القديم (NestJS) حُذف بتاريخ 2026-08-24 ويُستخدم فقط كمرجع تاريخي عند الحاجة عبر النسخة الاحتياطية.
- لا يوجد باك إنتاج آخر: أي خدمة خارج `gobackend` لا تصبح خدمة إنتاج جديدة تلقائيًا إلا لو ثبت أن لها حدود مسؤولية واضحة لا يغطيها `gobackend`.

## هل نعمل أكثر من Backend مثل الشركات الكبيرة؟

الشركات الكبيرة لا تبدأ عادةً بعدة Backends لمجرد أن عندها مستخدمين كثيرين. الأفضل هو:

1. Backend واحد واضح ومسؤولياته منظمة داخليًا.
2. تشغيل أكثر من نسخة من نفس الباك خلف Load Balancer عند زيادة الضغط.
3. فصل خدمات صغيرة فقط عندما يظهر سبب حقيقي، مثل المدفوعات، الإشعارات، البحث، أو معالجة الصور.

لذلك في هذه المرحلة نركز على `gobackend` كـ modular monolith: كود Go واحد منظم بدومينات، ويمكن تشغيله على أكثر من سيرفر لاحقًا بدون تقسيم مبكر لخدمات كثيرة.

## قاعدة قاعدة البيانات

- PostgreSQL على `localhost:5433` هو مصدر البيانات الأساسي.
- لا Prisma: أي تطوير في Go يستخدم SQL migrations في `gobackend/migrations/` مع استعلامات pgx المعاملة.
- ممنوع تعديل الجداول خارج هجرات `gobackend/migrations/` بدون مراجعة migration map.

## ترتيب النقل المقترح

1. تثبيت البناء والتشغيل للواجهات.
2. توثيق API contract لكل Feature قبل الربط.
3. نقل Auth وTenant/Shop context إلى Go.
4. نقل Products/Categories لأنها قلب المتجر.
5. نقل Orders/Checkout لأنها قلب المبيعات.
6. نقل Media/Uploads لأنها مؤثرة على الأداء والتكلفة.
7. نقل Offers/Marketing.
8. تأجيل Bookings إلى أن تنتهي تعديلات التصميم والمنطق المطلوبة.
9. ~~بعد اكتمال النقل والاختبارات، يتم أرشفة `backend` القديم.~~ ✅ تم: حُذف `backend` القديم بتاريخ 2026-08-24.

## قاعدة التنفيذ

أي Feature جديدة يجب أن تكون Vertical Slice:

- SQL migration عند الحاجة.
- Go handler/service/repository.
- API response موحد.
- Frontend integration.
- Smoke check أو test.

بهذا الشكل لا نبني صفحات كثيرة بدون API، ولا ننقل كل الباك مرة واحدة بشكل خطر.
