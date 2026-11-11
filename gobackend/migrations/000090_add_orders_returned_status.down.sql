-- Enum values cannot be removed in PostgreSQL; reverting RETURNED is a no-op.
-- (Existing RETURNED rows keep working; the app-level transition map in
-- internal/domains/orders/service.go stops offering the value if needed.)
SELECT 1;
