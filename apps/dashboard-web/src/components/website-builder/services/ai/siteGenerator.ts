import { Website, ComponentNode, Page, DesignTokens, BusinessActivity } from '../../types/builder';

/**
 * Full Website AI Generator from Prompt
 */
export function generateCompleteAiWebsite(
  prompt: string,
  animationStyle: string = 'modern_glass',
  activityCategory?: string
): Website {
  const timestamp = Date.now();
  const websiteId = `ai_site_${timestamp}`;

  // Analyze prompt keywords for styling and archetype
  const lower = prompt.toLowerCase();
  
  let primaryColor = '#2563eb';
  let secondaryColor = '#0f172a';
  let accentColor = '#38bdf8';
  let bgColor = '#ffffff';
  let surfaceColor = '#f8fafc';
  let fontHeading = 'Cairo, sans-serif';
  let brandName = 'المشروع الذكي المبتكر';
  let activity: BusinessActivity = 'general';

  if (lower.includes('عقار') || lower.includes('مقاول') || lower.includes('بناء') || lower.includes('أثاث')) {
    activity = 'real_estate';
    brandName = 'مجموعة التطوير العقاري والمقاولات';
    primaryColor = '#b45309'; // Gold amber
    secondaryColor = '#18181b';
  } else if (lower.includes('سيار') || lower.includes('مركبات') || lower.includes('معرض') || lower.includes('موتورز')) {
    activity = 'automotive';
    brandName = 'المجد موتورز للسيارات الفاخرة';
    primaryColor = '#2563eb';
    secondaryColor = '#090d16';
  } else if (lower.includes('متجر') || lower.includes('عطور') || lower.includes('ملابس') || lower.includes('تسوق')) {
    activity = 'ecommerce';
    brandName = 'متجر الأناقة والفخامة الحصري';
    primaryColor = '#4f46e5';
    secondaryColor = '#111827';
  } else if (lower.includes('مطعم') || lower.includes('كافيه') || lower.includes('قهوة') || lower.includes('أغذية')) {
    activity = 'restaurant';
    brandName = 'مطبخ الذواقة والكافيه الفاخر';
    primaryColor = '#ea580c';
    secondaryColor = '#1c1917';
  } else if (lower.includes('طبي') || lower.includes('عياد') || lower.includes('صحة') || lower.includes('أسنان')) {
    activity = 'clinic_health';
    brandName = 'المركز الطبي الاستشاري التخصصي';
    primaryColor = '#059669';
    secondaryColor = '#0f172a';
  } else if (lower.includes('تقني') || lower.includes('برمج') || lower.includes('ذكاء') || lower.includes('ألعاب') || lower.includes('saas')) {
    activity = 'tech_saas';
    brandName = 'منصة التقنيات والحلول الذكية';
    primaryColor = '#7c3aed';
    secondaryColor = '#030712';
  }

  // Animation style adaptations
  if (animationStyle === 'cyberpunk_neon') {
    bgColor = '#080811';
    surfaceColor = '#111122';
    primaryColor = '#ec4899';
    secondaryColor = '#8b5cf6';
  } else if (animationStyle === 'luxury_gold') {
    bgColor = '#0a0a0c';
    surfaceColor = '#141418';
    primaryColor = '#d97706';
    secondaryColor = '#78350f';
  } else if (animationStyle === 'minimal_clean') {
    bgColor = '#ffffff';
    surfaceColor = '#f8fafc';
  }

  // Construct components tree
  const components: Record<string, ComponentNode> = {
    // 1. Header
    [`${websiteId}_header`]: {
      id: `${websiteId}_header`,
      name: 'شريط التنقل العلوي الذكي',
      type: 'header',
      category: 'navigation',
      parentId: null,
      childrenIds: [],
      props: {
        logoText: brandName,
        logoSubtitle: 'الريادة والابتكار 2026',
        navLinks: ['الرئيسية', 'الخدمات والمنتجات', 'عن المؤسسة', 'التقييمات', 'تواصل معنا'],
        ctaText: 'احجز استشارتك الآن ⚡',
        ctaUrl: '#contact',
        sticky: true,
      },
      styles: {
        desktop: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '1rem',
          paddingBottom: '1rem',
          paddingLeft: '2rem',
          paddingRight: '2rem',
          backgroundColor: animationStyle.includes('neon') || animationStyle.includes('gold') ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
          borderWidth: '1px',
          borderColor: 'rgba(226, 232, 240, 0.8)',
        },
      },
    },

    // 2. Hero Section
    [`${websiteId}_hero`]: {
      id: `${websiteId}_hero`,
      name: 'القسم الترحيبي الرئيسي (Hero)',
      type: 'hero',
      category: 'section',
      parentId: null,
      childrenIds: [],
      props: {
        badge: '✨ منصة مبتكرة معتمدة 2026',
        title: `نصنع مستقبلك مع ${brandName}`,
        subtitle: prompt || 'حلول متكاملة مصممة بأعلى معايير الجودة والاحترافية لتلبية طموحاتك وتحقيق أعلى عوائد ممكنة.',
        ctaPrimaryText: 'استكشف الخدمات والأسطول &larr;',
        ctaPrimaryUrl: '#catalog',
        ctaSecondaryText: 'تحدث مع مستشار VIP 💬',
        ctaSecondaryUrl: '#contact',
        stats: [
          { value: '+99.8%', label: 'نسبة رضا العملاء' },
          { value: '15 دقيقة', label: 'متوسط سرعة الاستجابة' },
          { value: '+5,000', label: 'مشروع منجز بنجاح' },
          { value: 'ضمان 5 سنين', label: 'شامل لكافة الخدمات' },
        ],
        heroImage: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1200&auto=format&fit=crop&q=80',
      },
      styles: {
        desktop: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingTop: '4.5rem',
          paddingBottom: '4.5rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          backgroundColor: bgColor,
          textColor: bgColor === '#ffffff' ? '#0f172a' : '#f8fafc',
          borderWidth: '1px',
          borderColor: 'rgba(226, 232, 240, 0.4)',
        },
      },
    },

    // 3. Bento Features / Highlights
    [`${websiteId}_features`]: {
      id: `${websiteId}_features`,
      name: 'شبكة الميزات والخدمات الذكية (Bento Grid)',
      type: 'bento-grid',
      category: 'section',
      parentId: null,
      childrenIds: [],
      props: {
        badge: 'لماذا نحن خيارك الأول؟',
        title: 'معايير فائقة تصنع الفارق الحقيقي',
        subtitle: 'نجمع بين أحدث التقنيات الرقمية والخبرات الاستشارية المتخصصة لتوفير تجربة استثنائية.',
        cards: [
          {
            title: 'سرعة ودقة فائقة في الإنجاز',
            description: 'فريق عمل متكامل يعمل على مدار الساعة لضمان تسليم أعمالك بأعلى كفاءة وأسرع وقت.',
            icon: 'ShieldCheck',
            tag: 'دقة متناهية',
          },
          {
            title: 'حلول تمويل وسداد مرنة',
            description: 'برامج تقسيط ودفع ميسرة بدون فوائد مع خيارات بنكية فورية متوافقة.',
            icon: 'CreditCard',
            tag: 'تمويل فوري',
          },
          {
            title: 'ضمان ذهبي شامل 100%',
            description: 'تغطية شاملة تضمن لك راحة البال التامة مع صيانة واستبدال فوري عند الحاجة.',
            icon: 'Truck',
            tag: 'ضمان معتمد',
          },
        ],
      },
      styles: {
        desktop: {
          paddingTop: '4rem',
          paddingBottom: '4rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          backgroundColor: surfaceColor,
        },
      },
    },

    // 4. Products / Showcase
    [`${websiteId}_catalog`]: {
      id: `${websiteId}_catalog`,
      name: 'معرض المنتجات والخدمات الرئيسية',
      type: 'products',
      category: 'commerce',
      parentId: null,
      childrenIds: [],
      props: {
        badge: 'أحدث العروض الحصرية',
        title: 'اختر باقتك أو منتجك المفضل',
        subtitle: 'مجموعة مختارة بعناية تلبي أعلى متطلبات الفخامة والأداء العالي.',
        products: [
          {
            id: 'prod_1',
            title: 'الباقة الماسية الحصرية VIP',
            price: '850,000 ج.م',
            image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80',
            badge: 'الأكثر طلباً ⭐',
            specs: ['تسليم فوري خلال 24 ساعة', 'ضمان ممتد 5 سنوات مجاناً', 'خدمة مساعدة ومستشار شخصي'],
          },
          {
            id: 'prod_2',
            title: 'الباقة البلاتينية المتقدمة',
            price: '520,000 ج.م',
            image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
            badge: 'إصدار خاص',
            specs: ['فحص وتأمين شامل', 'صيانة دورية معتمدة', 'تسهيلات تمويل فورية'],
          },
          {
            id: 'prod_3',
            title: 'الباقة الذهبية الذكية',
            price: '340,000 ج.م',
            image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80',
            badge: 'قيمة استثنائية',
            specs: ['أداء عالي واستهلاك اقتصادي', 'ضمان سنتين', 'دعم فني 24/7'],
          },
        ],
      },
      styles: {
        desktop: {
          paddingTop: '4rem',
          paddingBottom: '4rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          backgroundColor: bgColor,
        },
      },
    },

    // 5. Testimonials
    [`${websiteId}_testimonials`]: {
      id: `${websiteId}_testimonials`,
      name: 'آراء وتقييمات العملاء (Testimonials)',
      type: 'testimonials',
      category: 'section',
      parentId: null,
      childrenIds: [],
      props: {
        badge: 'شهادات نعتز بها',
        title: 'ماذا يقول عملاؤنا عنا؟',
        subtitle: 'أكثر من 5,000 عميل يثقون في خدماتنا المتميزة في كافة أنحاء المملكة.',
        testimonials: [
          {
            id: 'test_1',
            quote: 'تجربة لا مثيل لها! الاحترافية في التعامل وسرعة الإنجاز والشفافية فاقت كل التوقعات.',
            author: 'م. خالد بن سلطان',
            role: 'رئيس تنفيذي - الرياض',
            rating: 5,
          },
          {
            id: 'test_2',
            quote: 'أفضل خدمة عملاء تعاملت معها على الإطلاق. المستشار كان متابعاً لكل خطوة بأدق التفاصيل.',
            author: 'د. سارة المنصور',
            role: 'استشارية طبية - جدة',
            rating: 5,
          },
          {
            id: 'test_3',
            quote: 'الجودة والضمان والاهتمام بأدق التفاصيل جعلتني أكرر التعامل وأوصي بهم لجميع زملائي.',
            author: 'أ. فهد الهاشمي',
            role: 'مستثمر ورائد أعمال - الخبر',
            rating: 5,
          },
        ],
      },
      styles: {
        desktop: {
          paddingTop: '4rem',
          paddingBottom: '4rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          backgroundColor: surfaceColor,
        },
      },
    },

    // 6. Interactive FAQ
    [`${websiteId}_faq`]: {
      id: `${websiteId}_faq`,
      name: 'الأسئلة الشائعة (Interactive FAQ)',
      type: 'faq',
      category: 'section',
      parentId: null,
      childrenIds: [],
      props: {
        badge: 'كل ما تحتاج لمعرفته',
        title: 'الأسئلة الأكثر تكراراً',
        subtitle: 'إجابات مباشرة على كافة استفسارات الشراء، الضمان، والحجز.',
        faqs: [
          {
            question: 'كيف يمكنني حجز موعد تجربة أو معاينة فورية؟',
            answer: 'يمكنك ملء استمارة التواصل بالأسفل أو التواصل مباشرة عبر الواتساب وسيتواصل معك مستشار المبيعات خلال 15 دقيقة.',
          },
          {
            question: 'ما هي خيارات التمويل المتاحة للشركات والأفراد؟',
            answer: 'نوفر حلول تمويلية معتمدة من كبرى البنوك وشركات التمويل بنسب ربح تنافسية وبدون دفعة أولى.',
          },
          {
            question: 'هل جميع المنتجات والخدمات مشمولة بضمان رسمي؟',
            answer: 'نعم، نوفر ضماناً معتمداً يصل إلى 5 سنوات مع تغطية شاملة لقطع الغيار والصيانة الدورية.',
          },
        ],
      },
      styles: {
        desktop: {
          paddingTop: '4rem',
          paddingBottom: '4rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          backgroundColor: bgColor,
        },
      },
    },

    // 7. Contact / Booking Form
    [`${websiteId}_contact`]: {
      id: `${websiteId}_contact`,
      name: 'نموذج التواصل والحجز السريع (Contact & Booking)',
      type: 'contact',
      category: 'forms',
      parentId: null,
      childrenIds: [],
      props: {
        badge: 'تواصل فوري',
        title: 'احجز استشارتك أو موعدك الآن',
        subtitle: 'املأ بياناتك وسيقوم فريقنا بالتواصل معك لتزويدك بكافة التفاصيل وعروض الأسعار.',
        submitText: 'إرسال طلب الحجز فوراً 🚀',
        phone: '+20 100 123 4567',
        whatsapp: '+20 100 000 0000',
        email: 'info@almajd-group.eg',
        address: 'شارع التسعين، التجمع الخامس، القاهرة، جمهورية مصر العربية',
      },
      styles: {
        desktop: {
          paddingTop: '4rem',
          paddingBottom: '4rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          backgroundColor: surfaceColor,
        },
      },
    },

    // 8. Footer
    [`${websiteId}_footer`]: {
      id: `${websiteId}_footer`,
      name: 'الفوتر الذكي متعدد الروابط',
      type: 'footer',
      category: 'navigation',
      parentId: null,
      childrenIds: [],
      props: {
        brandName: brandName,
        tagline: 'الريادة والتميز في تقديم أرقى الحلول والمنتجات بأعلى المعايير العالمية.',
        columns: [
          {
            title: 'أقسام الموقع',
            links: ['الرئيسية', 'العروض والأسطول', 'المميزات والضمان', 'الأسئلة الشائعة'],
          },
          {
            title: 'خدماتنا',
            links: ['خدمة كبار الشخصيات VIP', 'التمويل والسداد المرن', 'الصيانة والفحص', 'الاستشارات'],
          },
          {
            title: 'معلومات التواصل',
            links: ['الرياض: طريق الملك فهد', 'جدة: طريق الملك عبدالعزيز', 'الخبر: الكورنيش', 'الرقم الموحد: 8001234567'],
          },
        ],
        copyright: `جميع الحقوق محفوظة © ${new Date().getFullYear()} ${brandName}. تم التطوير بأحدث تقنيات الويب.`,
      },
      styles: {
        desktop: {
          paddingTop: '3.5rem',
          paddingBottom: '2.5rem',
          paddingLeft: '2rem',
          paddingRight: '2rem',
          backgroundColor: '#090d16',
          textColor: '#f8fafc',
        },
      },
    },
  };

  const homePage: Page = {
    id: `${websiteId}_page_home`,
    name: 'الصفحة الرئيسية',
    slug: 'home',
    rootNodeId: `${websiteId}_hero`,
    metadata: {
      title: `${brandName} - الموقع الرسمي 2026`,
      description: prompt || 'الموقع الرسمي للخدمات والمنتجات الحصرية مع أعلى معايير الجودة والضمان.',
      slug: 'home',
      isHomePage: true,
      placement: 'header_direct',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const servicesPage: Page = {
    id: `${websiteId}_page_catalog`,
    name: 'الخدمات والأسطول',
    slug: 'catalog',
    rootNodeId: `${websiteId}_catalog`,
    metadata: {
      title: `العروض والأسطول - ${brandName}`,
      description: 'تصفح كافة الباقات والمنتجات المتاحة للتسليم الفوري.',
      slug: 'catalog',
      placement: 'header_direct',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const contactPage: Page = {
    id: `${websiteId}_page_contact`,
    name: 'تواصل معنا',
    slug: 'contact',
    rootNodeId: `${websiteId}_contact`,
    metadata: {
      title: `تواصل معنا - ${brandName}`,
      description: 'احجز موعدك وتحدث مع مستشار VIP على مدار الساعة.',
      slug: 'contact',
      placement: 'header_direct',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const designTokens: DesignTokens = {
    colors: {
      primary: primaryColor,
      primaryHover: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      background: bgColor,
      surface: surfaceColor,
      textPrimary: bgColor === '#ffffff' ? '#0f172a' : '#f8fafc',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      border: 'rgba(226, 232, 240, 0.8)',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
    },
    typography: {
      fontHeading: fontHeading,
      fontBody: 'Cairo, Tajawal, sans-serif',
      scaleRatio: 1.25,
      baseFontSize: '16px',
    },
    radius: {
      sm: '6px',
      md: '10px',
      lg: '16px',
      xl: '24px',
      full: '9999px',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      glow: '0 0 25px rgba(37, 99, 235, 0.4)',
    },
    spacingUnit: 4,
  };

  return {
    id: websiteId,
    tenantId: 'tenant_ai_custom',
    name: brandName,
    domain: 'almajd-motors.com',
    subdomain: 'ai-site',
    activity: activity,
    language: 'ar',
    defaultDirection: 'rtl',
    pages: [homePage, servicesPage, contactPage],
    components: components,
    theme: designTokens,
    currentDraftVersion: 1,
  };
}

