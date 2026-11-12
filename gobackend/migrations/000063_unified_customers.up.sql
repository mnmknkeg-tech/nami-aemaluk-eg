-- العملاء الموحد: أعمدة موسعة + سجل التواصل + الولاء
-- Unified customers: extended fields, contact log, loyalty

ALTER TABLE customers ADD COLUMN IF NOT EXISTS code            TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type   TEXT NOT NULL DEFAULT 'individual'; -- individual | company
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name    TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number      TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source          TEXT NOT NULL DEFAULT 'manual';     -- pos|website|bookings|services|manual|import|app
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch          TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segment_id      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags            JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes           TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_addresses JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS addresses       JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS archived        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_due     DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMPTZ;

-- أكواد العملاء للسجلات القديمة: CUST-0001 داخل كل متجر
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY shop_id ORDER BY created_at, id) AS rn
    FROM customers
    WHERE code = ''
)
UPDATE customers c
SET code = 'CUST-' || LPAD(numbered.rn::TEXT, 4, '0')
FROM numbered
WHERE c.id = numbered.id;

CREATE INDEX IF NOT EXISTS idx_customers_shop_code   ON customers(shop_id, code);
CREATE INDEX IF NOT EXISTS idx_customers_archived    ON customers(shop_id, archived);

-- سجل التواصل (داخل ملف العميل — لا صفحة مستقلة)
CREATE TABLE IF NOT EXISTS customer_contact_log (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shop_id     TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'note',   -- note | call | message | followup
    content     TEXT NOT NULL DEFAULT '',
    followup_at TIMESTAMPTZ,
    staff_name  TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_log_customer ON customer_contact_log(shop_id, customer_id);

-- الولاء والمكافآت (وحدة اختيارية)
CREATE TABLE IF NOT EXISTS loyalty_settings (
    shop_id              TEXT PRIMARY KEY,
    enabled              BOOLEAN NOT NULL DEFAULT FALSE,
    points_per_currency  DOUBLE PRECISION NOT NULL DEFAULT 100,  -- كل 100 جنيه = نقطة
    signup_points        INTEGER NOT NULL DEFAULT 0,
    min_redeem_points    INTEGER NOT NULL DEFAULT 0,
    rules                JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_ledger (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shop_id       TEXT NOT NULL,
    customer_id   TEXT NOT NULL,
    delta         INTEGER NOT NULL,                -- + كسب / - استبدال
    balance_after INTEGER NOT NULL,
    reason        TEXT NOT NULL DEFAULT '',        -- earn:order | redeem | signup | manual
    ref_id        TEXT NOT NULL DEFAULT '',
    staff_name    TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_customer ON loyalty_ledger(shop_id, customer_id);

-- ربط الطلبات بالعميل المركزي
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(shop_id, customer_id);
