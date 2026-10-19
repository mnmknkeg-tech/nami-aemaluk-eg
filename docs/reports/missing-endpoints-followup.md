# تقرير متابعة — تنفيذ توصيات فحص الـ endpoints

**التاريخ:** سبتمبر 2026 • **المرجع:** `missing-endpoints-report.md` (237 مسار مفحوص — 47 ناقص — خطآن 5xx)

---

## 1) تم إصلاحه في هذه الجولة ✅

| المسار | المشكلة | الإصلاح | الملف |
|---|---|---|---|
| `GET /marketing/seasonal-offers/public` | **500** — الكود مكتوب على schema وهمي (`name/discount_type/start_date/end_date/is_active/banner_color`) بينما الجدول الحقيقي (`title/discount_percent/starts_at/ends_at/metadata`) | إعادة كتابة دومين seasonaloffers بالكامل فوق الـ schema الحقيقي مع الاحتفاظ بنفس شكل JSON للفرونت (mapping في الـ SELECT) | `gobackend/internal/domains/seasonaloffers/repository.go` |
| `GET /shops/{id}/reviews` | **500** — جدول `reviews` غير موجود في قاعدة البيانات أصلًا | migration جديد ينشئ الجدول بالأعمدة المتوقعة من الكود + indexes | `gobackend/migrations/000064_reviews_table.up.sql` |
| `POST /auth/change-password` | غير مُنفَّذ | handler جديد: يتحقق من كلمة المرور الحالية (`password.Verify`) ثم يحدّث الهاش (`UpdatePassword`) | `gobackend/internal/domains/auth/change_password.go` + تسجيل المسار في `auth/handler.go` |
| `POST /auth/deactivate` | الـ handler كان موجود في `auth/deactivate.go` لكن غير مسجَّل في الروتس | تسجيل المسار (جدولة حذف الحساب بعد 30 يوم كما تتوقع صفحة الإعدادات) | `gobackend/internal/domains/auth/handler.go` |
| `POST /invoices/{id}/send` | غير مُنفَّذ (الموجود: pay/cancel فقط) | handler + service + حالة جديدة `SENT` | `gobackend/internal/domains/invoice/` |
| `/chats` بصيغة الجمع (3 مسارات) | الباكند يخدم `/chat` مفرد فقط | aliases كاملة `/chats` بنفس كل الفعل | `gobackend/internal/domains/chat/handler.go` |
| `GET /analytics/sales-performance/shop/{id}` | غير موجودة — صفحة أداء المبيعات كانت تعرض بيانات ثابتة | endpoint جديد يحسب مؤشرات حقيقية (إيراد/طلبات/متوسط الطلب — النصف الحالي مقابل النصف السابق من نافذة الترند) | `gobackend/internal/domains/analytics/handler.go` |

### إصلاحات نفس اليوم (من جولات سابقة — للسجل)
| المسار | المشكلة | الإصلاح |
|---|---|---|
| `GET /analytics/shop/{id}/product-performance` | 500 — SQL يشير لأعمدة غير موجودة (`name_ar/sku/rating`، جدول `categories`، `oi.subtotal`) | إعادة كتابة الاستعلام بالأعمدة الحقيقية (`quantity × price`, `p.category`) — `analytics/reports_repository.go` + `repository.go` |
| `GET /orders/{id}` | كان يرجع `items: null` (FindByID ما كانش يربط الأصناف) | إرفاق الأصناف مثل الـ list endpoints — `orders/repository.go` |
| `PATCH /products/{id}` | 500 على أي تعديل — `UPDATE products SET ... RETURNING p.xxx` بدون alias، وأعمدة `fm.` من JOIN لا تصلح في RETURNING | `UPDATE products AS p` + RETURNING معدّل + إعادة قراءة كاملة — `products/repository.go` |

**جميعها متحقق منها لايف بعد إعادة البناء:** seasonal-offers 200، reviews 200، chats 200، sales-performance يرجع أرقام حقيقية، والمسارات الجديدة ترجع 401 (موجودة) بدل 404.

---

## 2) مؤجل عمدًا — مسارات معطّلة في الفرونت (لا تحتاج باكند الآن)

النداءات التالية **معطّلة بالتعليق** داخل صفحات اللوحة — لن تعمل حتى تُفعَّل الصفحات:
- `/attendance|leaves|payroll|tasks/shop/{id}` — صفحات HR (`hr/attendance`, `hr/leaves`, `hr/payroll`, `hr/tasks`)
- `/analytics/charts|kpi|visitors/shop/{id}` — صفحات التحليلات بنفس الحالة

**ملاحظة مهمة:** الباكند يخدم **بالفعل** `/hr/shops/{id}/attendance|leaves|payroll|tasks` — تفعيل صفحات HR يحتاج فقط تغيير المسار في الفرونت أو aliases. المسارات الأخرى ستحتاج handlers جديدة عند الحاجة.

---

## 3) موديولات غائبة بالكامل — تحتاج تخطيط (مرحلة قادمة)

| المجموعة | المسارات | الحجم | التوصية |
|---|---|---|---|
| **AI module** | `/ai/analysis|automations|images|insights|seo/shop/{id}` | **L** | دومين جديد كامل — يحتاج قرار مزود الذكاء الاصطناعي (Gemini مذكور في الكونفج) قبل كتابة أي كود |
| **Website builder platform** | `/templates{}`, `/themes{}`, `/websites/{id}/analytics\|blog\|menus\|pages\|seo-report` | **L** | يوجد دومين `builder/` يخدم `/builder/published-slugs` — الأفضل توسيعه بدل دومين جديد، أو تحويل الفرونت لمسارات `/builder/*` الموجودة |
| **Marketplace platform layer** | `/suggestions`, `/contact`, `/marketplace`, `/blog{}` | **M** | مسارات storefront عامة — مراجعة هل تطبيق marketplace-next يمررها من باكند منفصل حاليًا |
| **Shop-scoped extensions** | `/shops/{id}/media\|integrations\|settings\|website`, `/shops/{id}/customers/{id}/detail`, `/products/manage/by-shop/{id}/import-drafts` | **M** | أغلبها aliases محتملة لوظائف موجودة (settings→shops/me، website→builder) — تحتاج جرد دقيق لكل واحدة |
| **Abandoned carts** | `/abandoned-carts` + نسختان | **S** | الباكند يخدم `/cart-events/abandoned` و`/cart-events/abandoned/stats` — alias واحد يحلها عند الحاجة |

---

## 4) ملاحظات تشغيلية

- **حد معدل الـ auth: 10 طلبات/دقيقة** (`AUTH_RATE_LIMIT_MAX` في `gobackend/internal/config/config.go`، يغطي login وdev-*-login وrefresh) — الاختبارات المؤتمتة التي تسجل دخول بشكل متكرر سترفض، وتظهر للمستخدم كقفزات للـ login. للاختبار: انتظر انقضاء الدقيقة أو امسح مفاتيح `rl_auth*` من Redis.
- **إعادة توليد نتائج الفحص:** شغّل `scripts/probe-final.ps1` من PowerShell جديد (الجلسة السابقة تعطلت أثناء التنفيذ الطويل).
- بعد أي تعديل باكند: `go build -o bin/ray-api.exe ./cmd/api` ثم تشغيل الـ exe (أثبت من `go run`).
