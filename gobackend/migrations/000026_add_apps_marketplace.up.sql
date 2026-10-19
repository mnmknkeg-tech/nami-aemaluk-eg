-- CreateEnum
CREATE TYPE "ShopAppStatus" AS ENUM ('INSTALLED', 'UNINSTALLED');

-- CreateTable
CREATE TABLE "apps" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "permissions" JSONB,
    "hooks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_apps" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "status" "ShopAppStatus" NOT NULL DEFAULT 'INSTALLED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_apps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apps_key_key" ON "apps"("key");

-- CreateIndex
CREATE INDEX "apps_key_idx" ON "apps"("key");

-- CreateIndex
CREATE INDEX "shop_apps_shop_id_idx" ON "shop_apps"("shop_id");

-- CreateIndex
CREATE INDEX "shop_apps_app_id_idx" ON "shop_apps"("app_id");

-- CreateIndex
CREATE INDEX "shop_apps_shop_id_is_active_idx" ON "shop_apps"("shop_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "shop_apps_shop_id_app_id_key" ON "shop_apps"("shop_id", "app_id");

-- AddForeignKey
ALTER TABLE "shop_apps" ADD CONSTRAINT "shop_apps_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_apps" ADD CONSTRAINT "shop_apps_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
