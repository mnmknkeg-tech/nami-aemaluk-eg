-- Page-level visit analytics: one row per visit to any public URL on the platform.
-- The marketplace (and any other public front) pings POST /api/v1/analytics/visits
-- on every page load; admins read the aggregated logs from GET /api/v1/analytics/visits.
CREATE TABLE IF NOT EXISTS page_visits (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path        TEXT NOT NULL,
    referrer    TEXT,
    device_type VARCHAR(20) NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop','mobile','tablet')),
    user_agent  TEXT,
    ip_address  INET,
    visitor_id  TEXT,
    user_id     UUID,
    shop_id     UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_path        ON page_visits (path);
CREATE INDEX IF NOT EXISTS idx_page_visits_device      ON page_visits (device_type);
CREATE INDEX IF NOT EXISTS idx_page_visits_ip          ON page_visits (ip_address);
CREATE INDEX IF NOT EXISTS idx_page_visits_visitor     ON page_visits (visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_shop        ON page_visits (shop_id);
