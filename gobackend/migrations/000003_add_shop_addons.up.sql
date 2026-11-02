-- Add shop-level add-ons JSON field

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "addons" JSONB;
