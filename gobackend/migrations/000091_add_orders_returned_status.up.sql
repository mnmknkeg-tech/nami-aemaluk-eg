-- The dashboard POS full-return flow (sales/page.tsx processReturn) sends
-- status=RETURNED to PATCH /shops/:shopId/orders/:orderId, but the OrderStatus
-- enum created in 000001 only has
-- PENDING / CONFIRMED / PREPARING / READY / DELIVERED / CANCELLED / REFUNDED.
-- Every full return therefore failed with SQLSTATE 22P02 (invalid input value
-- for enum) → HTTP 500, while the dashboard optimistically displayed the
-- order as "مرتجع" — the DB kept the old status.
-- This mirrors the bookings NO_SHOW fix (000084): the backend accepted the
-- value at the application layer before the enum allowed it.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
