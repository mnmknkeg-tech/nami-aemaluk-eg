-- The bookings repository selects b.user_id, b.total_amount and b.currency
-- but the bookings table (created in 000017/000032) never had them, so every
-- list/find query failed with SQLSTATE 42703 (HTTP 500).

DO $$ BEGIN
    ALTER TABLE "bookings" ADD COLUMN "user_id" TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "bookings" ADD COLUMN "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "bookings" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EGP';
EXCEPTION WHEN duplicate_column THEN null; END $$;

UPDATE "bookings" SET "total_amount" = COALESCE("item_price", 0) WHERE "total_amount" = 0 AND "item_price" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "bookings_user_id_idx" ON "bookings"("user_id");
