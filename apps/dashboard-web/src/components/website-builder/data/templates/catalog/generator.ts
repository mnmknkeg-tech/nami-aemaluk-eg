import { Website, ComponentNode } from '../../../types/builder';
import { getMergedThemeTokens } from '../../defaultTheme';
import { ActivityTemplateMeta } from '../allActivities/types';
import { megaBusinessActivities } from './megaActivities';
import { moreBusinessActivities } from './moreActivities';

export const generateActivityWebsite = (meta: ActivityTemplateMeta): Website => {
  const theme = getMergedThemeTokens(meta.themeKey);
  const matchedDetail = [...megaBusinessActivities, ...moreBusinessActivities].find((a) => a.id === meta.id);

  const heroBadge = matchedDetail?.hero.badge || `${meta.badge} | خبرة وجودة معتمدة`;
  const heroTitle = matchedDetail?.hero.title || `أفضل خدمات ومنتجات ${meta.name}`;
  const heroHighlight = matchedDetail?.hero.highlightTitle || `بأعلى معايير الجودة والضمان`;
  const heroDesc = matchedDetail?.hero.description || meta.description;
  const heroImg = matchedDetail?.hero.heroImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80';

  const items = matchedDetail?.items || [
    {
      id: `${meta.id}_item_1`,
      title: `الباقة المتميزة الأولى من ${meta.name}`,
      subtitle: `خيار مثالي يلبي أعلى تطلعات عملائنا مع ضمان وخدمة ما بعد البيع`,
      price: '1,450 ج.م',
      badge: 'الأكثر طلباً',
      imageUrl: heroImg,
      features: ['ضمان معتمد', 'توصيل وتركيب فوري', 'دعم فني 24/7', 'تقسيط بدون فوائد'],
      buttonText: 'طلب الخدمة / الحجز',
    },
    {
      id: `${meta.id}_item_2`,
      title: `الباقة الفاخرة VIP المتكاملة`,
      subtitle: `حل شامل ومخصص للمشاريع والفلل والمؤسسات بأعلى المواصفات`,
      price: '3,800 ج.م',
      badge: 'VIP متكامل',
      imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80',
      features: ['شامل التركيب والمواد', 'مواصفات حصرية', 'إشراف هندسي وفني', 'خصم خاص على الكميات'],
      buttonText: 'طلب تسعير VIP',
    },
    {
      id: `${meta.id}_item_3`,
      title: `الخدمة الاقتصادية السريعة`,
      subtitle: `خدمة سريعة في نفس اليوم بجودة عالية وأسعار تنافسية`,
      price: '490 ج.م',
      badge: 'عرض خاص',
      imageUrl: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=800&auto=format&fit=crop&q=80',
      features: ['إنجاز في نفس اليوم', 'فنيين معتمدين', 'فاتورة وضمان رسمي', 'دفع عند الاستلام'],
      buttonText: 'حجز فوري',
    },
  ];

  const components: Record<string, ComponentNode> = {
    'page_root': {
      id: 'page_root',
      name: `الصفحة الرئيسية - ${meta.name}`,
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: ['gen_header', 'gen_hero', 'gen_features', 'gen_items_grid', 'gen_form', 'gen_footer'],
      props: {},
      styles: { desktop: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', textColor: '#0f172a' } },
    },
    'gen_header': {
      id: 'gen_header',
      name: 'ترويسة الموقع',
      type: 'header',
      category: 'section',
      parentId: 'page_root',
      childrenIds: ['gen_header_inner'],
      isGlobal: true,
      props: { sticky: true },
      styles: { desktop: { display: 'block', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropBlur: '12px', borderBottomWidth: '1px', borderColor: '#f1f5f9', paddingTop: '16px', paddingBottom: '16px', position: 'sticky', top: '0px', zIndex: 50 } },
    },
    'gen_header_inner': {
      id: 'gen_header_inner',
      name: 'حاوية الترويسة',
      type: 'container',
      category: 'layout',
      parentId: 'gen_header',
      childrenIds: ['gen_brand_badge', 'gen_nav_items', 'gen_header_cta'],
      props: {},
      styles: {
        desktop: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '24px', paddingRight: '24px' },
        mobile: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: '12px', paddingRight: '12px', gap: '8px', overflow: 'hidden' },
      },
    },
    'gen_brand_badge': {
      id: 'gen_brand_badge',
      name: 'شعار وهوية المنشأة',
      type: 'heading',
      category: 'typography',
      parentId: 'gen_header_inner',
      childrenIds: [],
      props: { text: `${meta.icon} ${meta.name}`, level: 'h3' },
      styles: {
        desktop: { fontSize: '20px', fontWeight: '800', textColor: meta.primaryColor },
        mobile: { fontSize: '13px', fontWeight: '800', textColor: meta.primaryColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 },
      },
    },
    'gen_nav_items': {
      id: 'gen_nav_items',
      name: 'روابط الترويسة',
      type: 'paragraph',
      category: 'typography',
      parentId: 'gen_header_inner',
      childrenIds: [],
      props: { text: 'الرئيسية • الخدمات والمنتجات • من نحن وقصتنا • تواصل معنا والحجز' },
      styles: {
        desktop: { fontSize: '14px', fontWeight: '600', textColor: '#475569' },
        mobile: { display: 'none' },
      },
    },
    'gen_header_cta': {
      id: 'gen_header_cta',
      name: 'زر الاتصال والحجز',
      type: 'button',
      category: 'action',
      parentId: 'gen_header_inner',
      childrenIds: [],
      props: { label: 'احجز الآن', variant: 'primary', linkUrl: '#contact' },
      styles: {
        desktop: { backgroundColor: meta.primaryColor, textColor: '#ffffff', paddingLeft: '20px', paddingRight: '20px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '10px', fontWeight: '700' },
        mobile: { backgroundColor: meta.primaryColor, textColor: '#ffffff', paddingLeft: '10px', paddingRight: '10px', paddingTop: '6px', paddingBottom: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 },
      },
    },
    'gen_hero': {
      id: 'gen_hero',
      name: 'القسم الترويجي الرئيسي (Hero)',
      type: 'hero',
      category: 'section',
      parentId: 'page_root',
      childrenIds: [],
      props: {
        badge: heroBadge,
        title: heroTitle,
        highlightTitle: heroHighlight,
        description: heroDesc,
        primaryCtaText: 'استكشف الخدمات والأسعار',
        primaryCtaLink: '#items',
        secondaryCtaText: 'طلب استشارة فورية',
        secondaryCtaLink: '#contact',
        imageUrl: heroImg,
        stats: [
          { label: 'عميل سعيد وخدمة منفذة', value: '+5,000' },
          { label: 'نسبة الرضا والتقييم', value: '4.9 ★' },
          { label: 'ضمان ودعم معتمد', value: '100% موثوق' },
        ],
      },
      styles: {
        desktop: { width: '100%', backgroundColor: '#f8fafc', paddingTop: '64px', paddingBottom: '64px', borderBottomWidth: '1px', borderColor: '#e2e8f0' },
        mobile: { width: '100%', backgroundColor: '#f8fafc', paddingTop: '28px', paddingBottom: '28px', paddingLeft: '14px', paddingRight: '14px', borderBottomWidth: '1px', borderColor: '#e2e8f0' },
      },
    },
    'gen_features': {
      id: 'gen_features',
      name: 'مميزات المنشأة والضمانات',
      type: 'features',
      category: 'section',
      parentId: 'page_root',
      childrenIds: [],
      props: {
        title: 'لماذا يختارنا آلاف العملاء في مصر؟',
        subtitle: 'نلتزم بأعلى معايير الحرفية، الدقة في المواعيد، وخدمات ما بعد البيع المعتمدة',
        features: [
          { title: 'جودة وضمان معتمد رسمي', description: 'شهادات فحص وضمانات موثقة تضمن حقك وراحة بالك التامة.', iconName: 'ShieldCheck' },
          { title: 'فريق مهني متخصص ومحترف', description: 'كوادر مؤهلة بخبرات عريقة وتقنيات متطورة تضمن تنفيذ أعمالك بدقة.', iconName: 'Users' },
          { title: 'أسعار تنافسية وخطط دفع مرنة', description: 'أفضل قيمة مقابل السعر مع إمكانية التقسيط الميسر عبر الدفع عند الاستلام.', iconName: 'CreditCard' },
        ],
      },
      styles: {
        desktop: { width: '100%', backgroundColor: '#ffffff', paddingTop: '64px', paddingBottom: '64px' },
        mobile: { width: '100%', backgroundColor: '#ffffff', paddingTop: '28px', paddingBottom: '28px', paddingLeft: '14px', paddingRight: '14px' },
      },
    },
    'gen_items_grid': {
      id: 'gen_items_grid',
      name: 'قسم المنتجات والخدمات المعروضة',
      type: 'grid',
      category: 'section',
      parentId: 'page_root',
      childrenIds: [],
      props: {
        title: `أبرز عروض وخدمات ${meta.name}`,
        subtitle: 'اختر الخدمة أو المنتج المناسب مع تفاصيل دقيقة للأسعار والمواصفات',
        items,
      },
      styles: {
        desktop: { width: '100%', backgroundColor: '#f8fafc', paddingTop: '64px', paddingBottom: '64px', borderTopWidth: '1px', borderBottomWidth: '1px', borderColor: '#e2e8f0' },
        mobile: { width: '100%', backgroundColor: '#f8fafc', paddingTop: '28px', paddingBottom: '28px', paddingLeft: '14px', paddingRight: '14px', borderTopWidth: '1px', borderBottomWidth: '1px', borderColor: '#e2e8f0' },
      },
    },
    'gen_form': {
      id: 'gen_form',
      name: 'نموذج الحجز والتواصل السريع',
      type: 'form',
      category: 'forms',
      parentId: 'page_root',
      childrenIds: [],
      props: {
        title: 'احجز موعدك أو اطلب عرض سعر فوري',
        subtitle: 'سيتواصل معك فريق خدمة العملاء خلال 15 دقيقة لتأكيد كافة التفاصيل وتجهيز طلبك',
        buttonText: 'تأكيد إرسال الطلب',
        fields: [
          { name: 'name', label: 'الاسم الكريم', type: 'text', placeholder: 'مثال: محمود السيد', required: true },
          { name: 'phone', label: 'رقم الجوال للتواصل والواتساب', type: 'tel', placeholder: '01xxxxxxxxx', required: true },
          { name: 'service_needed', label: 'الخدمة أو الاستفسار المطلوب', type: 'text', placeholder: 'اكتب تفاصيل طلبك...', required: true },
        ],
      },
      styles: {
        desktop: { width: '100%', backgroundColor: '#ffffff', paddingTop: '64px', paddingBottom: '64px' },
        mobile: { width: '100%', backgroundColor: '#ffffff', paddingTop: '28px', paddingBottom: '28px', paddingLeft: '14px', paddingRight: '14px' },
      },
    },
    'gen_footer': {
      id: 'gen_footer',
      name: 'تذييل الموقع',
      type: 'footer',
      category: 'section',
      parentId: 'page_root',
      childrenIds: [],
      props: {
        brandName: meta.name,
        description: `${meta.name} - ريادة وتميز في تقديم أرقى الحلول والخدمات بجمهورية مصر العربية.`,
        phone: '+20 100 123 4567',
        email: `contact@${meta.id.replace('site_', '')}.com`,
        address: 'جمهورية مصر العربية - القاهرة، الجيزة، الإسكندرية',
      },
      styles: {
        desktop: { width: '100%', backgroundColor: '#0f172a', textColor: '#f8fafc', paddingTop: '48px', paddingBottom: '32px' },
        mobile: { width: '100%', backgroundColor: '#0f172a', textColor: '#f8fafc', paddingTop: '24px', paddingBottom: '24px', paddingLeft: '14px', paddingRight: '14px', fontSize: '11px', textAlign: 'center' },
      },
    },
    'page_services_root': {
      id: 'page_services_root',
      name: `صفحة الخدمات والمنتجات - ${meta.name}`,
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: ['gen_header', 'gen_items_grid', 'gen_form', 'gen_footer'],
      props: {},
      styles: { desktop: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', textColor: '#0f172a' } },
    },
    'page_about_root': {
      id: 'page_about_root',
      name: `صفحة من نحن - ${meta.name}`,
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: ['gen_header', 'gen_features', 'gen_form', 'gen_footer'],
      props: {},
      styles: { desktop: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', textColor: '#0f172a' } },
    },
    'page_contact_root': {
      id: 'page_contact_root',
      name: `صفحة التواصل والحجز - ${meta.name}`,
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: ['gen_header', 'gen_form', 'gen_footer'],
      props: {},
      styles: { desktop: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', textColor: '#0f172a' } },
    },
  };

  const pages = [
    {
      id: 'page_home',
      name: 'الرئيسية',
      slug: 'home',
      rootNodeId: 'page_root',
      metadata: {
        title: `${meta.name} | ${meta.badge}`,
        description: meta.description,
        slug: 'home',
        isHomePage: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'page_services',
      name: 'الخدمات والمنتجات',
      slug: 'services',
      rootNodeId: 'page_services_root',
      metadata: {
        title: `الخدمات والمنتجات | ${meta.name}`,
        description: `تصفح أرقى الخدمات والمنتجات المقدمة من ${meta.name}`,
        slug: 'services',
        isHomePage: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'page_about',
      name: 'من نحن وقصتنا',
      slug: 'about',
      rootNodeId: 'page_about_root',
      metadata: {
        title: `من نحن وقصتنا | ${meta.name}`,
        description: `تعرف على مسيرة وقيم وخبرات فريق ${meta.name}`,
        slug: 'about',
        isHomePage: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'page_contact',
      name: 'تواصل معنا والحجز',
      slug: 'contact',
      rootNodeId: 'page_contact_root',
      metadata: {
        title: `تواصل معنا والحجز | ${meta.name}`,
        description: `تواصل مباشرة مع ${meta.name} للحجز والاستفسارات`,
        slug: 'contact',
        isHomePage: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    id: meta.id,
    tenantId: meta.tenantId,
    name: meta.name,
    domain: `${meta.id.replace('site_', '')}.saassite.com`,
    subdomain: meta.id.replace('site_', ''),
    activity: 'general' as any,
    language: 'ar',
    defaultDirection: 'rtl',
    theme: theme as any,
    currentDraftVersion: 1,
    pages,
    components,
  };
};

