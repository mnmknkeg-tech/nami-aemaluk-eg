-- Published builder config snapshot: separating the draft (builder_config)
-- from what visitors actually see. Publish copies draft -> published.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS builder_published_config JSONB;
