CREATE TABLE IF NOT EXISTS audit_login_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL,
    user_email    VARCHAR(255),
    user_role     VARCHAR(50),
    login_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_at     TIMESTAMPTZ,
    duration_min  INTEGER,
    ip_address    INET,
    user_agent    TEXT,
    session_token VARCHAR(500),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_login_events_user_id ON audit_login_events(user_id);
CREATE INDEX idx_audit_login_events_login_at ON audit_login_events(login_at DESC);
CREATE INDEX idx_audit_login_events_session_token ON audit_login_events(session_token);
CREATE INDEX idx_audit_login_events_logout_at ON audit_login_events(logout_at) WHERE logout_at IS NULL;
