ALTER TABLE products DROP COLUMN IF EXISTS shipping_cost;
ALTER TABLE products DROP COLUMN IF EXISTS vat_inclusive;
DROP TABLE IF EXISTS shop_policies;