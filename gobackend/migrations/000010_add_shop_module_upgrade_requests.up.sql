-- CreateEnum
CREATE TYPE "ShopModuleUpgradeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateTable
CREATE TABLE "shop_module_upgrade_requests" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "status" "ShopModuleUpgradeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_modules" JSONB NOT NULL,
    "note" TEXT,
    "requested_by_user_id" TEXT,
    "reviewed_by_admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_module_upgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_module_upgrade_requests_shop_id_idx" ON "shop_module_upgrade_requests"("shop_id");

-- CreateIndex
CREATE INDEX "shop_module_upgrade_requests_status_idx" ON "shop_module_upgrade_requests"("status");

-- AddForeignKey
ALTER TABLE "shop_module_upgrade_requests" ADD CONSTRAINT "shop_module_upgrade_requests_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
