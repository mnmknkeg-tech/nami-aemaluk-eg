-- Align the shop image map tables with the image-map editor repository.
-- The Go repository (internal/domains/shopimagemap) persists maps with
-- name/layout columns and reads sections/hotspots with image_url, width,
-- height, shape and metadata columns — none of which existed in the
-- 000005 schema, so every editor write (create/save) failed with 500.

ALTER TABLE "shop_image_maps"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "layout" JSONB;

-- The editor may create a map before an image is attached.
ALTER TABLE "shop_image_maps" ALTER COLUMN "image_url" DROP NOT NULL;

-- The repository INSERT does not set updated_at explicitly.
ALTER TABLE "shop_image_maps" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "shop_image_sections"
  ADD COLUMN IF NOT EXISTS "image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "width" INTEGER,
  ADD COLUMN IF NOT EXISTS "height" INTEGER;

ALTER TABLE "shop_image_hotspots"
  ADD COLUMN IF NOT EXISTS "shape" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;
