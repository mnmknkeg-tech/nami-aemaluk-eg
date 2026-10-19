-- Two-factor authentication secret for TOTP codes. The Go auth repository
-- reads and writes users.tfa_secret on every user scan/insert; databases
-- built before 2FA landed never received this column.
ALTER TABLE users ADD COLUMN IF NOT EXISTS tfa_secret TEXT NOT NULL DEFAULT '';
