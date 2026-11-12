-- Adds supporting indexes for product search/filter/sort introduced in the
-- unified listing refactor.
--
-- The trigram (GIN) indexes below depend on the pg_trgm extension. Some
-- locally-created databases do not have it enabled, so ensure it exists before
-- creating the indexes that reference gin_trgm_ops (otherwise migration fails,
-- the DB pool is not created, and every /api/v1 route returns "Cannot POST").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_shop_active_created
    ON products (shop_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_price
    ON products (price);

CREATE INDEX IF NOT EXISTS idx_products_category
    ON products (lower(category));

-- Trigram index for fast ILIKE '%term%' search on product name/description.
-- Requires PostgreSQL pg_trgm extension (created in earlier migrations).
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
    ON products USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_desc_trgm
    ON products USING GIN (description gin_trgm_ops);
