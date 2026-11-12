-- One-time recovery codes for two-factor authentication. Generated when a user
-- enables 2FA; each code can be consumed once to sign in when the authenticator
-- device is unavailable. Only a SHA-256 hash is stored, so a database leak does
-- not expose usable codes.
CREATE TABLE IF NOT EXISTS user_recovery_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_recovery_codes_user ON user_recovery_codes(user_id, used_at);
