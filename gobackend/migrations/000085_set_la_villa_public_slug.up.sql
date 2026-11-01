-- Keep the public URL aligned with the merchant's current display name.
UPDATE shops
SET slug = 'la-villa', updated_at = CURRENT_TIMESTAMP
WHERE slug = 'al-islam'
  AND (name ILIKE '%villa%' OR name ILIKE '%لافيلا%')
  AND NOT EXISTS (SELECT 1 FROM shops existing WHERE existing.slug = 'la-villa');
