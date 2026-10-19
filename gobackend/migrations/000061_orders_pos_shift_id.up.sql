-- Link orders to their POS shift directly so refreshMetrics can use an
-- exact join instead of a time-window approximation.
-- The column is nullable: online/marketplace orders have no shift.

DO $$ BEGIN
  ALTER TABLE "orders" ADD COLUMN "pos_shift_id" TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "orders_pos_shift_id_idx" ON "orders"("pos_shift_id")
  WHERE pos_shift_id IS NOT NULL;

-- Backfill existing POS orders: find the open shift that was active when
-- each order was created (same shop, opened before the order, not yet closed
-- at the time of the order, pick the latest-opened one).
UPDATE orders o
SET pos_shift_id = (
  SELECT s.id
  FROM pos_shifts s
  WHERE s.shop_id = o.shop_id
    AND s.opened_at <= o.created_at + INTERVAL '10 minutes'
    AND (s.closed_at IS NULL OR s.closed_at >= o.created_at)
  ORDER BY s.opened_at DESC
  LIMIT 1
)
WHERE LOWER(COALESCE(o.source, '')) = 'pos'
  AND o.pos_shift_id IS NULL;
