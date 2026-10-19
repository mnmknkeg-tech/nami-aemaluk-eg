UPDATE seasonal_offers SET status = 'ended' WHERE status IN ('draft', 'expired');
ALTER TABLE seasonal_offers DROP CONSTRAINT IF EXISTS seasonal_offers_status_check;
ALTER TABLE seasonal_offers
    ADD CONSTRAINT seasonal_offers_status_check
    CHECK (status IN ('active', 'scheduled', 'paused', 'ended'));
