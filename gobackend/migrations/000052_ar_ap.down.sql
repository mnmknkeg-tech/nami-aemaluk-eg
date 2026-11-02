DROP TABLE IF EXISTS acc_aging;
DROP TABLE IF EXISTS acc_tax_rates;
DROP TABLE IF EXISTS acc_tax_returns;
DROP TABLE IF EXISTS acc_fiscal_periods;
DROP TABLE IF EXISTS acc_audit_log;
DROP TABLE IF EXISTS acc_payment_allocations;
DROP TABLE IF EXISTS acc_payments;
DROP TABLE IF EXISTS acc_invoice_lines;
DROP TABLE IF EXISTS acc_invoices;
DROP TABLE IF EXISTS acc_entities;

ALTER TABLE acc_accounts
    DROP COLUMN IF EXISTS entity_type,
    DROP COLUMN IF EXISTS currency_code,
    DROP COLUMN IF EXISTS credit_limit,
    DROP COLUMN IF EXISTS payment_terms;
