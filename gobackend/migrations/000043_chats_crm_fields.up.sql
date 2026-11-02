-- Extend chats table with CRM helpdesk fields expected by the dashboard.
-- Existing messenger columns (participants, type, etc.) are kept for
-- backward compatibility.

ALTER TABLE chats ADD COLUMN IF NOT EXISTS customer_name  TEXT NOT NULL DEFAULT '';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS customer_email TEXT NOT NULL DEFAULT '';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'open';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS assigned_to    TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS channel        TEXT NOT NULL DEFAULT 'web';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS priority       TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS tags           JSONB NOT NULL DEFAULT '[]';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS unread_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS message_count  INTEGER NOT NULL DEFAULT 0;
