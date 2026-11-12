-- Seed the image-editor app so merchants can install it from the Apps page.
-- The image map editor stays hidden everywhere until the merchant installs it.
INSERT INTO apps (id, key, name, description, version, permissions, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'image-editor',
    'محرر الصور التفاعلي',
    'حوّل صور منتجاتك إلى خرائط تفاعلية قابلة للنقر — اربط كل جزء من الصورة بمنتج يفتحه العميل مباشرة',
    '1.0.0',
    '[{"key":"products","label":"قراءة المنتجات"}]'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (key) DO NOTHING;
