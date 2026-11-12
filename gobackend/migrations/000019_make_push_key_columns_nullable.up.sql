-- Older DBs might have merchant/customer push subscriptions stored with separate key columns.
-- Our Prisma schema stores the full subscription JSON, so these columns must not be required.

DO $$ BEGIN
  ALTER TABLE "merchant_push_subscriptions" ALTER COLUMN "p256dh" DROP NOT NULL;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "merchant_push_subscriptions" ALTER COLUMN "auth" DROP NOT NULL;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "customer_push_subscriptions" ALTER COLUMN "p256dh" DROP NOT NULL;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "customer_push_subscriptions" ALTER COLUMN "auth" DROP NOT NULL;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN undefined_column THEN null;
END $$;
