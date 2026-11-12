-- Create product_categories table
CREATE TABLE IF NOT EXISTS "product_categories" (
    "id"                TEXT NOT NULL,
    "shop_id"           TEXT NOT NULL,
    "name"              TEXT NOT NULL,
    "name_ar"           TEXT NOT NULL DEFAULT '',
    "description"       TEXT NOT NULL DEFAULT '',
    "parent_category_id" TEXT,
    "image"             TEXT NOT NULL DEFAULT '',
    "status"            TEXT NOT NULL DEFAULT 'active',
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE,
    CONSTRAINT "product_categories_parent_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "product_categories_shop_id_idx" ON "product_categories"("shop_id");
CREATE INDEX IF NOT EXISTS "product_categories_status_idx" ON "product_categories"("status");
