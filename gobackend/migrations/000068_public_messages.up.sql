-- Public inbox: contact-form and suggestion submissions from the public
-- marketplace (POST /api/v1/contact, POST /api/v1/suggestions).
CREATE TABLE IF NOT EXISTS public_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind       VARCHAR(20) NOT NULL CHECK (kind IN ('contact', 'suggestion')),
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    message    TEXT NOT NULL,
    meta       TEXT,
    handled    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    handled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_public_messages_kind_created ON public_messages (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_messages_handled ON public_messages (handled) WHERE NOT handled;
