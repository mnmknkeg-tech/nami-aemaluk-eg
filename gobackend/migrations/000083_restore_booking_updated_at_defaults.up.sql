-- Migration 000033 dropped the updated_at DEFAULT on these tables (Prisma-style),
-- but the Go repositories never supply updated_at, so inserts fail with
-- "null value in column updated_at violates not-null constraint".
ALTER TABLE "booking_services" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "booking_slots" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "booking_payments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "booking_resources" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "booking_categories" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bookings" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
