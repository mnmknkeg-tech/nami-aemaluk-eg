-- Repair migration for AI platform core + reservations/push subs constraints.
-- This migration is designed to be safe on existing (non-empty) production DBs.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiSubscriptionTier') THEN
    CREATE TYPE "AiSubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiActionStatus') THEN
    CREATE TYPE "AiActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'ROLLED_BACK');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiActionRisk') THEN
    CREATE TYPE "AiActionRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;
END $$;

-- customer_push_subscriptions: keep data-safe then enforce NOT NULL
ALTER TABLE "customer_push_subscriptions"
  DROP COLUMN IF EXISTS "auth",
  DROP COLUMN IF EXISTS "p256dh";

UPDATE "customer_push_subscriptions" SET "subscription" = '{}'::jsonb WHERE "subscription" IS NULL;
ALTER TABLE "customer_push_subscriptions" ALTER COLUMN "subscription" SET NOT NULL;

-- merchant_push_subscriptions
ALTER TABLE "merchant_push_subscriptions"
  DROP COLUMN IF EXISTS "auth",
  DROP COLUMN IF EXISTS "p256dh";

UPDATE "merchant_push_subscriptions" SET "subscription" = '{}'::jsonb WHERE "subscription" IS NULL;
ALTER TABLE "merchant_push_subscriptions" ALTER COLUMN "subscription" SET NOT NULL;

-- orders
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "customer_note" TEXT,
  ADD COLUMN IF NOT EXISTS "customer_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_address_manual" TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "delivery_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "delivery_note" TEXT,
  ADD COLUMN IF NOT EXISTS "handed_to_courier_at" TIMESTAMP(3);

ALTER TABLE "orders" ALTER COLUMN "source" SET DEFAULT 'customer';

-- products
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "model_3d_url" TEXT,
  ADD COLUMN IF NOT EXISTS "spin_images" JSONB;

-- reservations: add updated_at safely
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'updatedAt'
  ) THEN
    EXECUTE 'UPDATE "reservations" SET "updated_at" = COALESCE("updated_at", "updatedAt", NOW()) WHERE "updated_at" IS NULL';
  ELSE
    EXECUTE 'UPDATE "reservations" SET "updated_at" = COALESCE("updated_at", NOW()) WHERE "updated_at" IS NULL';
  END IF;
END $$;

ALTER TABLE "reservations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "updatedAt";

-- shops
ALTER TABLE "shops"
  ADD COLUMN IF NOT EXISTS "ai_tier" "AiSubscriptionTier" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "ai_usage_month" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ai_usage_reset_at" TIMESTAMP(3);

-- ai_audit_logs
CREATE TABLE IF NOT EXISTS "ai_audit_logs" (
  "id" TEXT NOT NULL,
  "shop_id" TEXT NOT NULL,
  "user_id" TEXT,
  "conversation_id" TEXT,
  "action" TEXT NOT NULL,
  "tool_name" TEXT,
  "params" JSONB,
  "before_state" JSONB,
  "after_state" JSONB,
  "status" "AiActionStatus" NOT NULL,
  "risk_level" "AiActionRisk" NOT NULL DEFAULT 'LOW',
  "requires_approval" BOOLEAN NOT NULL DEFAULT false,
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "execution_time_ms" INTEGER,
  "error_message" TEXT,
  "rollback_data" JSONB,
  "cost_tokens" INTEGER,
  "cost_usd" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "knowledge_documents" (
  "id" TEXT NOT NULL,
  "shop_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "source_id" TEXT,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "content_vector" JSONB,
  "metadata" JSONB,
  "chunk_index" INTEGER,
  "total_chunks" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_jobs" (
  "id" TEXT NOT NULL,
  "shop_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 5,
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- indexes
CREATE INDEX IF NOT EXISTS "ai_audit_logs_shop_id_created_at_idx" ON "ai_audit_logs" ("shop_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_audit_logs_status_risk_level_idx" ON "ai_audit_logs" ("status", "risk_level");
CREATE INDEX IF NOT EXISTS "ai_audit_logs_user_id_created_at_idx" ON "ai_audit_logs" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "knowledge_documents_shop_id_type_idx" ON "knowledge_documents" ("shop_id", "type");
CREATE INDEX IF NOT EXISTS "knowledge_documents_source_id_idx" ON "knowledge_documents" ("source_id");
CREATE INDEX IF NOT EXISTS "knowledge_documents_is_active_updated_at_idx" ON "knowledge_documents" ("is_active", "updated_at");

CREATE INDEX IF NOT EXISTS "ai_jobs_status_priority_idx" ON "ai_jobs" ("status", "priority");
CREATE INDEX IF NOT EXISTS "ai_jobs_shop_id_type_idx" ON "ai_jobs" ("shop_id", "type");
CREATE INDEX IF NOT EXISTS "ai_jobs_created_at_idx" ON "ai_jobs" ("created_at");

-- foreign keys (best-effort)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_audit_logs_shop_id_fkey') THEN
    ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_audit_logs_user_id_fkey') THEN
    ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_documents_shop_id_fkey') THEN
    ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
