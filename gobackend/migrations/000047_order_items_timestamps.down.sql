DROP INDEX IF EXISTS "order_items_order_id_idx";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "updated_at";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "created_at";
