/*
  Warnings:

  - You are about to drop the column `auth` on the `customer_push_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `p256dh` on the `customer_push_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `auth` on the `merchant_push_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `p256dh` on the `merchant_push_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `reservations` table. All the data in the column will be lost.
  - Made the column `subscription` on table `customer_push_subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subscription` on table `merchant_push_subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `reservations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AiSubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AiActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "AiActionRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "customer_push_subscriptions" DROP COLUMN "auth",
DROP COLUMN "p256dh",
ALTER COLUMN "subscription" SET NOT NULL;

-- AlterTable
ALTER TABLE "merchant_push_subscriptions" DROP COLUMN "auth",
DROP COLUMN "p256dh",
ALTER COLUMN "subscription" SET NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customer_note" TEXT,
ADD COLUMN     "customer_phone" TEXT,
ADD COLUMN     "delivery_address_manual" TEXT,
ADD COLUMN     "delivery_lat" DOUBLE PRECISION,
ADD COLUMN     "delivery_lng" DOUBLE PRECISION,
ADD COLUMN     "delivery_note" TEXT,
ADD COLUMN     "handed_to_courier_at" TIMESTAMP(3),
ALTER COLUMN "source" SET DEFAULT 'customer';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "model_3d_url" TEXT,
ADD COLUMN     "spin_images" JSONB;

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "updatedAt",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "ai_tier" "AiSubscriptionTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "ai_usage_month" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ai_usage_reset_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ai_audit_logs" (
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

-- CreateTable
CREATE TABLE "knowledge_documents" (
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

-- CreateTable
CREATE TABLE "ai_jobs" (
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

-- CreateIndex
CREATE INDEX "ai_audit_logs_shop_id_created_at_idx" ON "ai_audit_logs"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_audit_logs_status_risk_level_idx" ON "ai_audit_logs"("status", "risk_level");

-- CreateIndex
CREATE INDEX "ai_audit_logs_user_id_created_at_idx" ON "ai_audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "knowledge_documents_shop_id_type_idx" ON "knowledge_documents"("shop_id", "type");

-- CreateIndex
CREATE INDEX "knowledge_documents_source_id_idx" ON "knowledge_documents"("source_id");

-- CreateIndex
CREATE INDEX "knowledge_documents_is_active_updated_at_idx" ON "knowledge_documents"("is_active", "updated_at");

-- CreateIndex
CREATE INDEX "ai_jobs_status_priority_idx" ON "ai_jobs"("status", "priority");

-- CreateIndex
CREATE INDEX "ai_jobs_shop_id_type_idx" ON "ai_jobs"("shop_id", "type");

-- CreateIndex
CREATE INDEX "ai_jobs_created_at_idx" ON "ai_jobs"("created_at");

-- AddForeignKey
ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
