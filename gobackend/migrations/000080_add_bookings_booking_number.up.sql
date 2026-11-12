-- The bookings repository selects and inserts booking_number (see
-- internal/domains/bookings/repository.go) but no earlier migration created
-- the column, so every bookings query failed with "column does not exist"
-- (HTTP 500) on production databases provisioned from these migrations.

DO $$ BEGIN
    ALTER TABLE "bookings" ADD COLUMN "booking_number" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Backfill legacy rows so the repository contract (booking_number scanned
-- into a plain string, never NULL) always holds. md5(id) keeps the generated
-- numbers unique per row.
UPDATE "bookings"
SET "booking_number" = 'BK-' || to_char(COALESCE(created_at, NOW()), 'YYYYMMDDHH24MISS') || '-' || upper(substr(md5(id), 1, 6))
WHERE "booking_number" IS NULL;

CREATE INDEX IF NOT EXISTS "bookings_booking_number_idx" ON "bookings"("booking_number");
