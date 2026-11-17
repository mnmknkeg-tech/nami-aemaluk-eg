-- Store the delivery charge and selected zone as an immutable order snapshot.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_zone TEXT;
