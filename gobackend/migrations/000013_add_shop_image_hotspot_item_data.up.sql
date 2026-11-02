-- AlterTable
ALTER TABLE "shop_image_hotspots" ADD COLUMN     "item_data" JSONB;

-- CreateIndex
CREATE INDEX "offers_shopId_idx" ON "offers"("shopId");

-- CreateIndex
CREATE INDEX "offers_product_id_idx" ON "offers"("product_id");

-- CreateIndex
CREATE INDEX "offers_isActive_idx" ON "offers"("isActive");

-- CreateIndex
CREATE INDEX "offers_expires_at_idx" ON "offers"("expires_at");

-- CreateIndex
CREATE INDEX "products_shopId_idx" ON "products"("shopId");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "shops_category_idx" ON "shops"("category");

-- CreateIndex
CREATE INDEX "shops_slug_idx" ON "shops"("slug");

-- CreateIndex
CREATE INDEX "shops_status_idx" ON "shops"("status");

-- CreateIndex
CREATE INDEX "shops_isActive_idx" ON "shops"("isActive");
