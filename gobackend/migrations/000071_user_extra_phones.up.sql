-- Users can store additional contact phone numbers (beyond the primary one)
-- so checkout can offer them as quick-pick options.
ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_phones JSONB NOT NULL DEFAULT '[]';
