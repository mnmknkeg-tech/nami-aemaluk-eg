-- KYC columns for shops (AML/KYC)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS tax_registration_number TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS commercial_registry_number TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified','rejected'));
ALTER TABLE shops ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;