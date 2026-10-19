-- shops.builder_config is referenced by the Go builder/settings code but was
-- never created by any earlier migration on databases that predate the Go
-- backend (the legacy Prisma schema). Add it if missing.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS builder_config JSONB;
