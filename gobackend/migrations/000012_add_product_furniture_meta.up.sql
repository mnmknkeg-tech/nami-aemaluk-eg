-- CreateTable
CREATE TABLE "product_furniture_meta" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "unit" TEXT,
    "length_cm" DOUBLE PRECISION,
    "width_cm" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_furniture_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_furniture_meta_product_id_key" ON "product_furniture_meta"("product_id");

-- CreateIndex
CREATE INDEX "product_furniture_meta_product_id_idx" ON "product_furniture_meta"("product_id");

-- AddForeignKey
ALTER TABLE "product_furniture_meta" ADD CONSTRAINT "product_furniture_meta_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
