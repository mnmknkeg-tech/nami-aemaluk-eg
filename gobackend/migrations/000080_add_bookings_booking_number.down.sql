DROP INDEX IF EXISTS "bookings_booking_number_idx";

ALTER TABLE "bookings" DROP COLUMN IF EXISTS "booking_number";
