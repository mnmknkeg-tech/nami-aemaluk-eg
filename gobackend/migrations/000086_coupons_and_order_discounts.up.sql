CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    name_ar TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed', 'free_shipping', 'buy_x_get_y')),
    value DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (value >= 0),
    min_order_value DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
    max_discount_value DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (max_discount_value >= 0),
    usage_limit INTEGER NOT NULL DEFAULT 0 CHECK (usage_limit >= 0),
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    starts_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP(3),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (shop_id, code)
);
CREATE INDEX IF NOT EXISTS coupons_shop_status_idx ON coupons(shop_id, status);
CREATE INDEX IF NOT EXISTS coupons_lookup_idx ON coupons(shop_id, code, status);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DOUBLE PRECISION NOT NULL DEFAULT 0;
