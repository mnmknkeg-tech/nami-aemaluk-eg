-- CreateTable
CREATE TABLE "order_returns" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "reason" TEXT,
    "return_to_stock" BOOLEAN NOT NULL DEFAULT false,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_return_items" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "line_total" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "order_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_returns_order_id_idx" ON "order_returns"("order_id");

-- CreateIndex
CREATE INDEX "order_returns_shop_id_created_at_idx" ON "order_returns"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "order_returns_created_by_id_idx" ON "order_returns"("created_by_id");

-- CreateIndex
CREATE INDEX "order_return_items_order_item_id_idx" ON "order_return_items"("order_item_id");

-- CreateIndex
CREATE INDEX "order_return_items_product_id_idx" ON "order_return_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_return_items_return_id_order_item_id_key" ON "order_return_items"("return_id", "order_item_id");

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "order_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
