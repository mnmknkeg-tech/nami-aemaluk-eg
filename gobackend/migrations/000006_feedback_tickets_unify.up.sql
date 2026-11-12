-- Unify feedback table with the new tickets/feedback backend shape.
-- Keeps existing columns and adds optional relations for admin tooling.

ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "shop_id" TEXT;
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "product_id" TEXT;

ALTER TABLE "feedback" ALTER COLUMN "user_name" DROP NOT NULL;
ALTER TABLE "feedback" ALTER COLUMN "user_email" DROP NOT NULL;

ALTER TABLE "feedback" ALTER COLUMN "status" SET DEFAULT 'PENDING';

UPDATE "feedback"
SET "status" = CASE
  WHEN lower("status") = 'pending' THEN 'PENDING'
  WHEN lower("status") = 'in_progress' THEN 'IN_PROGRESS'
  WHEN lower("status") = 'resolved' THEN 'RESOLVED'
  WHEN lower("status") = 'rejected' THEN 'REJECTED'
  ELSE upper("status")
END;

ALTER TABLE "feedback"
ADD CONSTRAINT "feedback_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback"
ADD CONSTRAINT "feedback_shop_id_fkey"
FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback"
ADD CONSTRAINT "feedback_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
