DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM orders WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot restore orders.user_id NOT NULL while guest orders exist';
    END IF;
    ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;
END $$;

DROP INDEX IF EXISTS orders_shop_idempotency_key;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_idempotency_hash_required;
ALTER TABLE orders DROP COLUMN IF EXISTS request_hash;
ALTER TABLE orders DROP COLUMN IF EXISTS idempotency_key;
