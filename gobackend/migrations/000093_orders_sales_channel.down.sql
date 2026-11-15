DROP INDEX IF EXISTS "orders_shop_sales_channel_created_at_idx";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "sales_channel";
