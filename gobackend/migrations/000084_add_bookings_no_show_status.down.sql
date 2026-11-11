-- Enum values cannot be removed in PostgreSQL; reverting NO_SHOW is a no-op.
-- (Existing NO_SHOW rows keep working; the app-level transition map in
-- internal/domains/bookings/service.go no longer offers the value if needed.)
SELECT 1;
