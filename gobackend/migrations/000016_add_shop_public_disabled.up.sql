-- Add public_disabled flag to shops for temporarily disabling public page/map
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "public_disabled" BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering on map/public listings
CREATE INDEX IF NOT EXISTS "shops_public_disabled_idx" ON "shops"("public_disabled");
