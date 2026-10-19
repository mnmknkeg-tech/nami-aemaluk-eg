import { ComponentNode } from '../../../types/builder';

export const automotiveFleetComponents: Record<string, ComponentNode> = {
  // ==========================================
  // PAGE 2: FLEET PAGE (أسطول السيارات)
  // ==========================================
  'page_fleet_root': {
    id: 'page_fleet_root',
    name: 'صفحة أسطول السيارات',
    type: 'container',
    category: 'layout',
    parentId: null,
    childrenIds: ['comp_header', 'comp_fleet_hero', 'comp_products_grid', 'comp_bento_features', 'comp_cta_banner', 'comp_footer'],
    props: {},
    styles: {
      desktop: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
      },
    },
  },
  'comp_fleet_hero': {
    id: 'comp_fleet_hero',
    name: 'قسم أسطول السيارات الترحيبي',
    type: 'hero',
    category: 'section',
    parentId: 'page_fleet_root',
    childrenIds: ['fleet_hero_container'],
    props: {},
    styles: {
      desktop: {
        display: 'block',
        width: '100%',
        backgroundColor: '#f8fafc',
        paddingTop: '64px',
        paddingBottom: '64px',
        borderBottomWidth: '1px',
        borderColor: '#e2e8f0',
      },
    },
  },
  'fleet_hero_container': {
    id: 'fleet_hero_container',
    name: 'حاوية نصوص أسطول السيارات',
    type: 'container',
    category: 'layout',
    parentId: 'comp_fleet_hero',
    childrenIds: ['fleet_hero_badge', 'fleet_hero_title', 'fleet_hero_subtitle', 'fleet_filter_tabs'],
    props: {},
    styles: {
      desktop: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '1280px',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: '24px',
        paddingRight: '24px',
        gap: '16px',
      },
    },
  },
  'fleet_hero_badge': {
    id: 'fleet_hero_badge',
    name: 'شارة أسطول السيارات',
    type: 'badge',
    category: 'media',
    parentId: 'fleet_hero_container',
    childrenIds: [],
    props: {
      text: '🏎️ تشكيلة 2025 الحصرية في الرياض',
      variant: 'subtle',
    },
    styles: {
      desktop: {
        backgroundColor: '#dbeafe',
        textColor: '#1e40af',
        paddingTop: '6px',
        paddingBottom: '6px',
        paddingLeft: '16px',
        paddingRight: '16px',
        borderRadius: '9999px',
        fontSize: '13px',
        fontWeight: '600',
      },
    },
  },
  'fleet_hero_title': {
    id: 'fleet_hero_title',
    name: 'عنوان صفحة الأسطول',
    type: 'heading',
    category: 'typography',
    parentId: 'fleet_hero_container',
    childrenIds: [],
    props: {
      text: 'استكشف أسطول السيارات الفاخرة المتاحة للتسليم الفوري',
      tag: 'h1',
    },
    styles: {
      desktop: {
        fontSize: '40px',
        fontWeight: '800',
        textColor: '#0f172a',
        fontFamily: 'Tajawal, sans-serif',
        maxWidth: '900px',
        lineHeight: '1.25',
      },
      mobile: {
        fontSize: '26px',
      },
    },
  },
  'fleet_hero_subtitle': {
    id: 'fleet_hero_subtitle',
    name: 'وصف صفحة الأسطول',
    type: 'paragraph',
    category: 'typography',
    parentId: 'fleet_hero_container',
    childrenIds: [],
    props: {
      text: 'تصفح أحدث سيارات الدفع الرباعي الفارهة، والسيارات الرياضية الخارقة مع تفاصيل المواصفات الفنية وخيارات التمويل الميسر.',
    },
    styles: {
      desktop: {
        fontSize: '16px',
        textColor: '#475569',
        maxWidth: '680px',
        lineHeight: '1.7',
      },
    },
  },
  'fleet_filter_tabs': {
    id: 'fleet_filter_tabs',
    name: 'شريط فلاتر الموديلات',
    type: 'paragraph',
    category: 'typography',
    parentId: 'fleet_hero_container',
    childrenIds: [],
    props: {
      text: 'الكل (48)    •    مرسيدس AMG (14)    •    بورش GT3 (12)    •    رينج روفر (9)    •    بنتلي (8)    •    فيراري (5)',
    },
    styles: {
      desktop: {
        fontSize: '14px',
        fontWeight: '600',
        textColor: '#1d4ed8',
        backgroundColor: '#ffffff',
        paddingTop: '10px',
        paddingBottom: '10px',
        paddingLeft: '24px',
        paddingRight: '24px',
        borderRadius: '9999px',
        borderWidth: '1px',
        borderColor: '#cbd5e1',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        marginTop: '12px',
      },
    },
  },
};
