# Parity Checklist: gobackend (الباك الحالي) مقابل احتياجات الفرونت

> ✅ الترحيل اكتمل: الباك الحالي الوحيد هو `gobackend/` (Go 1.25 + Fiber). باك NestJS القديم حُذف بتاريخ 2026-08-24 (مرجع تاريخي فقط في `C:\Users\Dream\ray-backups\`). الفرونت ثلاثة تطبيقات Next.js في `apps/`، وقاعدة البيانات PostgreSQL على `localhost:5433` بهجرات SQL في `gobackend/migrations/` (لا Prisma)، وRedis على `6379`.
>
> **الحالة:** 29 موديول موصولة تحت `/api/v1` عبر `gobackend/internal/app/app.go`.
> **الاستثناءات المعروفة:** دومينات `pos` و`dashboard` و`productcategories` لها handlers لكنها **غير موصولة** في `internal/app/app.go`، ودومين `finance` (service+repo فقط) **بلا handler**.

**التاريخ:** 2026-08-24 · **المصدر:** استخراج فعلي لكل نداءات `/api/v1/*` من التطبيقات الثلاثة مقابل routes Fiber المسجلة في `gobackend`.

**إجمالي احتياج الفرونت:** ~250 endpoint (dashboard-web وحدها 216).
**الحالة:** الجو يغطي النواة التجارية، وناقص ~15 عائلة endpoints كاملة و~10 عائلات جزئية/بشكل مسارات مختلف.

## ✅ مغطى في gobackend

| العائلة | ملاحظات |
| --- | --- |
| Auth (login/signup/me/password/2fa/dev-logins/bootstrap-admin/otp) | تحقق من `/auth/google` و `/auth/logout` |
| Shops (me/slug/follow/reviews/image-maps) | شبه كاملة |
| Products + reviews + manage/by-shop | جاهزة |
| Orders (إنشاء/تتبع/me/courier assign) | تحقق من returns |
| Reservations (قائمة + تغيير حالة) | نفس شكل طلبات اللوحة |
| Apps (install/uninstall/enable/disable) + Users | جاهزة |
| Analytics system (+activity/timeseries) | جاهزة |
| Notifications (me/unread/read) | جاهزة |
| Media (presign/upload) | جاهزة |
| Image maps (manage/create/analyze/activate/layout) | جاهزة |
| Builder (config/publish) | جاهزة |
| Gallery | جاهزة |
| Couriers (قائمة/pending/approve/reject/status) | تحقق من `courier/orders` المفرد |
| Feedback | جاهزة |
| Customers CRM (shop CRUD) | تحقق من detail/promote |
| Support tickets | ناقص `support/stats` وreply |
| Chat | الشكل مختلف عن `/chats` + `/messages` CRUD |

## ⚠️ موجودة بأسماء مسارات مختلفة (قرر: alias في الجو أو تعديل الفرونت)

| الفرونت يطلب | الجو يوفر |
| --- | --- |
| `/analytics/charts|kpi|sales-performance|visitors/shop/:id` | `overview/sales-report/product-performance/conversions/traffic/customer-insights` |
| `/attendance|leaves|payroll|tasks/shop/:id` | `/hr/shops/:id/attendance|leaves|payroll|tasks` |
| `/abandoned-carts*` | `abandoned` تحت مجموعة أخرى |

## ❌ ناقصة كليًا (مرتبة بأولوية الترحيل من الباك القديم)

1. **كتالوج متقدم:** categories, variants, inventory (low-stock), warehouses, suppliers
2. **مالية:** cashflow, revenue, finance/profits, finance/reports, journal, wallets, accounts, taxes, purchase-orders, stocktakes, transfers (invoices موجودة؛ expenses تحتاج تحقق)
3. **تسويق:** campaigns, email-campaigns, sms-campaigns, promotions, discounts, coupons, marketing/hub
4. **منصة المواقع:** websites, templates, themes, domains, versions, publish/unpublish, pages, menus, seo-report, website-analytics
5. **AI:** ai/{analysis,automations,images,insights,seo}
6. **CRM إضافي:** complaints, loyalty-programs
7. **محتوى عام:** blog (عام + shop), pages, contact, suggestions
8. **إدارة:** admin/module-requests, admin/settings, map-listings (approve/reject/public-submit — الأخيرة يحتاجها تطبيق business!)

## قاعدة العمل

- عند توصيل أي عائلة ناقصة: المرجع كود NestJS التاريخي في النسخة الاحتياطية `C:\Users\Dream\ray-backups\<date>\backend`، والتنفيذ في `gobackend` بهجرات SQL جديدة في `gobackend/migrations/` (تشغيل الباك: `go run ./cmd/api` داخل `gobackend/`)، وأي منطق دومين جديد تحت `gobackend/internal/...`.
- أولوية التوصيل للاستثناءات المعروفة: توصيل handlers دومينات `pos` و`dashboard` و`productcategories` في `internal/app/app.go`، ثم بناء handler لدومين `finance`.
- حدّث هذا الملف بعد إغلاق كل عائلة.
