-- Add delivery_disabled to shops
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "delivery_disabled" BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering
CREATE INDEX IF NOT EXISTS "shops_delivery_disabled_idx" ON "shops" ("delivery_disabled");
