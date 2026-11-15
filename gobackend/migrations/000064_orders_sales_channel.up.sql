-- Keep the commercial source channel separate from the legacy order source.
-- Legacy source remains unchanged for existing reports and integrations.
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "sales_channel" TEXT NOT NULL DEFAULT 'marketplace';

UPDATE "orders"
SET "sales_channel" = CASE
  WHEN LOWER(COALESCE("source", '')) = 'pos' THEN 'pos'
  WHEN LOWER(COALESCE("source", '')) IN ('website', 'guest') THEN 'website'
  ELSE 'marketplace'
END;

CREATE INDEX IF NOT EXISTS "orders_shop_sales_channel_created_at_idx"
  ON "orders" ("shop_id", "sales_channel", "created_at" DESC);
