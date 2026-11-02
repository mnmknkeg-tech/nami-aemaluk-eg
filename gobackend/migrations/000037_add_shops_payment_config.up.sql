-- Payment gateway settings (Paymob etc.) edited from the dashboard
-- Payments settings tab. Stored as JSONB: { merchantId, publicKey }.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_config JSONB;
