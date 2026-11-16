-- Store the delivery charge and selected zone as an immutable order snapshot.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_zone TEXT;
