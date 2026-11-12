-- Extend order returns for the dashboard POS/website returns pages and
-- introduce POS shifts (open/close cashier sessions).

ALTER TABLE "order_returns" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "order_returns" ADD COLUMN "note" TEXT;

-- Allow return items that reference a product directly (POS flow) rather than
-- an original order item, and keep a display name for ad-hoc rows.
ALTER TABLE "order_return_items" ALTER COLUMN "order_item_id" DROP NOT NULL;
ALTER TABLE "order_return_items" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "order_return_items" ADD COLUMN "name" TEXT;

CREATE INDEX "order_returns_status_idx" ON "order_returns"("shop_id", "status");

-- Feedback merchant replies ----------------------------------------------
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "response" TEXT;
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "responded_at" TIMESTAMP(3);

-- POS shifts -------------------------------------------------------------
CREATE TABLE "pos_shifts" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "opened_by_id" TEXT,
    "opening_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closing_amount" DOUBLE PRECISION,
    "expected_amount" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "total_sales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orders_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "note" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "pos_shifts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pos_shifts_shop_status_idx" ON "pos_shifts"("shop_id", "status");
CREATE INDEX "pos_shifts_shop_opened_at_idx" ON "pos_shifts"("shop_id", "opened_at");

ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
