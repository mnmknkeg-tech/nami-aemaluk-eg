DROP INDEX IF EXISTS "bookings_user_id_idx";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "total_amount";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "user_id";
