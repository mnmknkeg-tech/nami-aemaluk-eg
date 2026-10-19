# 6) دليل قاعدة البيانات (PostgreSQL فقط)

> Backend هذا المشروع مكتوب بـ Go، وقاعدة البيانات الوحيدة هي PostgreSQL 15. الهجرات ملفات SQL مرقمة تُطبَّق عبر golang-migrate، وكود الوصول للبيانات مكتوب يدويًا بـ pgx/v5.

## 6.1 ملفات الهجرات المتاحة

### 6.1.1 هيكل الملفات
```
gobackend/
├── migrations/                  # ملفات الترحيل SQL المرقمة (حتى 000049_*)
│   ├── 000001_*.up.sql
│   ├── 000001_*.down.sql
│   ├── ...
│   ├── 000049_*.up.sql
│   └── 000049_*.down.sql
├── docker-compose.yml           # postgres (5433:5432) + redis (6379:6379)
├── sqlc.yaml                    # اختياري (توليد كود — المستودعات اليدوية هي الأساس)
└── internal/
    └── config/
        └── config.go            # قراءة DATABASE_URL و DB_MIGRATE_ON_BOOT
```

### 6.1.2 الاتصال الصحيح
**PostgreSQL (الوحيدة — للتطوير والإنتاج):**
```bash
DATABASE_URL=postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable
```

**التوصية:**
- استخدم PostgreSQL دائمًا.
- المنفذ على المضيف هو `5433` (يُربَط بـ `5432` داخل الحاوية) لتفادي التعارض مع نسخ محلية.
- لا توجد قواعد بيانات ملفية محلية ولا أدوات ORM؛ PostgreSQL هي القاعدة الوحيدة في التطوير والإنتاج.

## 6.2 تشغيل PostgreSQL وRedis

### 6.2.1 تشغيل الاعتماديات
```bash
cd gobackend
docker compose up -d postgres redis
docker compose ps
```

### 6.2.2 التحقق من الاتصال
```bash
psql "postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable" -c "SELECT 1;"
redis-cli -p 6379 ping
```

### 6.2.3 تطبيق الهجرات
```bash
# تلقائيًا عند الإقلاع عندما يكون:
DB_MIGRATE_ON_BOOT=true
```
ثم:
```bash
cd gobackend
go run ./cmd/api
```

### 6.2.4 فحص ملفات الهجرات
```bash
ls gobackend/migrations/ | head -20
ls gobackend/migrations/ | tail -20
# الأحدث حتى 000049_*
```

### 6.2.5 أدوات إدارة المخطط
إدارة المخطط تتم عبر ملفات SQL المرقمة في `gobackend/migrations/` و golang-migrate فقط:
- تُطبَّق الهجرات تلقائيًا عند الإقلاع عندما يكون `DB_MIGRATE_ON_BOOT=true`.
- أي تغيير في المخطط يكون ملف migration جديدًا (up + down) كما في القسم 6.3.
- الاستعلامات اليومية تُكتب يدويًا بـ pgx/v5 داخل طبقة repository لكل دومين.

## 6.3 استراتيجية الترحيلات (Migration Strategy)

### 6.3.1 أفضل الممارسات للترحيلات
```sql
-- 1. استخدم أسماء مرقمة ووصفية
-- مثال: 000049_add_shop_segments.up.sql / 000049_add_shop_segments.down.sql

-- 2. اكتب SQL واضحًا وقابلًا للقراءة
CREATE TABLE IF NOT EXISTS "shop_segments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "shop_id" UUID NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "name_ar" VARCHAR(255),
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_shop_segments_shop_id" ON "shop_segments"("shop_id");

-- 3. كل migration يجب أن يكون له down يعكس الـ up
-- مثال down:
-- DROP INDEX IF EXISTS "idx_shop_segments_shop_id";
-- DROP TABLE IF EXISTS "shop_segments";
```

قواعد:
- لا تعدّل ملف migration مطبَّق — أنشئ ملفًا جديدًا برقم أعلى.
- كل تغيير schema = ملفا `up` + `down`.
- راجع الترقيم الحالي (الأحدث `000049_*`) قبل إنشاء `000050_*`.

### 6.3.2 أنواع التغييرات المدعومة
```sql
-- إضافة جدول جديد
CREATE TABLE IF NOT EXISTS "new_table" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إضافة عمود جديد (بقيمة افتراضية لتفادي كسر الصفوف القديمة)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT FALSE;

-- إضافة قيد فريد
ALTER TABLE "products" ADD CONSTRAINT "uq_products_sku" UNIQUE ("sku");

-- إضافة علاقة (FK)
ALTER TABLE "products"
    ADD CONSTRAINT "fk_products_shop"
    FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE;

-- إضافة enum الأدوار (مرة واحدة — النوع UserRole)
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'MERCHANT', 'ADMIN', 'COURIER', 'CASHIER');
EXCEPTION WHEN duplicate_object THEN NULL END $$;
```

### 6.3.3 نوع `UserRole` (enum)
```sql
-- القيم الرسمية:
-- CUSTOMER, MERCHANT, ADMIN, COURIER (+ CASHIER حسب الحاجة)

CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'MERCHANT', 'ADMIN', 'COURIER', 'CASHIER');

-- مثال استخدام:
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';
```

