-- Expand booking infrastructure for booking-driven activities (clinics, chalets, hotels, rentals, etc.).
-- The statements are idempotent so production deploys can run safely after older partial booking migrations.

-- Services / bookable offerings for a shop.
CREATE TABLE IF NOT EXISTS "booking_services" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "activity_type" TEXT,
    "button_key" TEXT,
    "description" TEXT,
    "duration_minutes" INTEGER,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id")
);

-- Availability slots for services/resources.
CREATE TABLE IF NOT EXISTS "booking_slots" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "service_id" TEXT,
    "resource_id" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "max_capacity" INTEGER NOT NULL DEFAULT 1,
    "current_bookings" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_slots_pkey" PRIMARY KEY ("id")
);

-- Optional payment rows for bookings.
CREATE TABLE IF NOT EXISTS "booking_payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "refund_amount" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id")
);

-- Add missing resource fields used by different booking activities.
DO $$ BEGIN ALTER TABLE "booking_resources" ADD COLUMN "service_id" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "booking_resources" ADD COLUMN "name_ar" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "booking_resources" ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 1; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "booking_resources" ADD COLUMN "price" DOUBLE PRECISION; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "booking_resources" ADD COLUMN "duration_minutes" INTEGER; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "booking_resources" ADD COLUMN "description" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "booking_resources" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Add missing booking fields needed for customer details, service/slot linking, status timestamps and payment status.
DO $$ BEGIN ALTER TABLE "bookings" ADD COLUMN "customer_email" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "bookings" ADD COLUMN "payment_status" TEXT NOT NULL DEFAULT 'PENDING'; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "bookings" ADD COLUMN "service_id" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "bookings" ADD COLUMN "slot_id" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "bookings" ADD COLUMN "participants" INTEGER NOT NULL DEFAULT 1; EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "bookings" ADD COLUMN "confirmed_at" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "bookings" ADD COLUMN "cancelled_at" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "bookings" ADD COLUMN "completed_at" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Indexes for scalability: merchant dashboard, customer history, slots, resources and payments.
CREATE INDEX IF NOT EXISTS "booking_services_shop_id_is_active_created_at_idx" ON "booking_services"("shop_id", "is_active", "created_at");
CREATE INDEX IF NOT EXISTS "booking_services_shop_id_activity_type_is_active_idx" ON "booking_services"("shop_id", "activity_type", "is_active");
CREATE INDEX IF NOT EXISTS "booking_services_button_key_idx" ON "booking_services"("button_key");

CREATE INDEX IF NOT EXISTS "booking_resources_shop_id_is_active_created_at_idx" ON "booking_resources"("shop_id", "is_active", "created_at");
CREATE INDEX IF NOT EXISTS "booking_resources_shop_id_type_is_active_idx" ON "booking_resources"("shop_id", "type", "is_active");
CREATE INDEX IF NOT EXISTS "booking_resources_service_id_idx" ON "booking_resources"("service_id");

CREATE INDEX IF NOT EXISTS "booking_slots_shop_id_start_at_idx" ON "booking_slots"("shop_id", "start_at");
CREATE INDEX IF NOT EXISTS "booking_slots_shop_id_status_start_at_idx" ON "booking_slots"("shop_id", "status", "start_at");
CREATE INDEX IF NOT EXISTS "booking_slots_service_id_start_at_idx" ON "booking_slots"("service_id", "start_at");
CREATE INDEX IF NOT EXISTS "booking_slots_resource_id_start_at_idx" ON "booking_slots"("resource_id", "start_at");

CREATE INDEX IF NOT EXISTS "bookings_shop_id_status_start_at_idx" ON "bookings"("shop_id", "status", "start_at");
CREATE INDEX IF NOT EXISTS "bookings_customer_phone_created_at_idx" ON "bookings"("customer_phone", "created_at");
CREATE INDEX IF NOT EXISTS "bookings_service_id_idx" ON "bookings"("service_id");
CREATE INDEX IF NOT EXISTS "bookings_slot_id_idx" ON "bookings"("slot_id");

CREATE INDEX IF NOT EXISTS "booking_payments_booking_id_idx" ON "booking_payments"("booking_id");
CREATE INDEX IF NOT EXISTS "booking_payments_status_idx" ON "booking_payments"("status");

-- Foreign keys are optional where nullable, so existing rows are not blocked.
DO $$ BEGIN
    ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "booking_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "booking_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "booking_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "booking_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "booking_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
