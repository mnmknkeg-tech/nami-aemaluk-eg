-- Performance indexes for higher user/order/shop volume.
CREATE INDEX IF NOT EXISTS "users_role_isActive_createdAt_idx" ON "users"("role", "isActive", "createdAt");
CREATE INDEX IF NOT EXISTS "users_isActive_createdAt_idx" ON "users"("isActive", "createdAt");

CREATE INDEX IF NOT EXISTS "shops_status_createdAt_idx" ON "shops"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "shops_status_isActive_public_disabled_createdAt_idx" ON "shops"("status", "isActive", "public_disabled", "createdAt");
CREATE INDEX IF NOT EXISTS "shops_category_governorate_createdAt_idx" ON "shops"("category", "governorate", "createdAt");

CREATE INDEX IF NOT EXISTS "products_shopId_isActive_createdAt_idx" ON "products"("shopId", "isActive", "createdAt");

CREATE INDEX IF NOT EXISTS "orders_shopId_status_createdAt_idx" ON "orders"("shopId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_courier_id_status_createdAt_idx" ON "orders"("courier_id", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");
