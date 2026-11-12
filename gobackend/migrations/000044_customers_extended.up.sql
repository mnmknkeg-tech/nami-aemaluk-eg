-- Extend customers table with fields the dashboard CRM page writes.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address     TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city        TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country     TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
