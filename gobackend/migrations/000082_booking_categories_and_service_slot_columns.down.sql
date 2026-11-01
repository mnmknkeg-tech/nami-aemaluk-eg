ALTER TABLE "bookings" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "bookings" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "booking_slots" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "booking_services" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "booking_slots" DROP COLUMN IF EXISTS "end_time";
ALTER TABLE "booking_slots" DROP COLUMN IF EXISTS "start_time";
ALTER TABLE "booking_slots" DROP COLUMN IF EXISTS "date";
ALTER TABLE "booking_services" DROP COLUMN IF EXISTS "category_id";

DROP TABLE IF EXISTS "booking_categories";
