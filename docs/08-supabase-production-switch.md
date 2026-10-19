# 8) تحويل الإنتاج إلى Supabase — دليل التنفيذ والتحقق

> **الخلاصة أولًا:** الإنتاج حاليًا شغّال على Postgres تابع لـ Railway (حسب `DATABASE_URL` في بيئة النشر)، وسكيما القاعدة **متأخرة عن الكود المنشور** — عشان كده `/api/v1/users` و `/api/v1/orders` بيرجعوا `500` والأدمن بيشوف قايمة مستخدمين فاضية. القاعدة المحلية `ray-postgres` (منفذ 5433) خاصة بالتطوير فقط ولا علاقة لها بالإنتاج. مشروع Supabase القديم (`lsuewzeyfqmoqxflllmb`) **تم حذفه** — الـ DNS بيرجع NXDOMAIN — فمحتاجين مشروع Supabase جديد (أو استرجاع القديم من لوحة Supabase لو كان في فترة الاسترجاع).

---

## 8.1 ليه ده حصل؟ (التشخيص في سطرين)

- `DB_MIGRATE_ON_BOOT` افتراضيًا `false`، فالـ migrations الجديدة (71–75) عمرها ما اتطبقت على قاعدة الإنتاج.
- الكود المنشور بيقرأ أعمدة جديدة (`extra_phones`, `delivery_addresses`, ...) مش موجودة في قاعدة الإنتاج → أي استعلام بيطلبها يرجّع `500 internal server error`.
- الفحص الجاهز `/monitoring/ready` بيكشف ده بالظبط: لو `checks.schema` = `incomplete` يبقى الـ migrations ناقصة.

## 8.2 الخطوات

