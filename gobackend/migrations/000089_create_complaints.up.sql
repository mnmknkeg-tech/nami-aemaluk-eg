-- Complaints table for the dashboard CRM complaints page.
-- The frontend (apps/dashboard-web/app/dashboard/(main)/crm/complaints/page.tsx)
-- performs full CRUD against /complaints with rich fields that do not fit the
-- generic feedback table, so complaints get a dedicated table.

CREATE TABLE IF NOT EXISTS complaints (
    id                 TEXT PRIMARY KEY,
    shop_id            TEXT NOT NULL,
    subject            TEXT NOT NULL DEFAULT '',
    subject_ar         TEXT NOT NULL DEFAULT '',
    description        TEXT NOT NULL DEFAULT '',
    customer_name      TEXT NOT NULL DEFAULT '',
    customer_email     TEXT NOT NULL DEFAULT '',
    customer_phone     TEXT NOT NULL DEFAULT '',
    status             TEXT NOT NULL DEFAULT 'open',
    priority           TEXT NOT NULL DEFAULT 'medium',
    category           TEXT NOT NULL DEFAULT '',
    assigned_to        TEXT NOT NULL DEFAULT '',
    department         TEXT NOT NULL DEFAULT '',
    reported_date      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_date      TIMESTAMP(3),
    resolution         TEXT NOT NULL DEFAULT '',
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_date     TIMESTAMP(3),
    attachments        JSONB NOT NULL DEFAULT '[]',
    tags               JSONB NOT NULL DEFAULT '[]',
    created_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS complaints_shop_id_idx ON complaints(shop_id);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints(status);
CREATE INDEX IF NOT EXISTS complaints_priority_idx ON complaints(priority);
CREATE INDEX IF NOT EXISTS complaints_reported_date_idx ON complaints(reported_date);
