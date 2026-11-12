-- أصناف المطاعم والكافيهات متتجهز عند الطلب (طبخ حسب الطلب) — مالهاش مخزون متتبع.
-- الداتا القديمة المنشأة قبل حماية الإنشاء/الاستيراد كانت بتسجل track_stock=true
-- وستوك 0، فأي طلب عميل من المنيو كان بيرفض بـ«الكمية غير متوفرة في المخزون»
-- (orders/service.go: if p.TrackStock && it.Quantity > p.Stock).
-- الحمايات الحالية (products/service.go Create + import.go) بتجبر track_stock=false
-- للمطاعم عند الإنشاء — المايجريشن ده بصلّح الصنوف القديمة الموجودة فعلًا.
UPDATE products p
SET track_stock = false,
    updated_at = NOW()
FROM shops s
WHERE p.shop_id = s.id
  AND s.category = 'RESTAURANT'
  AND p.track_stock = true;
