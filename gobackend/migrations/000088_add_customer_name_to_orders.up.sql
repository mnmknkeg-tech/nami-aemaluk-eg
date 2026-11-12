-- Add customer_name column to orders for direct storage of customer name
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Backfill customer_name from linked customers or users
UPDATE orders o
SET customer_name = COALESCE(NULLIF(TRIM(c.name), ''), NULLIF(TRIM(u.name), ''))
FROM orders o2
LEFT JOIN customers c ON c.id = o2.customer_id
LEFT JOIN users u ON u.id = o2.user_id
WHERE o.id = o2.id
  AND (o.customer_name IS NULL OR TRIM(o.customer_name) = '')
  AND (c.name IS NOT NULL OR u.name IS NOT NULL);

