-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "OrderCourierOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- DropForeignKey
ALTER TABLE "feedback" DROP CONSTRAINT IF EXISTS "feedback_user_email_fkey";

-- AlterTable
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "variant_pricing" JSONB;

-- AlterTable
ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "colors" JSONB,
ADD COLUMN IF NOT EXISTS "images" JSONB,
ADD COLUMN IF NOT EXISTS "sizes" JSONB,
ADD COLUMN IF NOT EXISTS "track_stock" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "shop_image_maps" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "title" TEXT,
    "image_url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ai_meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_image_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shop_image_sections" (
    "id" TEXT NOT NULL,
    "map_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_image_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shop_image_hotspots" (
    "id" TEXT NOT NULL,
    "map_id" TEXT NOT NULL,
    "section_id" TEXT,
    "product_id" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "label" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "price_override" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ai_meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_image_hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "courier_states" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "last_lat" DOUBLE PRECISION,
    "last_lng" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_courier_offers" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "courier_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderCourierOfferStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_courier_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shop_image_maps_shop_id_idx" ON "shop_image_maps"("shop_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shop_image_sections_map_id_idx" ON "shop_image_sections"("map_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shop_image_hotspots_map_id_idx" ON "shop_image_hotspots"("map_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shop_image_hotspots_section_id_idx" ON "shop_image_hotspots"("section_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shop_image_hotspots_product_id_idx" ON "shop_image_hotspots"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "courier_states_user_id_key" ON "courier_states"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "courier_states_user_id_idx" ON "courier_states"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_courier_offers_courier_id_status_idx" ON "order_courier_offers"("courier_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_courier_offers_order_id_status_idx" ON "order_courier_offers"("order_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "order_courier_offers_order_id_courier_id_key" ON "order_courier_offers"("order_id", "courier_id");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "shop_image_maps" ADD CONSTRAINT "shop_image_maps_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "shop_image_sections" ADD CONSTRAINT "shop_image_sections_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "shop_image_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "shop_image_hotspots" ADD CONSTRAINT "shop_image_hotspots_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "shop_image_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "shop_image_hotspots" ADD CONSTRAINT "shop_image_hotspots_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "shop_image_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "shop_image_hotspots" ADD CONSTRAINT "shop_image_hotspots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "courier_states" ADD CONSTRAINT "courier_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "order_courier_offers" ADD CONSTRAINT "order_courier_offers_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "order_courier_offers" ADD CONSTRAINT "order_courier_offers_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
