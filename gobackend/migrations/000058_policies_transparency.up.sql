-- Shop policies + product transparency
CREATE TABLE IF NOT EXISTS shop_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('refund','exchange','shipping')),
    content TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_policies_shop ON shop_policies(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_policies_shop_type ON shop_policies(shop_id, type);

ALTER TABLE products ADD COLUMN IF NOT EXISTS vat_inclusive BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2);