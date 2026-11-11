-- The bookings domain accepted NO_SHOW since phase-0 (normalizeBookingStatus,
-- UpdateStatus) but the BookingStatus enum created in 000017 only has
-- PENDING / CONFIRMED / COMPLETED / CANCELLED. Any PATCH status=NO_SHOW
-- therefore failed with SQLSTATE 22P02 (invalid input value for enum) → HTTP 500.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';
