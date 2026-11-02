-- Published website support: track when a shop's builder site was published
DROP INDEX IF EXISTS idx_shops_builder_published_at;
ALTER TABLE shops DROP COLUMN IF EXISTS builder_published_at;