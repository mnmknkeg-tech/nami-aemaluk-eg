-- CreateIndex
CREATE INDEX "feedback_shop_id_created_at_idx" ON "feedback"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_product_id_created_at_idx" ON "feedback"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_status_created_at_idx" ON "feedback"("status", "created_at");

-- CreateIndex
CREATE INDEX "offers_shopId_isActive_expires_at_idx" ON "offers"("shopId", "isActive", "expires_at");

-- CreateIndex
CREATE INDEX "offers_shopId_createdAt_idx" ON "offers"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "reservations_shop_id_status_created_at_idx" ON "reservations"("shop_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "reservations_customer_phone_created_at_idx" ON "reservations"("customer_phone", "created_at");

-- CreateIndex
CREATE INDEX "reservations_created_at_idx" ON "reservations"("created_at");

-- CreateIndex
CREATE INDEX "shop_analytics_shop_id_date_idx" ON "shop_analytics"("shop_id", "date");

-- CreateIndex
CREATE INDEX "shop_analytics_date_idx" ON "shop_analytics"("date");

-- CreateIndex
CREATE INDEX "shop_gallery_shop_id_isActive_created_at_idx" ON "shop_gallery"("shop_id", "isActive", "created_at");

-- CreateIndex
CREATE INDEX "shop_gallery_shop_id_is_hero_idx" ON "shop_gallery"("shop_id", "is_hero");

-- CreateIndex
CREATE INDEX "shop_gallery_shop_id_media_type_idx" ON "shop_gallery"("shop_id", "media_type");
