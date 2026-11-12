-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: booking_resources
CREATE TABLE IF NOT EXISTS "booking_resources" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bookings
CREATE TABLE IF NOT EXISTS "bookings" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "resource_id" TEXT,
    "item_id" TEXT,
    "item_name" TEXT,
    "item_image" TEXT,
    "item_price" DOUBLE PRECISION,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: merchant_push_subscriptions
CREATE TABLE IF NOT EXISTS "merchant_push_subscriptions" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customer_push_subscriptions
CREATE TABLE IF NOT EXISTS "customer_push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- AlterTable: shops (Add public_disabled if not exists)
DO $$ BEGIN
    ALTER TABLE "shops" ADD COLUMN "public_disabled" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- AlterTable: orders (Add source if not exists)
DO $$ BEGIN
    ALTER TABLE "orders" ADD COLUMN "source" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- CreateIndices
CREATE INDEX IF NOT EXISTS "booking_resources_shop_id_idx" ON "booking_resources"("shop_id");
CREATE INDEX IF NOT EXISTS "bookings_shop_id_created_at_idx" ON "bookings"("shop_id", "created_at");
CREATE INDEX IF NOT EXISTS "bookings_resource_id_idx" ON "bookings"("resource_id");
CREATE UNIQUE INDEX IF NOT EXISTS "merchant_push_subscriptions_shop_id_endpoint_key" ON "merchant_push_subscriptions"("shop_id", "endpoint");
CREATE INDEX IF NOT EXISTS "merchant_push_subscriptions_shop_id_idx" ON "merchant_push_subscriptions"("shop_id");
CREATE INDEX IF NOT EXISTS "merchant_push_subscriptions_endpoint_idx" ON "merchant_push_subscriptions"("endpoint");
CREATE INDEX IF NOT EXISTS "merchant_push_subscriptions_is_active_idx" ON "merchant_push_subscriptions"("is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_push_subscriptions_user_id_endpoint_key" ON "customer_push_subscriptions"("user_id", "endpoint");
CREATE INDEX IF NOT EXISTS "customer_push_subscriptions_user_id_idx" ON "customer_push_subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "customer_push_subscriptions_endpoint_idx" ON "customer_push_subscriptions"("endpoint");
CREATE INDEX IF NOT EXISTS "customer_push_subscriptions_is_active_idx" ON "customer_push_subscriptions"("is_active");
CREATE INDEX IF NOT EXISTS "shops_public_disabled_idx" ON "shops"("public_disabled");

-- AddForeignKeys
DO $$ BEGIN
    ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "booking_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "merchant_push_subscriptions" ADD CONSTRAINT "merchant_push_subscriptions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "customer_push_subscriptions" ADD CONSTRAINT "customer_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
