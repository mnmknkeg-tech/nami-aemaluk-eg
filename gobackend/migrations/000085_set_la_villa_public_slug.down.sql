UPDATE shops
SET slug = 'al-islam', updated_at = CURRENT_TIMESTAMP
WHERE slug = 'la-villa'
  AND (name ILIKE '%villa%' OR name ILIKE '%لافيلا%');
