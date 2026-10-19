import { Website, ComponentNode } from '../../../types/builder';
import { getMergedThemeTokens } from '../../defaultTheme';

// Helper to create basic common components for any activity site
export const createActivityWebsite = (
  id: string,
  tenantId: string,
  name: string,
  subdomain: string,
  activity: any,
  themeKey: string,
  components: Record<string, ComponentNode>,
  pages: any[]
): Website => {
  const theme = getMergedThemeTokens(themeKey);
  const comps = { ...components };
  const allPages = [...pages];

  const headerId = Object.keys(comps).find((k) => comps[k].type === 'header') || '';
  const footerId = Object.keys(comps).find((k) => comps[k].type === 'footer') || '';
  const itemsSectionId =
    Object.keys(comps).find(
      (k) =>
        comps[k].type === 'products' ||
        comps[k].type === 'grid' ||
        k.includes('menu') ||
        k.includes('item') ||
        k.includes('product') ||
        k.includes('service')
    ) || '';
  const formSectionId =
    Object.keys(comps).find(
      (k) =>
        comps[k].type === 'form' ||
        comps[k].type === 'contact' ||
        k.includes('book') ||
        k.includes('contact') ||
        k.includes('form')
    ) || '';
  const featuresSectionId =
    Object.keys(comps).find(
      (k) =>
        comps[k].type === 'features' ||
        comps[k].type === 'testimonials' ||
        k.includes('feature') ||
        k.includes('review')
    ) || '';

  // Ensure header has full navigation links if missing or empty
  if (headerId && comps[headerId]) {
    const headerNode = comps[headerId];
    const headerInnerId = headerNode.childrenIds?.[0] || '';
    const headerInner = headerInnerId ? comps[headerInnerId] : null;

    if (headerInner) {
      // Find existing nav node or create one
      const existingNavId =
        headerInner.childrenIds?.find(
          (cid) =>
            cid.includes('nav') ||
            comps[cid]?.category === 'navigation' ||
            comps[cid]?.name?.includes('روابط')
        ) || '';

      if (existingNavId && comps[existingNavId]) {
        // If nav node is empty container or flex with no children and no text, give it bullet nav
        if (
          !comps[existingNavId].childrenIds?.length &&
          !comps[existingNavId].props?.text
        ) {
          comps[existingNavId] = {
            ...comps[existingNavId],
            type: 'paragraph',
            category: 'typography',
            props: {
              ...comps[existingNavId].props,
              text: 'الرئيسية • الخدمات والمنيو • من نحن والتقييمات • تواصل معنا والحجز',
            },
            styles: {
              desktop: {
                fontSize: '14px',
                fontWeight: '600',
                textColor: '#475569',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              },
              mobile: { display: 'none' },
            },
          };
        }
      }
    }
  }

  // Ensure full multi-page suite exists if only home is passed
  if (allPages.length === 1 && allPages[0].id === 'page_home') {
    // 1. Services / Menu / Products page
    let effectiveItemsId = itemsSectionId;
    if (!effectiveItemsId) {
      effectiveItemsId = `gen_services_${id}`;
      comps[effectiveItemsId] = {
        id: effectiveItemsId,
        name: `قائمة الخدمات والمنتجات - ${name}`,
        type: 'products',
        category: 'section',
        parentId: 'page_services_root',
        childrenIds: [],
        props: {
          title: `الخدمات والمنتجات المميزة من ${name}`,
          subtitle: `اختر ما يناسبك من قائمتنا وتشكيلتنا المتنوعة ذات الجودة العالية`,
          products: [
            {
              id: 'item_1',
              title: `الباقة الفضية الشاملة`,
              price: '450 ج.م',
              badge: 'الأكثر طلباً',
              specs: ['خدمة متكاملة ومعتمدة', 'تنفيذ فوري وسريع', 'دعم واستشارة مجانية'],
            },
            {
              id: 'item_2',
              title: `الباقة الذهبية VIP`,
              price: '850 ج.م',
              badge: 'توفير 20%',
              specs: ['أولوية حجز فورية', 'ضمان شامل ومتابعة دورية', 'خدمة مخصصة بالكامل'],
            },
            {
              id: 'item_3',
              title: `الباقة البلاتينية الحصرية`,
              price: '1,400 ج.م',
              badge: 'حصري',
              specs: ['تخصيص كامل حسب الطلب', 'استشارات مستمرة على مدار الساعة', 'خصومات حصرية على كافة الخدمات'],
            },
          ],
        },
        styles: {
          desktop: { paddingTop: '70px', paddingBottom: '70px', backgroundColor: '#ffffff' },
        },
      };
    }

    comps['page_services_root'] = {
      id: 'page_services_root',
      name: `صفحة الخدمات والمنتجات - ${name}`,
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: [headerId, effectiveItemsId, formSectionId, footerId].filter(Boolean),
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
    };
    allPages.push({
      id: 'page_services',
      name: 'الخدمات والمنتجات',
      slug: 'services',
      rootNodeId: 'page_services_root',
      metadata: {
        title: `الخدمات والمنتجات | ${name}`,
        description: `تصفح الخدمات والمنتجات من ${name}`,
        slug: 'services',
        isHomePage: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. About us & story page
    let effectiveFeaturesId = featuresSectionId;
    if (!effectiveFeaturesId) {
      effectiveFeaturesId = `gen_about_${id}`;
      comps[effectiveFeaturesId] = {
        id: effectiveFeaturesId,
        name: `عن ${name} ومسيرتنا`,
        type: 'features',
        category: 'section',
        parentId: 'page_about_root',
        childrenIds: [],
        props: {
          title: `من نحن | قصة التميز والريادة في ${name}`,
          subtitle: `نكرس خبراتنا لتقديم تجربة استثنائية ومعايير عالمية تلبي تطلعات عملائنا`,
          features: [
            {
              id: 'f1',
              title: '🛡️ جودة وضمان معتمد',
              description: 'نلتزم بأعلى معايير الإتقان والدقة في كافة مراحل عملنا لضمان رضاكم التام.',
              icon: 'ShieldCheck',
            },
            {
              id: 'f2',
              title: '⭐ فريق متخصص وخبير',
              description: 'نخبة من الكفاءات المهنية المؤهلة ذات الخبرات الطويلة في المجال.',
              icon: 'Sparkles',
            },
            {
              id: 'f3',
              title: '🤝 دعم متواصل وخدمة VIP',
              description: 'فريق خدمة عملاء مخصص للإجابة على استفساراتكم ومتابعة طلباتكم أولاً بأول.',
              icon: 'Phone',
            },
          ],
        },
        styles: {
          desktop: { paddingTop: '70px', paddingBottom: '70px', backgroundColor: '#f8fafc' },
        },
      };
    }

    comps['page_about_root'] = {
      id: 'page_about_root',
      name: `صفحة من نحن - ${name}`,
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: [headerId, effectiveFeaturesId, formSectionId, footerId].filter(Boolean),
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
    };
    allPages.push({
      id: 'page_about',
      name: 'من نحن وقصتنا',
      slug: 'about',
      rootNodeId: 'page_about_root',
      metadata: {
        title: `من نحن وقصتنا | ${name}`,
        description: `تعرف على قصة وخبرات ${name}`,
        slug: 'about',
        isHomePage: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Contact & booking page
    let effectiveFormId = formSectionId;
    if (!effectiveFormId) {
      effectiveFormId = `gen_contact_${id}`;
      comps[effectiveFormId] = {
        id: effectiveFormId,
        name: `تواصل مع ${name}`,
        type: 'contact',
        category: 'section',
        parentId: 'page_contact_root',
        childrenIds: [],
        props: {
          title: `تواصل معنا واحجز موعدك مع ${name}`,
          subtitle: `يسعدنا استقبال طلباتكم والرد على كافة استفساراتكم على مدار الأسبوع`,
          fields: [
            { name: 'name', label: 'الاسم الكامل', type: 'text', placeholder: 'اسمك الكريم' },
            { name: 'phone', label: 'رقم الجوال / واتساب', type: 'tel', placeholder: '01xxxxxxxxx' },
            { name: 'service', label: 'الخدمة أو الحجز', type: 'text', placeholder: 'حدد نوع الحجز أو الخدمة' },
            { name: 'notes', label: 'ملاحظات وتفاصيل', type: 'text', placeholder: 'أخبرنا بملاحظاتك أو موعدك المفضل...' },
          ],
          buttonText: 'ارسال الطلب وتأكيد الحجز الآن',
        },
        styles: {
          desktop: { paddingTop: '70px', paddingBottom: '70px', backgroundColor: '#ffffff' },
        },
      };
    }

    comps['page_contact_root'] = {
      id: 'page_contact_root',
      name: `صفحة التواصل والحجز - ${name}`,
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: [headerId, effectiveFormId, footerId].filter(Boolean),
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
    };
    allPages.push({
      id: 'page_contact',
      name: 'تواصل معنا والحجز',
      slug: 'contact',
      rootNodeId: 'page_contact_root',
      metadata: {
        title: `تواصل معنا والحجز | ${name}`,
        description: `تواصل مباشرة مع ${name}`,
        slug: 'contact',
        isHomePage: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    id,
    tenantId,
    name,
    domain: `${subdomain}.saassite.com`,
    subdomain,
    activity,
    language: 'ar',
    defaultDirection: 'rtl',
    theme: theme as any,
    currentDraftVersion: 1,
    pages: allPages,
    components: comps,
  };
};
