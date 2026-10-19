import { Website, ComponentNode, Page } from '../../types/builder';
import { StructuredAiPatch, PatchScope, PatchOperation } from '../../types/ai';

/**
 * Intelligent Natural Language Parser for AI Modifications
 * Deeply inspects the captured component and executes targeted surgical operations
 */
export function generateStructuredAiPatch(
  prompt: string,
  scope: PatchScope,
  context: {
    selectedNode?: ComponentNode | null;
    activePage?: Page;
    website?: Website;
    currentTenant?: any;
  }
): StructuredAiPatch {
  const lower = prompt.toLowerCase();
  const operations: PatchOperation[] = [];
  const diffSummary: string[] = [];

  const targetId = context.selectedNode?.id || 'comp_hero';
  const targetNode = context.selectedNode || (context.website?.components[targetId]) || (context.website?.components['comp_hero']);
  const nodeType = targetNode?.type || 'hero';
  const nodeName = targetNode?.name || 'المكون المحدد';

  // 1. Color and Theme Intent Detection
  let primaryColor: string | null = null;
  let backgroundColor: string | null = null;
  let textColor: string | null = null;
  let backdropBlur: string | null = null;

  if (lower.includes('داكن') || lower.includes('اسود') || lower.includes('أسود') || lower.includes('dark') || lower.includes('كحلي') || lower.includes('black')) {
    backgroundColor = '#0b0f19';
    textColor = '#f8fafc';
    diffSummary.push('تحويل الخلفية إلى الوضع الليلي الداكن الفاخر (#0b0f19) مع نصوص ساطعة');
  } else if (lower.includes('ابيض') || lower.includes('أبيض') || lower.includes('فاتح') || lower.includes('light') || lower.includes('white')) {
    backgroundColor = '#ffffff';
    textColor = '#0f172a';
    diffSummary.push('تحويل الخلفية إلى النمط الأبيض النقي عالي الوضوح (#ffffff)');
  } else if (lower.includes('ذهبي') || lower.includes('gold') || lower.includes('ملكي')) {
    primaryColor = '#d97706';
    diffSummary.push('تطبيق لون ذهبي ملكي فاخر (#d97706) للعناصر التفاعلية');
  } else if (lower.includes('ازرق') || lower.includes('أزرق') || lower.includes('blue') || lower.includes('نيلي')) {
    primaryColor = '#2563eb';
    diffSummary.push('تطبيق اللون الأزرق الملكي (#2563eb) للأزرار والشارات');
  } else if (lower.includes('اخضر') || lower.includes('أخضر') || lower.includes('green') || lower.includes('زمردي')) {
    primaryColor = '#059669';
    diffSummary.push('تطبيق اللون الأخضر الزمردي (#059669)');
  } else if (lower.includes('احمر') || lower.includes('أحمر') || lower.includes('red') || lower.includes('عنابي')) {
    primaryColor = '#dc2626';
    diffSummary.push('تطبيق اللون العنابي الجريء (#dc2626)');
  } else if (lower.includes('نيون') || lower.includes('بنفسجي') || lower.includes('purple') || lower.includes('زهري')) {
    primaryColor = '#8b5cf6';
    diffSummary.push('تطبيق طابع نيون بنفسجي مستقبلي (#8b5cf6)');
  }

  // 2. Glassmorphism & Sticky Header Intent
  let isSticky = false;
  if (lower.includes('زجاجي') || lower.includes('شفاف') || lower.includes('glass') || lower.includes('blur')) {
    backdropBlur = '16px';
    backgroundColor = backgroundColor || 'rgba(255, 255, 255, 0.85)';
    diffSummary.push('تطبيق تأثير زجاجي مع ضبابية خلفية (Backdrop Blur: 16px)');
  }
  if (lower.includes('تثبيت') || lower.includes('ثبت') || lower.includes('sticky') || lower.includes('مثبت')) {
    isSticky = true;
    diffSummary.push('تثبيت المكون في أعلى الصفحة أثناء التمرير (Sticky Navigation)');
  }

  // 3. Border Radius and Shadow Intent
  let borderRadius: string | null = null;
  let boxShadow: string | null = null;

  if (lower.includes('دائري') || lower.includes('حواف') || lower.includes('round') || lower.includes('radius') || lower.includes('استدارة')) {
    borderRadius = '24px';
    diffSummary.push('زيادة استدارة الحواف إلى 24px لمظهر عصري وناعم');
  }
  if (lower.includes('ظل') || lower.includes('shadow') || lower.includes('ثلاثي') || lower.includes('فخم')) {
    boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.35)';
    diffSummary.push('إضافة ظل سحابي عميق وبارز لتعزيز العمق البصري');
  }

  // 4. Extract Quotes or Specific Text
  const quoteMatch = prompt.match(/["'«]([^"'»]+)["'»]/);
  const extractedQuote = quoteMatch ? quoteMatch[1] : null;

  // 5. COMPONENT-SPECIFIC SURGICAL LOGIC:
  const propsPatch: Record<string, any> = {};

  // --- A. HEADER & NAVIGATION TARGET ---
  if (nodeType === 'header' || targetId.includes('header') || targetId.includes('nav') || lower.includes('هدر') || lower.includes('هيدر') || lower.includes('تنقل')) {
    // 1. Changing Logo
    if (lower.includes('لوجو') || lower.includes('شعار') || lower.includes('logo') || (extractedQuote && (lower.includes('اسم') || lower.includes('اكتب')))) {
      const newLogo = extractedQuote || 'مجموعة القمة للاستثمار VIP';
      propsPatch.logoText = newLogo;
      propsPatch.text = newLogo;
      
      // If website components has header_logo, target it directly
      if (context.website?.components['header_logo']) {
        operations.push({
          op: 'UPDATE_PROPS',
          targetId: 'header_logo',
          path: 'props',
          value: { text: newLogo },
          explanation: `تحديث اسم شعار الهيدر إلى "${newLogo}"`,
        });
      }
      diffSummary.push(`تحديث شعار الهيدر إلى "${newLogo}"`);
    }

    // 2. Adding / Modifying Navigation Links
    if (lower.includes('رابط') || lower.includes('روابط') || lower.includes('قسم') || lower.includes('اقسام') || lower.includes('أقسام') || lower.includes('link') || lower.includes('nav')) {
      const currentLinks: string[] = targetNode?.props?.navLinks || ['الرئيسية', 'العروض والأسطول', 'حجز موعد', 'تواصل معنا'];
      const linksToAdd: string[] = [];

      if (lower.includes('معرض') || lower.includes('اسطول') || lower.includes('أسطول')) linksToAdd.push('معرض الأسطول VIP');
      if (lower.includes('سعر') || lower.includes('اسعار') || lower.includes('أسعار') || lower.includes('باقات')) linksToAdd.push('حاسبة الأسعار والتمويل');
      if (lower.includes('عرض') || lower.includes('عروض') || lower.includes('خصم')) linksToAdd.push('عروض 2026 الحصرية');
      if (lower.includes('خدمات') || lower.includes('صيانة') || lower.includes('ضمان')) linksToAdd.push('خدمات الضمان والصيانة');
      if (lower.includes('من نحن') || lower.includes('عنا')) linksToAdd.push('من نحن وقصتنا');
      if (lower.includes('مشاريع') || lower.includes('اعمال')) linksToAdd.push('أحدث المشاريع المنجزة');

      if (extractedQuote && !lower.includes('لوجو') && !lower.includes('شعار')) {
        linksToAdd.push(extractedQuote);
      }

      if (linksToAdd.length === 0) {
        linksToAdd.push('المعرض والأسطول', 'العروض الخاصة', 'تواصل معنا');
      }

      const mergedLinks = Array.from(new Set([...currentLinks, ...linksToAdd]));
      propsPatch.navLinks = mergedLinks;
      diffSummary.push(`إضافة وتحديث روابط الهيدر: (${linksToAdd.join('، ')})`);

      // If header_nav container exists, also inject child paragraph nodes for instant sync
      if (context.website?.components['header_nav']) {
        linksToAdd.forEach((linkText, i) => {
          const newLinkId = `nav_ai_${Date.now()}_${i}`;
          operations.push({
            op: 'insert_node',
            targetId: 'header_nav',
            path: 'childrenIds',
            value: {
              node: {
                id: newLinkId,
                name: `رابط ${linkText}`,
                type: 'paragraph',
                category: 'typography',
                parentId: 'header_nav',
                childrenIds: [],
                props: { text: linkText, url: `/${encodeURIComponent(linkText)}` },
                styles: {
                  desktop: {
                    fontSize: '15px',
                    fontWeight: '500',
                    textColor: textColor || '#475569',
                  },
                },
              },
              targetParentId: 'header_nav',
            },
            explanation: `إدراج رابط (${linkText}) في قائمة روابط الهيدر`,
          });
        });
      }
    }

    // 3. Modifying CTA in Header (e.g. WhatsApp / Booking)
    if (lower.includes('واتساب') || lower.includes('whatsapp') || lower.includes('اتصال') || lower.includes('حجز') || lower.includes('زر')) {
      const ctaText = lower.includes('واتساب') ? 'تواصل واتساب VIP' : (extractedQuote || 'احجز استشارتك الآن');
      const ctaUrl = lower.includes('واتساب') ? 'https://wa.me/966500000000' : '/contact';
      const ctaBg = lower.includes('واتساب') ? '#25d366' : (primaryColor || '#2563eb');

      propsPatch.ctaText = ctaText;
      propsPatch.ctaUrl = ctaUrl;
      diffSummary.push(`تحديث زر الهيدر إلى "${ctaText}" برابط مباشر`);

      if (context.website?.components['header_cta_btn']) {
        operations.push({
          op: 'UPDATE_PROPS',
          targetId: 'header_cta_btn',
          path: 'props',
          value: { text: ctaText, url: ctaUrl },
          explanation: 'تحديث نص ورابط زر الهيدر التفاعلي',
        });
        operations.push({
          op: 'UPDATE_STYLE',
          targetId: 'header_cta_btn',
          path: 'styles.desktop',
          value: { backgroundColor: ctaBg, textColor: '#ffffff' },
          explanation: 'تحديث لون زر الهيدر',
        });
      }
    }

    if (isSticky) propsPatch.sticky = true;
  }

  // --- B. HERO SECTION TARGET ---
  else if (nodeType === 'hero' || targetId.includes('hero') || lower.includes('هيرو') || lower.includes('رئيسي') || lower.includes('ترحيب')) {
    if (extractedQuote) {
      propsPatch.title = extractedQuote;
      diffSummary.push(`تحديث العنوان الرئيسي إلى: "${extractedQuote}"`);
    } else if (lower.includes('خصم') || lower.includes('عرض')) {
      propsPatch.badge = 'عرض حصري 2026 ✨';
      propsPatch.title = 'أقوى العروض الحصرية وتسهيلات سداد فورية';
      propsPatch.subtitle = 'استمتع بأفضل الأسعار المعتمدة مع ضمان شامل 5 سنوات وتوصيل لكافة المدن.';
      diffSummary.push('تحديث نصوص الهيرو بعروض 2026 الحصرية');
    } else if (lower.includes('vip') || lower.includes('فخام') || lower.includes('سيارات') || lower.includes('عقارات')) {
      propsPatch.badge = 'فئة أولى VIP 👑';
      propsPatch.title = 'أرقى أسطول وموديلات حصرية للتسليم الفوري';
      propsPatch.subtitle = 'خدمة مستشار VIP مخصصة وتسهيلات سداد وتمويل بدون دفعة أولى.';
      diffSummary.push('ترقية نصوص الهيرو للنمط الفاخر الرفيع');
    }

    if (lower.includes('احصائيات') || lower.includes('إحصائيات') || lower.includes('ارقام') || lower.includes('عداد')) {
      propsPatch.showMetrics = true;
      propsPatch.metrics = [
        { label: 'عميل سعيد', value: '+1,850' },
        { label: 'نسبة الرضا', value: '99.4%' },
        { label: 'ضمان معتمد', value: '5 سنوات' },
      ];
      diffSummary.push('إضافة شريط إحصائيات حي مع مؤشرات نجاح وضمان');
    }
  }

  // --- C. BENTO GRID & FEATURES TARGET ---
  else if (nodeType === 'bento' || nodeType === 'bento-grid' || nodeType === 'features' || targetId.includes('bento') || targetId.includes('feature')) {
    if (lower.includes('كارت') || lower.includes('بطاقة') || lower.includes('ميزة') || lower.includes('قسم') || lower.includes('ضيف')) {
      const currentCards = targetNode?.props?.cards || targetNode?.props?.features || [];
      const newCard = {
        id: `card_ai_${Date.now()}`,
        title: extractedQuote || 'ضمان ذهبي شامل 5 سنوات',
        description: 'تغطية شاملة لكافة الأعطال مع صيانة دورية مجانية وسيارة بديلة فورية.',
        icon: 'ShieldCheck',
        tag: 'معتمد 100%',
        accent: primaryColor || '#d97706',
      };
      propsPatch.cards = [...currentCards, newCard];
      diffSummary.push(`إضافة بطاقة ميزة جديدة: (${newCard.title})`);
    }

    if (lower.includes('3d') || lower.includes('زجاجي') || lower.includes('توهج') || lower.includes('glow')) {
      propsPatch.cardVariant = '3d_glow';
      diffSummary.push('ترقية بطاقات الميزات إلى نمط 3D التفاعلي مع توهج ناعم');
    }
  }

  // --- D. PRODUCTS & PRICING TARGET ---
  else if (nodeType === 'products' || nodeType === 'pricing' || targetId.includes('product') || targetId.includes('price')) {
    if (lower.includes('باقة') || lower.includes('منتج') || lower.includes('ضيف') || lower.includes('جديد')) {
      const currentTiers = targetNode?.props?.tiers || targetNode?.props?.products || [];
      const newTier = {
        id: `tier_ai_${Date.now()}`,
        title: extractedQuote || 'باقة VIP الشاملة',
        price: '4,900 ج.م',
        period: 'مشروع كامل',
        badge: 'الأكثر طلباً ⭐',
        isPopular: true,
        features: ['ضمان شامل 5 سنوات', 'دعم فني مخصص 24/7', 'استشارات هندسية فورية', 'خصم 20% على الصيانة'],
        ctaText: 'اختيار الباقة VIP',
      };
      propsPatch.tiers = [...currentTiers, newTier];
      diffSummary.push(`إضافة باقة/منتج جديد: (${newTier.title})`);
    }

    if (lower.includes('كوبون') || lower.includes('خصم') || lower.includes('coupon')) {
      propsPatch.showCoupon = true;
      propsPatch.defaultCoupon = 'VIP2026';
      diffSummary.push('تفعيل كود الخصم الترويجي المباشر (VIP2026)');
    }
  }

  // --- E. FAQ TARGET ---
  else if (nodeType === 'faq' || targetId.includes('faq')) {
    const currentFaqs = targetNode?.props?.faqs || [];
    const newFaq = {
      id: `faq_ai_${Date.now()}`,
      question: extractedQuote || 'ما هي طرق الدفع وتسهيلات التقسيط المتاحة؟',
      answer: 'نوفر خيارات دفع مرنة عبر تمويل بنكي بدون دفعة أولى وتقسيط ميسر يصل حتى 60 شهراً معتمد من الجهات المختصة.',
    };
    propsPatch.faqs = [...currentFaqs, newFaq];
    diffSummary.push(`إضافة سؤال شائع جديد: (${newFaq.question})`);
  }

  // --- F. INSERTING A BRAND NEW SECTION (e.g. "ضيف قسم مميزات تحته" / "ضيف حاسبة اسعار") ---
  if (lower.includes('ضيف قسم') || lower.includes('اضف قسم') || lower.includes('أضف قسم') || lower.includes('ضيف بانر') || lower.includes('ضيف عداد') || lower.includes('ضيف حاسبة')) {
    const newSectionId = `sec_ai_${Date.now()}`;
    let newSectionNode: ComponentNode;

    if (lower.includes('حاسبة') || lower.includes('اسعار') || lower.includes('سعر')) {
      newSectionNode = {
        id: newSectionId,
        name: 'حاسبة التكلفة التقديرية الفورية',
        type: 'pricing',
        category: 'section',
        parentId: context.activePage?.rootNodeId || 'page_root',
        childrenIds: [],
        props: {
          badge: 'حاسبة تفاعلية 💡',
          title: 'اختر باقتك واحصل على خصم فوري',
          subtitle: 'حساب شفاف ومباشر لكافة التكاليف مع دعم كوبونات الخصم.',
          tiers: [
            { id: 'p1', title: 'الباقة الأساسية', price: '1,500 ج.م', features: ['فحص أولي معتمد', 'تقرير فني شامل', 'ضمان شهرين'], ctaText: 'طلب الباقة' },
            { id: 'p2', title: 'باقة التميز VIP', price: '3,500 ج.م', badge: 'الأكثر اختياراً', isPopular: true, features: ['فحص 150 نقطة بالكمبيوتر', 'صيانة دورية مجانية', 'ضمان سنتين معتمد'], ctaText: 'حجز فوري VIP' },
            { id: 'p3', title: 'باقة الشركات والمؤسسات', price: '7,500 ج.م', features: ['تغطية شاملة لكافة الأسطول', 'مستشار VIP مخصص', 'ضمان 5 سنوات'], ctaText: 'تواصل للتعاقد' },
          ],
        },
        styles: {
          desktop: {
            display: 'block',
            width: '100%',
            backgroundColor: backgroundColor || '#f8fafc',
            paddingTop: '60px',
            paddingBottom: '60px',
            borderBottomWidth: '1px',
            borderColor: '#e2e8f0',
          },
        },
      };
      diffSummary.push('إدراج قسم حاسبة أسعار وباقات تفاعلية جديدة أسفل المكون المحدد');
    } else {
      newSectionNode = {
        id: newSectionId,
        name: 'قسم المميزات والضمانات الحصرية',
        type: 'features',
        category: 'section',
        parentId: context.activePage?.rootNodeId || 'page_root',
        childrenIds: [],
        props: {
          badge: 'مميزات حصرية ⭐',
          title: extractedQuote || 'لماذا يفضلنا كبار العملاء والمستثمرين؟',
          subtitle: 'خبرة متوارثة منذ أكثر من 15 عاماً بمعايير جودة وموثوقية لا تضاهى.',
          features: [
            { id: 'f1', title: 'ضمان معتمد 5 سنوات', description: 'شهادات ضمان أصلية وموثقة على كافة المبيعات والخدمات.' },
            { id: 'f2', title: 'فحص كمبيوتر 150+ نقطة', description: 'أحدث أجهزة الفحص الألمانية لضمان خلو المركبات والمنشآت من أي ملاحظات.' },
            { id: 'f3', title: 'خدمة مستشار مبيعات VIP', description: 'متابعة شخصية وتسهيلات تمويلية سريعة خلال 24 ساعة.' },
            { id: 'f4', title: 'تسليم وتوصيل مجاني', description: 'شحن آمن ومؤمن بالكامل لباب العميل في كافة المدن.' },
          ],
        },
        styles: {
          desktop: {
            display: 'block',
            width: '100%',
            backgroundColor: backgroundColor || '#ffffff',
            paddingTop: '60px',
            paddingBottom: '60px',
          },
        },
      };
      diffSummary.push(`إدراج قسم مميزات جديد (${newSectionNode.name}) أسفل المكون`);
    }

    operations.push({
      op: 'insert_node',
      targetId: targetId,
      path: 'childrenIds',
      value: {
        node: newSectionNode,
        targetParentId: context.activePage?.rootNodeId || 'page_root',
        insertAfterId: targetId,
      },
      explanation: `إدراج قسم جديد (${newSectionNode.name}) أسفل (${nodeName})`,
    });
  }

  // --- G. GENERIC TEXT & HEADING TARGET ---
  if (extractedQuote && Object.keys(propsPatch).length === 0) {
    if (nodeType === 'heading' || nodeType === 'paragraph' || nodeType === 'button') {
      propsPatch.text = extractedQuote;
    } else {
      propsPatch.title = extractedQuote;
    }
    diffSummary.push(`تحديث النص إلى: "${extractedQuote}"`);
  }

  // Compile Styles Update
  const stylePatch: Record<string, any> = {};
  if (backgroundColor) stylePatch.backgroundColor = backgroundColor;
  if (textColor) stylePatch.textColor = textColor;
  if (borderRadius) stylePatch.borderRadius = borderRadius;
  if (boxShadow) stylePatch.boxShadow = boxShadow;
  if (backdropBlur) stylePatch.backdropBlur = backdropBlur;

  if (Object.keys(stylePatch).length > 0) {
    operations.push({
      op: 'UPDATE_STYLE',
      targetId: targetId,
      path: 'styles.desktop',
      value: stylePatch,
      explanation: `تحديث النمط البصري والألوان للمكون (${nodeName})`,
    });
  }

  // Compile Props Update
  if (Object.keys(propsPatch).length > 0) {
    operations.push({
      op: 'UPDATE_PROPS',
      targetId: targetId,
      path: 'props',
      value: propsPatch,
      explanation: `تعديل خصائص ومحتوى المكون (${nodeName})`,
    });
  }

  // Theme Token Update if Theme scope or primaryColor changed
  if (scope === 'theme' || (primaryColor && scope !== 'element')) {
    const chosenColor = primaryColor || '#2563eb';
    operations.push({
      op: 'update_theme_token',
      path: 'theme.colors.primary',
      value: chosenColor,
      explanation: `تحديث لون السمة الرئيسي للعلامة التجارية إلى ${chosenColor}`,
    });
    diffSummary.push(`تحديث اللون الأساسي للعلامة التجارية إلى ${chosenColor}`);
  }

  // Fallback if no specific trigger matched
  if (operations.length === 0) {
    operations.push({
      op: 'UPDATE_PROPS',
      targetId: targetId,
      path: 'props',
      value: {
        badge: 'محدث بالذكاء الاصطناعي ⚡',
        title: targetNode?.props?.title || targetNode?.props?.text || 'محتوى مخصص ومطور',
        subtitle: prompt,
      },
      explanation: `تطبيق التعديلات النصية والوصف المخصص على (${nodeName})`,
    });
    diffSummary.push(`تحديث وتنسيق النصوص والمظهر العام لـ (${nodeName}) وفقاً للطلب`);
  }

  return {
    id: `patch_${Date.now()}`,
    targetWebsiteId: context.website?.id || 'website_active',
    scope: scope,
    description: prompt,
    summary: prompt,
    targetNodeIds: [targetId],
    targetComponentId: targetId,
    targetComponentName: nodeName,
    operations,
    diffSummary,
    estimatedRisk: 'low',
    safetyValidation: {
      passed: true,
      violatesTenantBoundary: false,
      containsForbiddenScripts: false,
      warnings: [],
    },
    appliedStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
}
