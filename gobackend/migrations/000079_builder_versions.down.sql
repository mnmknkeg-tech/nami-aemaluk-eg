-- Down migration for 000079_builder_versions
ALTER TABLE shops DROP COLUMN IF EXISTS builder_published_version_id;
DROP INDEX IF EXISTS idx_builder_versions_created_at;
DROP INDEX IF EXISTS idx_builder_versions_shop_kind;
DROP INDEX IF EXISTS idx_builder_versions_shop_id;
DROP TABLE IF EXISTS builder_versions;