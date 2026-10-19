import { SectionTemplate } from '../types';

export const productDetailTemplates: SectionTemplate[] = [
  {
    id: 'product-detail-showcase',
    name: 'product-detail-showcase',
    nameAr: 'استعراض المنتج والشراء الفوري (Product Showcase)',
    category: 'product_detail',
    activity: 'general',
    style: 'modern',
    wireframeType: 'product-detail-showcase',
    descriptionAr:
      'معرض صور، تفاصيل السعر، خيارات المنتج، عداد الكمية وأزرار الإضافة للسلة والطلب عبر واتساب.',
    tags: ['product', 'منتج', 'تفاصيل', 'شراء', 'سلة', 'عرض'],
    rootNodeId: 'tmpl_pdetail_root',
    nodes: {
      tmpl_pdetail_root: {
        id: 'tmpl_pdetail_root',
        name: 'قسم تفاصيل المنتج الرئيسي',
        type: 'container',
        category: 'section',
        parentId: null,
        childrenIds: ['tmpl_pdetail_box'],
        props: {},
        styles: {
          desktop: {
            display: 'block',
            width: '100%',
            backgroundColor: '#ffffff',
            paddingTop: '60px',
            paddingBottom: '60px',
            borderBottomWidth: '1px',
            borderColor: '#f1f5f9',
          },
        },
      },
      tmpl_pdetail_box: {
        id: 'tmpl_pdetail_box',
        name: 'حاوية تفاصيل المنتج',
        type: 'card',
        category: 'commerce',
        parentId: 'tmpl_pdetail_root',
        childrenIds: [],
        props: {
          title: 'اسم المنتج المميز والفاخر',
          price: '450 ج.م',
          badge: 'الأكثر مبيعاً',
          image:
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
          hoverImage:
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
          specs: [
            'خامات فائقة الجودة وضمان حقيقي',
            'توصيل فوري حتى باب البيت',
            'إمكانية المعاينة قبل الاستلام',
          ],
          buyButtonText: 'أضف للسلة الآن',
          ctaText: 'استفسار عبر واتساب',
        },
        styles: {
          desktop: {
            display: 'block',
            maxWidth: '1100px',
            marginLeft: 'auto',
            marginRight: 'auto',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            borderWidth: '1px',
            borderColor: '#e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
  },
  {
    id: 'product-specs-table',
    name: 'product-specs-table',
    nameAr: 'جدول المواصفات والضمان',
    category: 'product_detail',
    activity: 'general',
    style: 'clean',
    wireframeType: 'product-specs-table',
    descriptionAr: 'قائمة بالمواصفات الفنية، الأبعاد، شروط الضمان وتفاصيل الشحن والاسترجاع.',
    tags: ['specs', 'مواصفات', 'ضمان', 'جدول', 'تفاصيل'],
    rootNodeId: 'tmpl_pspecs_root',
    nodes: {
      tmpl_pspecs_root: {
        id: 'tmpl_pspecs_root',
        name: 'قسم جدول المواصفات',
        type: 'bento',
        category: 'section',
        parentId: null,
        childrenIds: [],
        props: {
          title: 'المواصفات الفنية والمزايا',
          subtitle: 'كل ما تحتاج معرفته عن جودة وتفاصيل المنتج قبل إتمام الطلب.',
          icon: 'ShieldCheck',
          badge: 'الجودة والضمان',
        },
        styles: {
          desktop: {
            display: 'block',
            width: '100%',
            backgroundColor: '#f8fafc',
            paddingTop: '50px',
            paddingBottom: '50px',
          },
        },
      },
    },
  },
];
