-- Ensure push subscription tables match Prisma schema

-- MerchantPushSubscription: add missing columns if table already exists with older shape
ALTER TABLE "merchant_push_subscriptions" ADD COLUMN IF NOT EXISTS "subscription" JSONB;
ALTER TABLE "merchant_push_subscriptions" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3);

-- CustomerPushSubscription: add missing columns if table already exists with older shape
ALTER TABLE "customer_push_subscriptions" ADD COLUMN IF NOT EXISTS "subscription" JSONB;
ALTER TABLE "customer_push_subscriptions" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3);
