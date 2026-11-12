-- Give the current Arabic merchant a readable public URL instead of the fallback slug "shop".
UPDATE shops
SET slug = 'al-islam', updated_at = CURRENT_TIMESTAMP
WHERE slug = 'shop'
  AND name = 'الاسلام'
  AND NOT EXISTS (SELECT 1 FROM shops existing WHERE existing.slug = 'al-islam');
