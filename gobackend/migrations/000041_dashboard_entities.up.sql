-- Unified storage for the dashboard's simple shop-scoped entities
-- (finance, marketing, inventory-ops, crm). Each row is one entity of a
-- given "kind"; type-specific fields live in the JSONB data column.

CREATE TABLE "dashboard_entities" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "number" TEXT,
    "status" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_entities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dashboard_entities_kind_shop_idx" ON "dashboard_entities"("kind", "shop_id");
CREATE INDEX "dashboard_entities_shop_created_idx" ON "dashboard_entities"("shop_id", "created_at");

ALTER TABLE "dashboard_entities" ADD CONSTRAINT "dashboard_entities_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Product stock thresholds used by the low-stock alerts page.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "min_stock" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "max_stock" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reorder_point" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reorder_quantity" INTEGER;
