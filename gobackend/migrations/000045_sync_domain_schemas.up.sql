-- Keep the notifications table in sync with the notification domain queries,
-- which read a per-notification read_at timestamp alongside is_read.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP(3);

-- The reservation domain reads customer_id, addons, subtotal and expires_at.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS addons JSONB;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS subtotal DOUBLE PRECISION;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP(3);

-- The gallery domain uses gallery_items (the legacy shop_gallery table predates it).
CREATE TABLE IF NOT EXISTS gallery_items (
    id TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT gallery_items_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS gallery_items_shop_id_idx ON gallery_items (shop_id, sort_order);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'gallery_items_shop_id_fkey'
    ) THEN
        ALTER TABLE gallery_items
            ADD CONSTRAINT gallery_items_shop_id_fkey
            FOREIGN KEY (shop_id) REFERENCES shops(id)
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;
