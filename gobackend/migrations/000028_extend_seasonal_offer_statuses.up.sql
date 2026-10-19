-- Create seasonal_offers table if not exists
CREATE TABLE IF NOT EXISTS seasonal_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    occasion VARCHAR(100),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE seasonal_offers DROP CONSTRAINT IF EXISTS seasonal_offers_status_check;
ALTER TABLE seasonal_offers
    ADD CONSTRAINT seasonal_offers_status_check
    CHECK (status IN ('draft', 'active', 'scheduled', 'paused', 'ended', 'expired'));

CREATE INDEX IF NOT EXISTS idx_seasonal_offers_shop_id ON seasonal_offers(shop_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_offers_status ON seasonal_offers(status);
