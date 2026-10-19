-- Per-surface product visibility:
--   is_active  → ظهور المنتج في موقع المتجر (الموقع)
--   app_active → ظهور المنتج في تطبيق الماركت (التطبيق)
-- إخفاء المنتج = العلمين false. الباكفيل يحافظ على الظهور الحالي بالظبط:
-- اللي كان ظاهر (is_active=true) يفضل ظاهر في الاتنين، واللي كان مخفي يفضل مخفي في الاتنين.
ALTER TABLE products ADD COLUMN IF NOT EXISTS app_active BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE products SET app_active = is_active;
