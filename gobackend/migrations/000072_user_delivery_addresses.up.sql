-- Saved delivery addresses per user (profile → "عناويني"). Kept as a JSONB
-- list on the user row — a handful of addresses, no cross-table queries.
ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_addresses JSONB NOT NULL DEFAULT '[]';
