-- Migration to add missing fields to feedback table
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'GENERAL';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'content') THEN
    UPDATE feedback SET comment = content WHERE comment IS NULL;
  END IF;
END $$;