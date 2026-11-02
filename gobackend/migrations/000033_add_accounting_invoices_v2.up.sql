-- DropForeignKey
ALTER TABLE "booking_payments" DROP CONSTRAINT "booking_payments_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_services" DROP CONSTRAINT "booking_services_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_slots" DROP CONSTRAINT "booking_slots_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_customer_phone_fkey";

-- DropIndex
DROP INDEX "booking_resources_shop_id_idx";

-- AlterTable
ALTER TABLE "booking_payments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "booking_services" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "booking_slots" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "customer_phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "reservations" ALTER COLUMN "customer_phone" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_phone_fkey" FOREIGN KEY ("customer_phone") REFERENCES "users"("phone") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
