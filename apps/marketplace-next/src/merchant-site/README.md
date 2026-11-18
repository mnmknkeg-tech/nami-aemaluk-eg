# merchant-site/ — كود موقع التاجر المنشور فقط

هذا الفولدر مخصص لحياة التاجر المستقلة خارج الماركت. أي ملف هنا يجب ألا
يستورد من كود الماركت (chrome، سلة الماركت، ميزات المتابعة/التقييم)، وأي
تعديل هنا يجب ألا يؤثر على صفحات الماركت.

## المحتويات

| الملف                                 | دوره                                                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout/SiteCheckout.tsx`           | الـ checkout الخاص بموقع التاجر المنشور (`/site/[slug]/checkout`) — سلة الموقع فقط، مسموح للزائر (guest)، متجر واحد، بدون أي brand من الماركت |
| `components/SiteCartBridge.tsx`       | يربط `PublicSiteRenderer` بسلة موقع التاجر ودرج السلة                                                                                         |
| `components/SiteProductActions.tsx`   | أزرار الشراء/الحجز داخل صفحة منتج موقع التاجر                                                                                                 |
| `components/SiteStoreProductCard.tsx` | كارت المنتج بثيم موقع التاجر                                                                                                                  |
| `components/SiteBookingFlow.tsx`      | تدفق الحجز على موقع التاجر (`/site/[slug]/book`)                                                                                              |
| `components/ShopRenderer.tsx`         | عارض ثيم التاجر الأصلي (legacy — `/shop/[slug]?view=site`)                                                                                    |
| `components/BuilderTreeRenderer.tsx`  | ينسّق عرض شجرة الموقع المنشور ويربطها بسلة التاجر وتكاملاته                                                                                   |
| `components/BuilderPrimitiveNodes.tsx` | عناصر النصوص والصور والشارات الأساسية المنشورة                                                                                               |
| `components/PublishedProductsSection.tsx` | قسم المنتجات المنشور: الكتالوج والتصنيفات والسلة والحجز وطلب واتساب                                                                        |
| `components/PublishedFooterSection.tsx` | فوتر الموقع المنشور وروابط الصفحات وبيانات التواصل                                                                                           |
| `components/PublishedHeroSection.tsx` | بنر الموقع المنشور: الوسائط والمحتوى والأزرار مع دعم بيانات Hero القديمة والجديدة                                                            |
| `components/PublishedContactForm.tsx` | نموذج التواصل والحجز المنشور                                                                                                                  |
| `components/PublishedMarketingSections.tsx` | أقسام المزايا وآراء العملاء المنشورة                                                                                                       |
| `components/BuilderMobileFooterBar.tsx` | شريط التنقل السفلي للموبايل مع ربط سلة موقع التاجر                                                                                          |

## قاعدة الفصل

- `src/market/` = كود الماركت فقط (المتصفح، الخريطة، الدليل، سلة الماركت).
- `src/merchant-site/` = كود موقع التاجر فقط (السلة الخاصة، الـ checkout
  الخاص، عارض الثيم الأصلي).
- `src/components/` و `src/lib/` = مشترك بين الاثنين (api، config، …).
- الـ `PublicSiteRenderer` نفسه يعيش في `packages/shared` لأنه مشترك مع
  لوحة التحكم (المعاينة) — أما ربطه بالسلة والـ checkout فهذا حصري لموقع
  التاجر، ولهذا يعيش هنا.
