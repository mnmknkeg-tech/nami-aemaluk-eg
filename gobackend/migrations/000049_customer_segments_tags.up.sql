-- Customer segments & tags (dashboard CRM)
CREATE TABLE IF NOT EXISTS customer_segments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_segments_shop ON customer_segments(shop_id);

CREATE TABLE IF NOT EXISTS customer_tags (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#3B82F6',
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_tags_shop ON customer_tags(shop_id);

CREATE TABLE IF NOT EXISTS customer_tag_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shop_id TEXT NOT NULL,
    tag_id TEXT NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tag_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_shop ON customer_tag_assignments(shop_id);
