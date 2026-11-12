-- Rollback compliance tables
-- (tables dropped in reverse order)
DROP TABLE IF EXISTS aml_alerts;
DROP TABLE IF EXISTS product_reports;
DROP TABLE IF EXISTS breach_incidents;
DROP TABLE IF EXISTS data_subject_requests;
DROP TABLE IF EXISTS user_consents;