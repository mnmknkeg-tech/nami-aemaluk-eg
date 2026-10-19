-- Add add-ons / extras JSON fields

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "addons" JSONB;

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "addons" JSONB;

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "extras" JSONB;