> الأدوار المعتمدة في المصادقة: `CUSTOMER/MERCHANT/ADMIN/COURIER/CASHIER`. أي دور خارجها يُرفض بـ `insufficient_role`.

## 6.4 قواعد أمان البيانات

### 6.4.1 حماية البيانات الحساسة
```sql
-- 1. لا تخزن كلمات المرور كنص عادي — يُخزَّن الـ hash فقط (bcrypt)
-- عمود password يحمل hash وليس كلمة المرور

-- 2. استخدم soft deletes حيث يلزم
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- 3. timestamps للتدقيق
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
```

### 6.4.2 إعدادات الاتصال
```bash
# محليًا (بدون SSL — حسب الإعداد الافتراضي)
DATABASE_URL=postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable

# للإنتاج استخدم sslmode=require (حسب بيئتك)
# DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### 6.4.3 النسخ الاحتياطي والاسترداد
```bash
# إنشاء نسخة احتياطية
pg_dump "postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable" > backup_$(date +%Y%m%d_%H%M%S).sql

# استعادة النسخة الاحتياطية
psql "postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable" < backup_20231201_120000.sql
```

## 6.5 تحسين الأداء (Performance Optimization)

### 6.5.1 الـ Indexes الاستراتيجية
```sql
-- منتجات: بحث سريع بالاسم/السعر/المتجر/الفئة
CREATE INDEX IF NOT EXISTS "idx_products_shop_id" ON "products"("shop_id");
CREATE INDEX IF NOT EXISTS "idx_products_category_id" ON "products"("category_id");
CREATE INDEX IF NOT EXISTS "idx_products_price" ON "products"("price");
CREATE INDEX IF NOT EXISTS "idx_products_created_at" ON "products"("created_at");
CREATE INDEX IF NOT EXISTS "idx_products_shop_category" ON "products"("shop_id", "category_id");

