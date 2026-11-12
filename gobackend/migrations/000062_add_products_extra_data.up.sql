-- Flexible storage for extended product fields (discounts, SEO, shipping,
-- inventory codes, notifications, custom fields…). Keeps the products table
-- stable while the rich product editor evolves.
ALTER TABLE products ADD COLUMN extra_data JSONB;
