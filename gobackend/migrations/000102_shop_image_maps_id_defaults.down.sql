-- Reverse of 000102.

ALTER TABLE "shop_image_hotspots" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "shop_image_sections" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "shop_image_maps" ALTER COLUMN "id" DROP DEFAULT;
