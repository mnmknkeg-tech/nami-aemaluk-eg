-- Add restaurant product menu variants (types/flavors) and size selection

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "menu_variants" JSONB;

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_selection" JSONB;

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "variant_selection" JSONB;
