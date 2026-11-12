DROP INDEX IF EXISTS "orders_pos_shift_id_idx";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "pos_shift_id";
