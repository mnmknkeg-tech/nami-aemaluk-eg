-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MapListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OwnershipRole" AS ENUM ('OWNER', 'MANAGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ClaimRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AnalyticsEventType" AS ENUM ('LISTING_VIEW', 'WEBSITE_CLICK', 'WHATSAPP_CLICK', 'PHONE_CLICK', 'DIRECTIONS_CLICK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "cart_events" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "customer_name" TEXT,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "event" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "metadata" JSONB,
    "is_recovered" BOOLEAN NOT NULL DEFAULT false,
    "recovered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "map_listings" (
    "id" TEXT NOT NULL,
    "linked_shop_id" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "website_url" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "social_links" JSONB,
    "logo_url" TEXT,
    "cover_url" TEXT,
    "status" "MapListingStatus" NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "map_listing_branches" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "name" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address_label" TEXT,
    "governorate" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_listing_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "map_listing_owners" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_listing_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "map_listing_ownerships" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "role" "OwnershipRole" NOT NULL DEFAULT 'OWNER',
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "map_listing_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "map_listing_claim_requests" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ClaimRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_listing_claim_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "map_listing_analytics_events" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "map_listing_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "portal_otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'login',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cart_events_shop_id_event_idx" ON "cart_events"("shop_id", "event");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cart_events_shop_id_created_at_idx" ON "cart_events"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cart_events_shop_id_product_id_idx" ON "cart_events"("shop_id", "product_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cart_events_user_id_shop_id_idx" ON "cart_events"("user_id", "shop_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cart_events_session_id_idx" ON "cart_events"("session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cart_events_is_recovered_idx" ON "cart_events"("is_recovered");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listings_status_idx" ON "map_listings"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listings_category_idx" ON "map_listings"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listings_title_idx" ON "map_listings"("title");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listings_linked_shop_id_idx" ON "map_listings"("linked_shop_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listings_reviewed_by_admin_id_idx" ON "map_listings"("reviewed_by_admin_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_branches_listing_id_idx" ON "map_listing_branches"("listing_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_branches_listing_id_is_primary_idx" ON "map_listing_branches"("listing_id", "is_primary");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_branches_governorate_idx" ON "map_listing_branches"("governorate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_branches_city_idx" ON "map_listing_branches"("city");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_branches_latitude_longitude_idx" ON "map_listing_branches"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "map_listing_owners_phone_key" ON "map_listing_owners"("phone");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "map_listing_owners_email_key" ON "map_listing_owners"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_owners_phone_idx" ON "map_listing_owners"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_owners_email_idx" ON "map_listing_owners"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_owners_is_active_idx" ON "map_listing_owners"("is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_ownerships_listing_id_idx" ON "map_listing_ownerships"("listing_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_ownerships_owner_id_idx" ON "map_listing_ownerships"("owner_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_ownerships_owner_id_role_idx" ON "map_listing_ownerships"("owner_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "map_listing_ownerships_listing_id_owner_id_key" ON "map_listing_ownerships"("listing_id", "owner_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_claim_requests_listing_id_idx" ON "map_listing_claim_requests"("listing_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_claim_requests_owner_id_idx" ON "map_listing_claim_requests"("owner_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_claim_requests_status_idx" ON "map_listing_claim_requests"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_analytics_events_listing_id_idx" ON "map_listing_analytics_events"("listing_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_analytics_events_listing_id_type_idx" ON "map_listing_analytics_events"("listing_id", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_analytics_events_listing_id_created_at_idx" ON "map_listing_analytics_events"("listing_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "map_listing_analytics_events_created_at_idx" ON "map_listing_analytics_events"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "portal_otp_codes_phone_purpose_idx" ON "portal_otp_codes"("phone", "purpose");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "portal_otp_codes_expires_at_idx" ON "portal_otp_codes"("expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messages_shop_id_idx" ON "messages"("shop_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messages_shop_id_created_at_idx" ON "messages"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shop_themes_shop_id_idx" ON "shop_themes"("shop_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "cart_events" ADD CONSTRAINT "cart_events_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "map_listings" ADD CONSTRAINT "map_listings_linked_shop_id_fkey" FOREIGN KEY ("linked_shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "map_listings" ADD CONSTRAINT "map_listings_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "map_listing_branches" ADD CONSTRAINT "map_listing_branches_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "map_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "map_listing_ownerships" ADD CONSTRAINT "map_listing_ownerships_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "map_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "map_listing_ownerships" ADD CONSTRAINT "map_listing_ownerships_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "map_listing_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "map_listing_claim_requests" ADD CONSTRAINT "map_listing_claim_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "map_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "map_listing_claim_requests" ADD CONSTRAINT "map_listing_claim_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "map_listing_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "map_listing_analytics_events" ADD CONSTRAINT "map_listing_analytics_events_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "map_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
