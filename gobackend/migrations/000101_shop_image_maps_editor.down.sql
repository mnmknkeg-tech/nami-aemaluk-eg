-- Reverse of 000101: drop the editor-aligned columns.

ALTER TABLE "shop_image_hotspots"
  DROP COLUMN IF EXISTS "shape",
  DROP COLUMN IF EXISTS "metadata";

ALTER TABLE "shop_image_sections"
  DROP COLUMN IF EXISTS "image_url",
  DROP COLUMN IF EXISTS "width",
  DROP COLUMN IF EXISTS "height";

ALTER TABLE "shop_image_maps"
  ALTER COLUMN "updated_at" DROP DEFAULT,
  ALTER COLUMN "image_url" SET NOT NULL,
  DROP COLUMN IF EXISTS "layout",
  DROP COLUMN IF EXISTS "name";
