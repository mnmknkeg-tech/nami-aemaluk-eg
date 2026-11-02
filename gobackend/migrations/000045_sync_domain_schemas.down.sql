ALTER TABLE notifications DROP COLUMN IF EXISTS read_at;

ALTER TABLE reservations
    DROP COLUMN IF EXISTS customer_id,
    DROP COLUMN IF EXISTS addons,
    DROP COLUMN IF EXISTS subtotal,
    DROP COLUMN IF EXISTS expires_at;

DROP TABLE IF EXISTS gallery_items;
