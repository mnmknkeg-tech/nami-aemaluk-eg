-- Compliance: user consents table (Law 151/2020)
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('privacy_policy','cookies_analytics','cookies_marketing','data_collection','gps_tracking')),
    granted BOOLEAN NOT NULL DEFAULT true,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    ip_address TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_type ON user_consents(user_id, consent_type);

-- Data Subject Requests table
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('access','correction','deletion','objection','portability')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
    details JSONB DEFAULT '{}',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dsr_user ON data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);

-- Breach incidents table
CREATE TABLE IF NOT EXISTS breach_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    affected_users_count INT NOT NULL DEFAULT 0,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_regulator_at TIMESTAMPTZ,
    notified_users_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','notified_regulator','notified_users','resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product reports table
CREATE TABLE IF NOT EXISTS product_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    reporter_id TEXT,
    reason TEXT NOT NULL CHECK (reason IN ('misleading','counterfeit','unsafe','inappropriate','other')),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','action_taken','dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reports_product ON product_reports(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reports_status ON product_reports(status);

-- AML alerts table
CREATE TABLE IF NOT EXISTS aml_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('merchant','order')),
    entity_id TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('high_volume','rapid_transactions','unusual_pattern')),
    threshold_exceeded JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','investigated','closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aml_alerts_entity ON aml_alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_status ON aml_alerts(status);
