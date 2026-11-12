-- CreateEnum
CREATE TYPE "MediaOptimizationStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'MODEL_3D';

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'images',
    "original_key" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "thumb_key" TEXT,
    "thumb_url" TEXT,
    "small_key" TEXT,
    "small_url" TEXT,
    "medium_key" TEXT,
    "medium_url" TEXT,
    "optimized_key" TEXT,
    "optimized_url" TEXT,
    "optimization_status" "MediaOptimizationStatus" NOT NULL DEFAULT 'PENDING',
    "optimization_error" TEXT,
    "linked_type" TEXT,
    "linked_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_shop_id_purpose_created_at_idx" ON "media"("shop_id", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "media_shop_id_linked_type_linked_id_idx" ON "media"("shop_id", "linked_type", "linked_id");

-- CreateIndex
CREATE INDEX "media_optimization_status_idx" ON "media"("optimization_status");

-- CreateIndex
CREATE INDEX "media_original_key_idx" ON "media"("original_key");

-- CreateIndex
CREATE INDEX "media_created_at_idx" ON "media"("created_at");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
