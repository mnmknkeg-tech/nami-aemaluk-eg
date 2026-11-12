-- Guest orders have no user account, so user_id must be nullable. Existing
-- authenticated order records remain unchanged.
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE orders ADD COLUMN request_hash TEXT;

ALTER TABLE orders
    ADD CONSTRAINT orders_idempotency_hash_required
    CHECK (idempotency_key IS NULL OR request_hash IS NOT NULL);

CREATE UNIQUE INDEX orders_shop_idempotency_key
    ON orders (shop_id, idempotency_key);
