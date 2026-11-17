-- The editor repository lets PostgreSQL generate map ids; 000005 created the
-- tables with "id" TEXT NOT NULL but no default, so every repository INSERT
-- failed with a null-id violation (SQLSTATE 23502).

ALTER TABLE "shop_image_maps" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "shop_image_sections" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "shop_image_hotspots" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
