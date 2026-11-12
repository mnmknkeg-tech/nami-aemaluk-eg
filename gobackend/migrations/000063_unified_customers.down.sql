-- Revert unified customers additions
DROP TABLE IF EXISTS loyalty_ledger;
DROP TABLE IF EXISTS loyalty_settings;
DROP TABLE IF EXISTS customer_contact_log;
DROP INDEX IF EXISTS idx_loyalty_ledger_customer;
DROP INDEX IF EXISTS idx_contact_log_customer;
DROP INDEX IF EXISTS idx_customers_archived;
DROP INDEX IF EXISTS idx_customers_shop_code;
ALTER TABLE customers DROP COLUMN IF EXISTS code;
ALTER TABLE customers DROP COLUMN IF EXISTS customer_type;
ALTER TABLE customers DROP COLUMN IF EXISTS company_name;
ALTER TABLE customers DROP COLUMN IF EXISTS tax_number;
ALTER TABLE customers DROP COLUMN IF EXISTS source;
ALTER TABLE customers DROP COLUMN IF EXISTS branch;
ALTER TABLE customers DROP COLUMN IF EXISTS segment_id;
ALTER TABLE customers DROP COLUMN IF EXISTS tags;
ALTER TABLE customers DROP COLUMN IF EXISTS notes;
ALTER TABLE customers DROP COLUMN IF EXISTS shipping_addresses;
ALTER TABLE customers DROP COLUMN IF EXISTS addresses;
ALTER TABLE customers DROP COLUMN IF EXISTS archived;
ALTER TABLE customers DROP COLUMN IF EXISTS loyalty_balance;
ALTER TABLE customers DROP COLUMN IF EXISTS balance_due;

DROP INDEX IF EXISTS idx_orders_customer;
ALTER TABLE orders DROP COLUMN IF EXISTS customer_id;
