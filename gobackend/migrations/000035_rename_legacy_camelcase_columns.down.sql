-- Best-effort reverse of 000035. Dropped users columns are re-added empty.

-- shops
ALTER TABLE shops RENAME COLUMN is_active TO "isActive";
ALTER TABLE shops RENAME COLUMN owner_id TO "ownerId";
ALTER TABLE shops RENAME COLUMN created_at TO "createdAt";
ALTER TABLE shops RENAME COLUMN updated_at TO "updatedAt";

-- users
ALTER TABLE users ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN "shopId" TEXT;
ALTER TABLE users ADD COLUMN "lastLogin" TIMESTAMP(3);
ALTER TABLE users ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE users SET
    "isActive"  = is_active,
    "shopId"    = shop_id,
    "lastLogin" = last_login,
    "createdAt" = created_at,
    "updatedAt" = updated_at;

-- products
ALTER TABLE products RENAME COLUMN is_active TO "isActive";
ALTER TABLE products RENAME COLUMN shop_id TO "shopId";
ALTER TABLE products RENAME COLUMN created_at TO "createdAt";
ALTER TABLE products RENAME COLUMN updated_at TO "updatedAt";

-- orders
ALTER TABLE orders RENAME COLUMN shop_id TO "shopId";
ALTER TABLE orders RENAME COLUMN user_id TO "userId";
ALTER TABLE orders RENAME COLUMN created_at TO "createdAt";
ALTER TABLE orders RENAME COLUMN updated_at TO "updatedAt";

-- offers
ALTER TABLE offers RENAME COLUMN is_active TO "isActive";
ALTER TABLE offers RENAME COLUMN shop_id TO "shopId";
ALTER TABLE offers RENAME COLUMN created_at TO "createdAt";
ALTER TABLE offers RENAME COLUMN updated_at TO "updatedAt";

-- apps
ALTER TABLE apps RENAME COLUMN created_at TO "createdAt";
ALTER TABLE apps RENAME COLUMN updated_at TO "updatedAt";
