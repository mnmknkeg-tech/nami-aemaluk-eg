-- POST /api/v1/bookings failed with SQLSTATE 42P01 (relation "booking_categories"
-- does not exist). The bookings repository also relies on columns and id defaults
-- that earlier migrations never created, so each of them would fail next.

CREATE TABLE IF NOT EXISTS "booking_categories" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "shop_id" TEXT,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booking_categories_type_is_active_idx" ON "booking_categories"("type", "is_active");

-- booking_services.category_id (inserted by EnsureBookingService)
DO $$ BEGIN
    ALTER TABLE "booking_services" ADD COLUMN "category_id" TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- booking_slots.date / start_time / end_time (inserted by EnsureBookingSlot)
DO $$ BEGIN ALTER TABLE "booking_slots" ADD COLUMN "date" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "booking_slots" ADD COLUMN "start_time" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "booking_slots" ADD COLUMN "end_time" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;

-- The repository never supplies id / updated_at, so the database must.
ALTER TABLE "booking_services" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "booking_slots" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "bookings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "bookings" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
