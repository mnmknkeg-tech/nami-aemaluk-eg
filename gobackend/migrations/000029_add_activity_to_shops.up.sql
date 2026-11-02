ALTER TABLE shops ADD COLUMN IF NOT EXISTS activity TEXT;
CREATE INDEX IF NOT EXISTS idx_shops_activity ON shops(activity);
