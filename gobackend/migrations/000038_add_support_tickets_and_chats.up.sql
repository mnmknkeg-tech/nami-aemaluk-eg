-- Support tickets and chats tables expected by the support/chat domains.
-- These were referenced in code but never created by earlier migrations.

CREATE TABLE IF NOT EXISTS support_tickets (
    id          TEXT PRIMARY KEY,
    user_id     TEXT,
    shop_id     TEXT,
    subject     TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'OPEN',
    priority    TEXT NOT NULL DEFAULT 'MEDIUM',
    category    TEXT NOT NULL DEFAULT 'GENERAL',
    created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS support_tickets_shop_id_idx ON support_tickets(shop_id);
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);

CREATE TABLE IF NOT EXISTS chats (
    id              TEXT PRIMARY KEY,
    participants    JSONB NOT NULL DEFAULT '[]',
    type            TEXT NOT NULL DEFAULT 'direct',
    shop_id         TEXT,
    order_id        TEXT,
    last_message    TEXT,
    last_message_at TIMESTAMP(3),
    created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chats_shop_id_idx ON chats(shop_id);
CREATE INDEX IF NOT EXISTS chats_order_id_idx ON chats(order_id);