-- طلبات: استعلامات شائعة بالمستخدم/المتجر/الحالة/التاريخ
CREATE INDEX IF NOT EXISTS "idx_orders_user_id" ON "orders"("user_id");
CREATE INDEX IF NOT EXISTS "idx_orders_shop_id" ON "orders"("shop_id");
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders"("created_at");
CREATE INDEX IF NOT EXISTS "idx_orders_user_status" ON "orders"("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_orders_shop_created" ON "orders"("shop_id", "created_at");
```

### 6.5.2 تحسين الاستعلامات (pgx/v5 يدويًا)
```go
// حدّد الأعمدة المطلوبة فقط + pagination
const listProducts = `
SELECT id, name, price, shop_id, category_id, created_at
FROM products
WHERE shop_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
`

rows, err := pool.Query(ctx, listProducts, shopID, limit, offset)

// للاستعلامات المعقدة: SQL خام عبر pgx
const productWithShop = `
SELECT p.id, p.name, p.price, s.name AS shop_name
FROM products p
JOIN shops s ON s.id = p.shop_id
WHERE p.price > $1 AND p.created_at > $2
ORDER BY p.created_at DESC
LIMIT $3;
`
```

### 6.5.3 Connection Pooling (pgxpool)
```go
// إعداد الـ pool من DATABASE_URL (انظر internal/config + app wiring)
cfg, err := pgxpool.ParseConfig(databaseURL)
cfg.MaxConns = 20
cfg.MinConns = 2
cfg.MaxConnLifetime = time.Hour

pool, err := pgxpool.NewWithConfig(ctx, cfg)
```

## 6.6 كود المستودعات (pgx/v5 يدويًا + sqlc اختياري)

### 6.6.1 المبدأ
- كل استعلام SQL مكتوب يدويًا بـ pgx/v5 داخل طبقة repository لكل دومين.
- يوجد `sqlc.yaml` اختياري لتوليد بعض الكود — لكن الأساس اليدوي يبقى المرجع.

### 6.6.2 مثال مستودع (نمط)
```go
// internal/<domain>/repository.go (نمط عام)
package shopdomain

import (
    "context"
    "github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

func (r *Repository) GetByID(ctx context.Context, id string) (*Shop, error) {
    const q = `SELECT id, name, slug, owner_id, is_active, created_at FROM shops WHERE id = $1;`
    var s Shop
    err := r.db.QueryRow(ctx, q, id).Scan(&s.ID, &s.Name, &s.Slug, &s.OwnerID, &s.IsActive, &s.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &s, nil
}
```

### 6.6.3 Transactions
```go
// عملية متعددة الخطوات داخل transaction واحدة
tx, err := pool.Begin(ctx)
if err != nil {
    return err
}
defer tx.Rollback(ctx)

// 1. إنشاء الطلب
// 2. إنشاء عناصر الطلب
// 3. خصم المخزون
// 4. tx.Commit(ctx)
```

## 6.7 البيانات الأولية (Seeding)

### 6.7.1 المبدأ
- أي بيانات أولية تكون عبر migration من نوع seed (صفوف افتراضية) أو سكربت Go صريح — وحسب الحاجة فقط.

### 6.7.2 مثال seed عبر migration
```sql
-- 0000XX_seed_default_roles.up.sql (مثال نمط)
INSERT INTO "roles" ("name", "description") VALUES
    ('CUSTOMER', 'Regular customer'),
    ('MERCHANT', 'Shop owner'),
    ('ADMIN', 'System administrator'),
    ('COURIER', 'Delivery person')
ON CONFLICT ("name") DO NOTHING;
```

## 6.8 المراقبة والصيانة (Monitoring & Maintenance)

### 6.8.1 فحص صحة قاعدة البيانات
```bash
# عبر المراقبة (تتحقق من DB وRedis)
curl http://localhost:4000/monitoring/health
curl http://localhost:4000/monitoring/ready

# مباشرة
psql "postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable" -c "SELECT 1;"
```

### 6.8.2 مراقبة الأداء (SQL)
```sql
-- أكبر الجداول
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- حجم قاعدة البيانات
SELECT pg_size_pretty(pg_database_size('ray_marketplace'));
```

### 6.8.3 الصيانة الدورية
```bash
#!/bin/bash
# scripts/db-maintenance.sh
DB="postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable"

echo "Updating statistics..."
psql "$DB" -c "ANALYZE;"

echo "Cleaning up..."
psql "$DB" -c "VACUUM ANALYZE;"

echo "Database size:"
psql "$DB" -c "SELECT pg_size_pretty(pg_database_size('ray_marketplace'));"
```

## 6.9 أخطاء شائعة وحلولها

### 6.9.1 فشل الاتصال بقاعدة البيانات
```bash
# 1. تحقق من DATABASE_URL (المنفذ 5433 وليس 5432)
echo $DATABASE_URL

# 2. تحقق من الحاويات
cd gobackend
docker compose ps
docker compose logs postgres

# 3. تحقق من الاتصال مباشرة
psql "postgresql://ray_user:ray_password@localhost:5433/ray_marketplace?sslmode=disable" -c "SELECT 1;"
```

### 6.9.2 تعارض الترقيم في الهجرات
```bash
# المشكلة: رقمان مكرران أو migration مطبَّق جزئيًا
# الحلول:
ls gobackend/migrations/ | sort | tail -20
# لا تعدّل ملفًا مطبَّقًا — أنشئ رقمًا جديدًا أعلى من 000049_*
```

### 6.9.3 خطأ `UserRole` غير معروف
```sql
-- السبب: نوع enum غير منشأ قبل استخدامه
-- الحل: أنشئ النوع أولًا (idempotent)
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'MERCHANT', 'ADMIN', 'COURIER', 'CASHIER');
EXCEPTION WHEN duplicate_object THEN NULL END $$;
```

## 6.10 أفضل الممارسات (Best Practices)

### 6.10.1 تصميم المخطط (Schema Design)
```sql
-- 1. أسماء جداول صغيرة بأحرف صغيرة + UUIDs
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. حدّد الأطوال والدقة
-- price NUMERIC(10,2), name VARCHAR(255), sku VARCHAR(100) UNIQUE

-- 3. استخدم enum للحالات
-- UserRole: CUSTOMER, MERCHANT, ADMIN, COURIER (+ CASHIER)
```

### 6.10.2 إدارة البيانات (pgx)
```go
// 1. استخدم transactions للعمليات المتعددة (إنشاء طلب + عناصره + خصم المخزون)
// 2. استخدم batch للعمليات المتعددة (pgx Batch)
// 3. استخدم LIMIT/OFFSET دائمًا للقوائم الكبيرة + COUNT منفصل للـ pagination
```

## 6.11 التحقق من النجاح (Success Checklist)

### 6.11.1 التحقق من التثبيت
- [ ] Go 1.25 مثبت
- [ ] Docker + Compose يعملان
- [ ] حاويتا postgres وredis تعملان (`docker compose ps`)
- [ ] `DATABASE_URL` معرف بشكل صحيح (منفذ 5433)

### 6.11.2 التحقق من المخطط
- [ ] ملفات `gobackend/migrations/` موجودة حتى `000049_*`
- [ ] `DB_MIGRATE_ON_BOOT=true` والإقلاع بلا أخطاء هجرات
- [ ] نوع `UserRole` موجود بالقيم الصحيحة

### 6.11.3 التحقق من البيانات
- [ ] الاتصال يعمل (`SELECT 1`)
- [ ] الجداول والعلاقات والـ indexes صحيحة
- [ ] لا توجد أي بقايا من أدوات ORM أو قواعد بيانات ملفية محلية

### 6.11.4 التحقق من الأداء
- [ ] الاستعلامات الأساسية تعمل بكفاءة
- [ ] الـ indexes موجودة للأعمدة كثيرة الاستعلام
- [ ] الـ pool مضبوط (MaxConns مناسب)

### 6.11.5 التحقق من الأمان
- [ ] كلمات المرور hash فقط (لا نص عادي)
- [ ] `JWT_SECRET` بطول 32+ حرف
- [ ] النسخ الاحتياطي يعمل (`pg_dump`/`psql`)