### الخطوة 1 — جهّز مشروع Supabase
1. افتح [supabase.com](https://supabase.com) → **New Project** (أو استرجع المشروع القديم من لوحة Supabase لو خيار الاسترجاع لسه ظاهر).
2. احفظ **كلمة سر قاعدة البيانات** في مكان آمن.
3. لو هتكمل على مشروع موجود: اتأكد إنه مش **Paused** (المشاريع المجانية بتتوقف بعد ~7 أيام بدون نشاط، والاسترجاع من زر Restore).

### الخطوة 2 — انسخ سلسلة الاتصال (Session Pooler)
من Supabase → **Connect** → اختار **Session pooler** (المنفذ `5432`):

```
postgresql://postgres.<PROJECT-REF>:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

> ⚠️ **مهم:** الهوست المباشر `db.<PROJECT-REF>.supabase.co` بقى **IPv6 فقط** — لو منصة استضافة الباك مش بتدعم IPv6 استخدم الـ **Session Pooler** (IPv4) زي فوق. تستخدم **Transaction pooler** (منفذ `6543`) لو اضطررت بس وقتها ضيف `DB_QUERY_EXEC_MODE=simple` (شوف ملاحظة الـ pooler في `gobackend/.env.production.example`).

اختبر من جهازك إن الاتصال بيفتح قبل ما تكمّل:

```bash
cd gobackend
DATABASE_URL="<سلسلة الاتصال بتاعة Supabase>" go run scripts/migrate.go version
# أول مرة على مشروع فاضي: version: 0 dirty: false (أو خطأ "no migration found" — ده طبيعي)
```

### الخطوة 3 — طبّق الـ migrations على Supabase
اختر واحدة من طريقتين:

**أ) أوتوماتيك عند إقلاع الباك (موصى بها):** في متغيرات البيئة بتاعة منصة استضافة الباك (Back4app Containers أو أي منصة شغّال عليها الباك):

```env
DATABASE_URL=<سلسلة الاتصال بتاعة Supabase>
DB_MIGRATE_ON_BOOT=true
DB_MAX_OPEN_CONNS=10
DB_MAX_IDLE_CONNS=3
DB_QUERY_EXEC_MODE=auto
```

**ب) يدوي من جهازك:**

```bash
cd gobackend
DATABASE_URL="<سلسلة الاتصال بتاعة Supabase>" go run scripts/migrate.go up
DATABASE_URL="<سلسلة الاتصال بتاعة Supabase>" go run scripts/migrate.go version
# المطلوب: version: 75 dirty: false (نفس نسخة قاعدة التطوير)
```

### الخطوة 4 — حوّل بيئة الإنتاج على Supabase
في لوحة المنصة اللي الباك منشور عليها (Back4app Containers حسب توثيق المشروع)، غيّر متغيرات البيئة دي واعمل **Redeploy**:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | سلسلة الاتصال بتاعة Supabase (الخطوة 2) |
| `DB_MIGRATE_ON_BOOT` | `true` |
| `JWT_SECRET` | نفس القيمة القديمة (عشان الجلسات القائمة متتبوظش) |
| `REDIS_URL` | نفس القيمة القديمة |
| `ADMIN_BOOTSTRAP_TOKEN` | نفس القيمة أو قيمة جديدة قوية |

اتركي/اترك أي متغير تاني زي ما هو. بعد الـ redeploy افتح logs المنصة وتأكد إنك شايف الـ migrations بتتطبق وإن مفيش `migration failed`.

### الخطوة 5 — أعد إنشاء حساب الأدمن
القاعدة الجديدة **فاضية** — مفيش مستخدمين، مفيش أدمن. اعمل bootstrap للأدمن مرة واحدة:

```bash
curl -X POST "https://<عنوان-الباك>/api/v1/auth/bootstrap-admin" \
  -H "Content-Type: application/json" \
  -d '{"token":"<ADMIN_BOOTSTRAP_TOKEN>","email":"admin@mnmknk.com","password":"<كلمة سر قوية>"}'
```

### الخطوة 6 — التحقق (إجباري بعد كل تغيير قاعدة)

**أ) سكربت التحقق الجاهز (من جذر المشروع):**

```bash
API_BASE=https://dashboard-web-three-kappa.vercel.app \
ADMIN_EMAIL=admin@mnmknk.com ADMIN_PASSWORD=<كلمة السر> \
SUPABASE_DB_HOST=<هوست Supabase — اختياري> \
node scripts/oneoff/verify-supabase-production.mjs
```

السكربت بيفحص: DNS بتاع Supabase، جاهزية الباك، لوجين الأدمن، قراءة قايمة المستخدمين (إثبات إن السكيما كاملة)، وكتابة حقيقية (تسجيل مستخدم مؤقت + حذفه تلقائيًا). **Exit code 0 = كله تمام.**

**ب) فحوصات يدوية سريعة:**

```bash
# 1. جاهزية الباك (لو عندك عنوان الباك المباشر):
curl https://<عنوان-الباك>/monitoring/ready
# المطلوب: HTTP 200 و "checks":{"database":"ok","redis":"ok","schema":"ok"}

# 2. نسخة السكيما في Supabase نفسها:
#    Supabase Dashboard → SQL Editor وشغّل:
#    select * from schema_migrations;
#    المطلوب: version = 75 و dirty = false

# 3. من الواجهة: دخول الأدمن → "إدارة المستخدمين" لازم يعرض المستخدمين
#    (مش "لا توجد نتائج").
```

### الخطوة 7 (اختياري) — نقل البيانات القديمة من Railway لـ Supabase
لو عايز تحتفظ بمستخدمي/متاجر الإنتاج الحاليين قبل التحويل:

```bash
# صبّ (dump) من Railway:
docker run --rm postgres:16 pg_dump "postgresql://postgres:<PASS>@<HOST>.railway.internal:5432/railway" \
  --no-owner --no-privileges > railway-dump.sql

# رستر على Supabase (استخدم سلسلة الاتصال بتاعة الـ Session Pooler):
docker run --rm -i postgres:16 psql "postgresql://postgres.<REF>:<PASS>@aws-0-<REGION>.pooler.supabase.com:5432/postgres" < railway-dump.sql
```

> اعمل الخطوة دي **قبل** ما تغيّر `DATABASE_URL` في الإنتاج، وبعدها شغّل `go run scripts/migrate.go up` على Supabase لو الـ dump طلع من قاعدة أقدم من 75.

## 8.3 تنضيف بقايا الإعدادات القديمة

- **Vercel:** امسح `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` القديمين (بتوع المشروع الممسوح) من Project Settings → Environment Variables — أو حدّثهم بقيم المشروع الجديد لو حابب تستخدمهم لاحقًا. مفيش أي كود في الواجهات بيستهلكهم حاليًا.
- **Railway:** بعد ما تتأكد إن كل حاجة شغالة على Supabase (بيقلة أسبوع مراقبة)، وقّف قاعدة Railway القديمة.
- **سكربتات التشخيص:** متحطش بيانات دخول حقيقية كـ defaults في سكربتات — استخدم متغيرات بيئة (زي `verify-supabase-production.mjs`).

## 8.4 إزاي نضمن إن المشكلة متتكررش

- `DB_MIGRATE_ON_BOOT=true` يفضل ثابت في بيئة الإنتاج — أي migration جديدة هتتطبق تلقائيًا مع أول deploy.
- قبل كل deploy كبير: `curl https://<عنوان-الباك>/monitoring/ready` لازم يرجّع `schema: ok`.
- السكربت `scripts/oneoff/verify-supabase-production.mjs` هو فحص القبول النهائي بعد أي تغيير في قاعدة الإنتاج.
