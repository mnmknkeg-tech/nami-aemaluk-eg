-- Published website support: track when a shop's builder site was published
ALTER TABLE shops ADD COLUMN IF NOT EXISTS builder_published_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_shops_builder_published_at ON shops(builder_published_at) WHERE builder_published_at IS NOT NULL;