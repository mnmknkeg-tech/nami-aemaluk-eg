-- Add missing product variant fields used by the app (fashion colors/sizes, images, unit, stock tracking)

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "track_stock" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit" TEXT;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pack_options" JSONB;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "images" JSONB;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "colors" JSONB;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sizes" JSONB;
