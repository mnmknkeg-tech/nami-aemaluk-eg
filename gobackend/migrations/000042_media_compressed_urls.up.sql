-- The media domain reads a compressed_urls JSONB column that the media table
-- never received.
ALTER TABLE media ADD COLUMN IF NOT EXISTS compressed_urls JSONB;
