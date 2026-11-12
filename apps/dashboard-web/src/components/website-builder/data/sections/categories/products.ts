import { SectionTemplate } from '../types';

const makeProductsTemplate = (options: {
  id: string;
  nameAr: string;
  descriptionAr: string;
  title: string;
  subtitle: string;
  badge: string;
  cardShape: string;
  columnsDesktop: number;
  columnsTablet: number;
  columnsMobile: number;
  backgroundColor: string;
  paddingTop: string;
  paddingBottom: string;
}): SectionTemplate => {
  const rootNodeId = `tmpl_${options.id.replace(/-/g, '_')}_root`;

  return {
    id: options.id,
    name: options.id,
    nameAr: options.nameAr,
    category: 'products',
    activity: 'general',
    style: 'modern',
    wireframeType: 'products-grid',
    descriptionAr: options.descriptionAr,
    tags: ['منتجات', 'متجر', 'كتالوج', 'شبكة', 'سلة'],
    rootNodeId,
    nodes: {
      [rootNodeId]: {
        id: rootNodeId,
        name: options.nameAr,
        type: 'products',
        category: 'section',
        parentId: null,
        childrenIds: [],
        props: {
          title: options.title,
          subtitle: options.subtitle,
          badge: options.badge,
          cardShape: options.cardShape,
          columnsDesktop: options.columnsDesktop,
          columnsTablet: options.columnsTablet,
          columnsMobile: options.columnsMobile,
          showPrice: true,
          showDescription: true,
          showBadge: true,
          buyButtonMode: 'full',
          buyButtonText: 'أضف إلى السلة',
        },
        styles: {
          desktop: {
            display: 'block',
            width: '100%',
            backgroundColor: options.backgroundColor,
            paddingTop: options.paddingTop,
            paddingBottom: options.paddingBottom,
          },
          tablet: {
            paddingTop: '52px',
            paddingBottom: '52px',
          },
          mobile: {
            paddingTop: '36px',
            paddingBottom: '36px',
          },
        },
      },
    },
  };
};

export const productsTemplates: SectionTemplate[] = [
  makeProductsTemplate({
    id: 'products-featured-grid',
    nameAr: 'شبكة منتجات مختارة',
    descriptionAr: 'قسم متجر متجاوب يعرض المنتجات الفعلية مع السعر والوصف وزر الإضافة للسلة.',
    title: 'اختيارات مميزة لك',
    subtitle: 'تصفّح منتجاتنا الأكثر تميزاً، واختر ما يناسبك بسهولة.',
    badge: 'مختارة بعناية',
    cardShape: 'classic',
    columnsDesktop: 4,
    columnsTablet: 2,
    columnsMobile: 2,
    backgroundColor: '#f8fafc',
    paddingTop: '72px',
    paddingBottom: '72px',
  }),
  makeProductsTemplate({
    id: 'products-minimal-grid',
    nameAr: 'منتجات بتصميم بسيط ونظيف',
    descriptionAr: 'بطاقات بسيطة ومساحات هادئة لعرض الكتالوج مع تركيز واضح على المنتجات.',
    title: 'تسوّق المجموعة الجديدة',
    subtitle: 'تصميم نظيف يسهّل اكتشاف التفاصيل ومقارنة المنتجات.',
    badge: 'وصل حديثاً',
    cardShape: 'minimal',
    columnsDesktop: 4,
    columnsTablet: 2,
    columnsMobile: 2,
    backgroundColor: '#ffffff',
    paddingTop: '64px',
    paddingBottom: '64px',
  }),
  makeProductsTemplate({
    id: 'products-editorial-list',
    nameAr: 'قائمة منتجات أفقية',
    descriptionAr: 'عرض تحريري ببطاقات أفقية مناسب للمنتجات التي تحتاج مساحة أكبر للوصف.',
    title: 'تفاصيل تستحق الاكتشاف',
    subtitle: 'اعرض مزايا كل منتج وصورته وسعره ضمن تخطيط أفقي واضح.',
    badge: 'دليل المنتجات',
    cardShape: 'horizontal',
    columnsDesktop: 2,
    columnsTablet: 1,
    columnsMobile: 1,
    backgroundColor: '#f8fafc',
    paddingTop: '68px',
    paddingBottom: '68px',
  }),
];
