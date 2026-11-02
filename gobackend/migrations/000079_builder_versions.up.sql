-- Builder version history: immutable snapshots of drafts and published revisions.
-- Every autosave creates a draft version; every publish creates a published version.
-- Provides rollback, concurrency control (ETag via version), and audit trail.
CREATE TABLE IF NOT EXISTS builder_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    version_number BIGINT NOT NULL,
    version_kind VARCHAR(20) NOT NULL CHECK (version_kind IN ('draft', 'published')),
    label VARCHAR(255),
    description TEXT,
    author_id TEXT,
    author_role VARCHAR(50),
    config JSONB NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    parent_version_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT builder_versions_shop_version_unique UNIQUE (shop_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_builder_versions_shop_id ON builder_versions(shop_id);
CREATE INDEX IF NOT EXISTS idx_builder_versions_shop_kind ON builder_versions(shop_id, version_kind);
CREATE INDEX IF NOT EXISTS idx_builder_versions_created_at ON builder_versions(created_at DESC);

-- Track the latest published version per shop for fast lookup.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS builder_published_version_id UUID REFERENCES builder_versions(id);

-- down migration
-- ALTER TABLE shops DROP COLUMN IF EXISTS builder_published_version_id;
-- DROP INDEX IF EXISTS idx_builder_versions_created_at;
-- DROP INDEX IF EXISTS idx_builder_versions_shop_kind;
-- DROP INDEX IF EXISTS idx_builder_versions_shop_id;
-- DROP TABLE IF EXISTS builder_versions;