'use client';

import React, { useState } from 'react';
import { 
  Utensils, 
  ShoppingCart, 
  Scissors, 
  Stethoscope, 
  Car, 
  Building, 
  Wrench, 
  GraduationCap, 
  Dumbbell, 
  Ticket, 
  Truck, 
  Building2,
  Shirt,
  Sparkles,
  Apple,
  Smartphone,
  Home,
  Watch,
  Layers,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Store,
  Receipt,
  ShieldCheck,
  Zap,
  BarChart3,
  Clock,
  QrCode
} from 'lucide-react';
import { Language } from '@/nammy/types';
import { SECTOR_ACTIVITIES, COMMERCE_TEMPLATES } from '@/nammy/landingData';

interface ActivitiesPageViewProps {
  lang: Language;
  onOpenDemo: (sectorName?: string) => void;
}

interface SectorDetailData {
  id: string;
  name: string;
  nameEn: string;
  badge: string;
  tagline: string;
  overview: string;
  challenge: string;
  solution: string;
  posFeatures: string[];
  sampleItems: Array<{ name: string; qty: number; price: number }>;
  metricHighlight: { label: string; value: string; note: string };
}

export const ActivitiesPageView: React.FC<ActivitiesPageViewProps> = ({ lang, onOpenDemo }) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'all-sectors' | 'store-templates'>('store-templates');
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  // Mapping outline icons and distinctive colors for the 12 business sectors
  const sectorIconsMap: Record<string, { icon: any; color: string; hoverBorder: string }> = {
    restaurants: { icon: Utensils, color: 'text-orange-500 group-hover:text-orange-600', hoverBorder: 'hover:border-orange-400' },
    retail: { icon: ShoppingCart, color: 'text-amber-500 group-hover:text-amber-600', hoverBorder: 'hover:border-amber-400' },
    salons: { icon: Scissors, color: 'text-pink-500 group-hover:text-pink-600', hoverBorder: 'hover:border-pink-400' },
    clinics: { icon: Stethoscope, color: 'text-emerald-500 group-hover:text-emerald-600', hoverBorder: 'hover:border-emerald-400' },
    automotive: { icon: Car, color: 'text-blue-500 group-hover:text-blue-600', hoverBorder: 'hover:border-blue-400' },
    'real-estate': { icon: Building, color: 'text-indigo-600 group-hover:text-indigo-700', hoverBorder: 'hover:border-indigo-400' },
    services: { icon: Wrench, color: 'text-cyan-500 group-hover:text-cyan-600', hoverBorder: 'hover:border-cyan-400' },
    education: { icon: GraduationCap, color: 'text-violet-600 group-hover:text-violet-700', hoverBorder: 'hover:border-violet-400' },
    sports: { icon: Dumbbell, color: 'text-rose-500 group-hover:text-rose-600', hoverBorder: 'hover:border-rose-400' },
    events: { icon: Ticket, color: 'text-purple-500 group-hover:text-purple-600', hoverBorder: 'hover:border-purple-400' },
    wholesale: { icon: Truck, color: 'text-amber-600 group-hover:text-amber-700', hoverBorder: 'hover:border-amber-400' },
    enterprise: { icon: Building2, color: 'text-slate-800 group-hover:text-slate-900', hoverBorder: 'hover:border-slate-400' },
    apparel: { icon: Shirt, color: 'text-rose-500 group-hover:text-rose-600', hoverBorder: 'hover:border-rose-400' },
    beauty: { icon: Sparkles, color: 'text-purple-500 group-hover:text-purple-600', hoverBorder: 'hover:border-purple-400' },
    food: { icon: Apple, color: 'text-emerald-500 group-hover:text-emerald-600', hoverBorder: 'hover:border-emerald-400' },
    electronics: { icon: Smartphone, color: 'text-sky-500 group-hover:text-sky-600', hoverBorder: 'hover:border-sky-400' },
    home: { icon: Home, color: 'text-amber-500 group-hover:text-amber-600', hoverBorder: 'hover:border-amber-400' },
    accessories: { icon: Watch, color: 'text-yellow-600 group-hover:text-yellow-700', hoverBorder: 'hover:border-yellow-400' },
    'wholesale-retail': { icon: Layers, color: 'text-slate-700 group-hover:text-slate-900', hoverBorder: 'hover:border-slate-400' },
  };

  // Detailed profiles for dedicated activity deep-dive pages
  const sectorDetails: Record<string, SectorDetailData> = {
    restaurants: {
      id: 'restaurants',
      name: 'المطاعم والكافيهات',
      nameEn: 'Restaurants & Cafes',
      badge: 'إدارة الصالة والتوصيل',
      tagline: 'كاشير سريع، تذاكر مطبخ، وتوصيل فوري بدون فقدان أي طلب',
      overview: 'منظومة مصممة لتسريع حركة الطلبات في المطاعم والكافيهات المصرية، سواء في الصالة أو التيك أواي أو التوصيل المنزلي.',
      challenge: 'ضغط ساعات الذروة، تأخر تذاكر المطبخ، ولخبطة حسابات الدليفري وتطبيقات التوصيل.',
      solution: 'ربط شاشات المطبخ وطابعات البار لاسلكياً مع الكاشير، تنظيم مسارات السائقين، ومتابعة الهدر والوصفات بدقة.',
      posFeatures: [
        'إدارة الطاولات وحجز المقاعد وتعديل الحسابات بلمسة واحدة',
        'طابعات مطبخ سريعة (KDS) تفصل المأكولات عن المشروبات تلقائياً',
        'تتبع سائقي الدليفري ومناطق التوصيل وحساب نقدية كل كابتن',
        'فواتير ضريبية وإيصالات إلكترونية معتمدة من مصلحة الضرائب (ETA)',
      ],
      sampleItems: [
        { name: 'وجبة برجر دوبل كومبو', qty: 2, price: 185 },
        { name: 'بيتزا سوبر سوبريم عائلي', qty: 1, price: 240 },
        { name: 'عصير برتقال طبيعي', qty: 3, price: 65 },
      ],
      metricHighlight: {
        label: 'زمن إصدار الطلب للمطبخ',
        value: 'أقل من 3 ثوانٍ',
        note: 'تسريع حركة الصالة بنسبة 45%',
      },
    },
    retail: {
      id: 'retail',
      name: 'محلات التجزئة والبوتيكات',
      nameEn: 'Retail & Boutiques',
      badge: 'سرعة الكاشير والباركود',
      tagline: 'مسح باركود فوري، تحديث المخزن لحظياً، ومطابقة النقدية',
      overview: 'محلك يشتغل بسرعة وسلاسة: كل حركة بيع على الكاشير تخصم فوراً من رصيد الصنف في الرف والمستودع.',
      challenge: 'طوابير الكاشير، عدم معرفة الرصيد الفعلي في المخزن إلا بعد انتهاء الصنف، وأخطاء الجرد.',
      solution: 'كاشير سحابي خفيف يعمل على أي لابتوب أو تابلت مع مسح باركود ذكي وتنبيهات نواقص قبل النفاد.',
      posFeatures: [
        'مسح باركود فائق السرعة يدعم كل أجهزة الماسحات الضوئية',
        'تنبيهات فورية عند وصول الصنف للحد الأدنى لإعادة التوريد',
        'ربط فوري بطرق الدفع المصرية (إنستاباي، فوري، ميزة، نقد)',
        'جرد دوري سريع بالباركود دون الحاجة لإغلاق المحل',
      ],
      sampleItems: [
        { name: 'طقم ملابس صيفي قطن مصري', qty: 1, price: 650 },
        { name: 'حذاء كاجوال جلد طبيعي', qty: 1, price: 890 },
        { name: 'إكسسوار نظارة شمسية', qty: 2, price: 175 },
      ],
      metricHighlight: {
        label: 'سرعة إنهاء الفاتورة',
        value: '5 ثوانٍ فقط',
        note: 'صفر أخطاء في مطابقة النقدية بنهاية الشيفت',
      },
    },
    salons: {
      id: 'salons',
      name: 'صالونات ومراكز التجميل',
      nameEn: 'Salons & Spas',
      badge: 'المواعيد وعمولات الأخصائيين',
      tagline: 'جدول مواعيد دقيق، باقات خدمات، وحساب عمولات الفريق تلقائياً',
      overview: 'تنظيم مواعيد الزبائن، تفادي الانتظار والازدحام، وحساب عمولة كل مصفف وأخصائية بدون أي خلافات حسابية.',
      challenge: 'تضارب المواعيد الهاتفية، نسيان العملاء لمواعيدهم، وصعوبة حساب نسب مقدمي الخدمة بنهاية الشهر.',
      solution: 'رابط حجز ذكي، تذكيرات آلية عبر واتساب، وكاشير يسجل الخدمات وباقات العناية لكل عميل.',
      posFeatures: [
        'جدول تفاعلي بالدقائق لكل كرسي وأخصائي لمنع التعارض',
        'تذكيرات واتساب تلقائية تقلل غياب العملاء بنسبة 80%',
        'حساب تلقائي لعمولات وبونص فريق العمل مع كل فاتورة',
        'سجل تفضيلات العميل وتاريخ جلسات العناية السابقة',
      ],
      sampleItems: [
        { name: 'جلسة عناية بالشعر متكاملة', qty: 1, price: 750 },
        { name: 'باقة تنظيف بشرة ملكي', qty: 1, price: 550 },
        { name: 'سيروم ترميم علاجي 100ml', qty: 1, price: 420 },
      ],
      metricHighlight: {
        label: 'انخفاض غياب المواعيد',
        value: '-82%',
        note: 'بفضل رسائل التذكير التلقائية',
      },
    },
    clinics: {
      id: 'clinics',
      name: 'العيادات والمراكز الطبية',
      nameEn: 'Clinics & Healthcare',
      badge: 'ملفات المرضى والإيصال الضريبي',
      tagline: 'حجوزات الكشف، ملفات المراجعين، وإيصال إلكتروني طبي معتمد',
      overview: 'إدارة متكاملة لعيادتك: جدول مواعيد الأطباء، ملف إلكتروني لكل مريض، وإصدار إيصالات إلكترونية متوافقة مع منظومة الضرائب المصرية.',
      challenge: 'الملفات الورقية الضائعة، تداخل مواعيد الكشف والاستشارة، والتوافق مع متطلبات الإيصال الإلكتروني.',
      solution: 'نظام عيادات سحابي مشفر يحفظ السجل الطبي ويصدر الفواتير الطبية بباركود مصلحة الضرائب المصرية فورياً.',
      posFeatures: [
        'سجل طبي رقمي للمريض يتضمن الزيارات والروشتات السابقة',
        'تنظيم كشوفات واستشارات كل عيادة وطبيب بحسب الشيفت',
        'إيصال إلكتروني طبي معتمد برمز QR مشفر لمصلحة الضرائب',
        'تشفير كامل لكافة السجلات الطبية لحفظ خصوصية المراجعين',
      ],
      sampleItems: [
        { name: 'كشف عيادة باطنة تخصصي', qty: 1, price: 400 },
        { name: 'فحص أشعة سونار تشخيصي', qty: 1, price: 350 },
        { name: 'جلسة غيار ومتابعة دورية', qty: 1, price: 150 },
      ],
      metricHighlight: {
        label: 'التوافق الضريبي الطبي',
        value: '100% معتمد',
        note: 'ربط مباشر مع منظومة الإيصال الإلكتروني ETA',
      },
    },
    automotive: {
      id: 'automotive',
      name: 'مراكز صيانة السيارات وقطع الغيار',
      nameEn: 'Automotive & Fleet Care',
      badge: 'كروت التشغيل ورقم الشاسيه',
      tagline: 'كارت فحص وصيانة، جرد قطع الغيار، وربط رقم الشاسيه بالعملية',
      overview: 'متابعة دخول السيارات للورشة، صرف قطع الغيار من المستودع، وإصدار أمر شغل وفاتورة تفصيلية للعميل.',
      challenge: 'تسريب قطع الغيار غير المسجلة، عدم وضوح تكاليف المصنعيات، وفقدان تاريخ صيانة السيارة.',
      solution: 'كارت شغل رقمي يسجل فحص المهندس، يخصم قطع الغيار بالباركود، ويصدر فاتورة مفصلة بالقطع والمصنعية.',
      posFeatures: [
        'إصدار كارت تشغيل برقم اللوحة والشاسيه ومستوى الوقود',
        'ربط مستودع قطع الغيار وأسعار الشراء والبيع وهامش الربح',
        'إرسال تقرير الفحص وتكلفة الصيانة للعميل عبر واتساب للموافقة',
        'تاريخ صيانة كامل لكل سيارة لمتابعة مواعيد تغيير الزيت والقطع',
      ],
      sampleItems: [
        { name: 'طقم تيل فرامل أمامي أصلي', qty: 1, price: 1450 },
        { name: 'زيت محرك تخليقي 5W30 4L + فلتر', qty: 1, price: 1200 },
        { name: 'مصنعية صيانة دورية وفحص شامل', qty: 1, price: 350 },
      ],
      metricHighlight: {
        label: 'منع هدر قطع الغيار',
        value: 'رقابة 100%',
        note: 'لا تصرف قطعة من المخزن إلا بكارت شغل رسمي',
      },
    },
    apparel: {
      id: 'apparel',
      name: 'أزياء وملابس ومتاجر أونلاين',
      nameEn: 'Fashion & Boutique Stores',
      badge: 'المقاسات والدفع عند الاستلام',
      tagline: 'مصفوفة مقاسات وألوان، متجر سريع، ودفع عند الاستلام',
      overview: 'مصمم خصيصاً لتجارة الملابس المصرية: إدارة القياسات، معالجة المرتجعات، وتوصيل سريع مع كبرى شركات الشحن.',
      challenge: 'تعدد مقاسات الصنف الواحد (S, M, L, XL)، تبديل المقاسات، وتحصيل أموال الدفع عند الاستلام (COD).',
      solution: 'مصفوفة ذكية تتيح إدارة 20 متغير لكل موديل بباركود منفصل، مع متابعة دقيقة لمتحصلات شركات الشحن.',
      posFeatures: [
        'جدول مقاسات وألوان يربط كل متغير برصيد الرف والمستودع',
        'صفحة بيع سريعة للموبايل تزيد إتمام الشراء بنسبة 35%',
        'نظام متابعة طرود الشحن وتحصيل أموال الدفع عند الاستلام',
        'سياسة استبدال واسترجاع سريعة تطبع باركود جديد للمرتجع',
      ],
      sampleItems: [
        { name: 'فستان كتان بيج مقاس M', qty: 1, price: 920 },
        { name: 'بلوزة حرير أسود مقاس L', qty: 2, price: 580 },
        { name: 'حزام جلد هاندميد', qty: 1, price: 210 },
      ],
      metricHighlight: {
        label: 'معدل إتمام الشراء',
        value: '+38%',
        note: 'بفضل سلاسة اختيار المقاسات والشحن بالمعاينة',
      },
    },
  };

  // Fallback detail builder for other sectors
  const getSectorDetail = (id: string): SectorDetailData => {
    if (sectorDetails[id]) return sectorDetails[id];
    
    // Find in SECTOR_ACTIVITIES or COMMERCE_TEMPLATES
    const sec = SECTOR_ACTIVITIES.find(s => s.id === id);
    const tmpl = COMMERCE_TEMPLATES.find(t => t.id === id);
    const name = sec ? (isAr ? sec.name : sec.nameEn) : tmpl ? (isAr ? tmpl.title : tmpl.titleEn) : id;
    const tagline = sec ? (isAr ? sec.tagline : sec.taglineEn) : tmpl ? (isAr ? tmpl.subtitle : tmpl.subtitleEn) : '';

    return {
      id,
      name,
      nameEn: name,
      badge: isAr ? 'منظومة تشغيل متخصصة' : 'Specialized Operating Suite',
      tagline,
      overview: isAr 
        ? `منظومة تشغيل مصممة لتلبية متطلبات نشاط ${name} في السوق المصري مع كاشير سحابي وإدارة مخزون وفواتير إلكترونية معتمدة.`
        : `Tailored operating platform configured for ${name} with fast POS, real-time inventory and Egyptian ETA compliance.`,
      challenge: isAr ? 'صعوبة الربط بين نقاط البيع والمخازن ومتابعة التدفق النقدي بدقة.' : 'Fragmented inventory and payment tracking.',
      solution: isAr ? 'لوحة تحكم موحدة تجمع مبيعات الكاشير، الفواتير الضريبية، وحركة المنتجات لحظياً.' : 'Unified dashboard with live POS and stock sync.',
      posFeatures: isAr ? [
        `شاشة كاشير سريعة مخصصة لطبيعة نشاط ${name}`,
        'مزامنة فورية للمخزون مع كل فاتورة بيع جديدة',
        'ربط طرق الدفع المصرية (إنستاباي، فوري، محافظ المحمول)',
        'فواتير وإيصالات إلكترونية معتمدة من مصلحة الضرائب المصرية',
      ] : [
        'Dedicated high-speed POS register interface',
        'Live inventory deduction per transaction',
        'Direct Egyptian payment gateways integration',
        'Certified ETA e-invoicing compliance',
      ],
      sampleItems: [
        { name: isAr ? 'طلب تشغيلي أساسي' : 'Primary Service Item', qty: 1, price: 450 },
        { name: isAr ? 'صنف إضافي متكرر' : 'Add-on Item', qty: 2, price: 180 },
        { name: isAr ? 'خدمة ما بعد البيع' : 'Maintenance & Care', qty: 1, price: 220 },
      ],
      metricHighlight: {
        label: isAr ? 'كفاءة التشغيل' : 'Operational Efficiency',
        value: '+40%',
        note: isAr ? 'توفير وقت الحسابات والجرد اليدوي' : 'Reduced manual overhead',
      },
    };
  };

  const selectedSector = selectedSectorId ? getSectorDetail(selectedSectorId) : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* VIEW A: DEDICATED SECTOR SHOWCASE PAGE (When user clicks on any sector) */}
      {selectedSector ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Back button to all sectors */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedSectorId(null)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-all cursor-pointer shadow-2xs group"
            >
              <ArrowRight size={14} className="rtl:inline-block ltr:rotate-180 transition-transform group-hover:translate-x-0.5" />
              <span>{isAr ? 'الرجوع لكافة الأنشطة والقطاعات' : 'Back to all sectors'}</span>
            </button>

            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {isAr ? 'مهيأ بالكامل للسوق المصري' : 'Egyptian Market Ready'}
            </span>
          </div>

          {/* Sector Profile Header */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                  {selectedSector.badge}
                </span>
                <span className="text-xs text-slate-400 font-bold">•</span>
                <span className="text-xs font-bold text-slate-500">{isAr ? 'حلول تشغيل متخصصة' : 'Specialized OS'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                {selectedSector.name}
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-semibold max-w-xl leading-relaxed">
                «{selectedSector.tagline}»
              </p>
            </div>

            {/* Quick Metric Pill */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-start min-w-[200px] shrink-0">
              <span className="text-[11px] font-bold text-amber-800 block">
                {selectedSector.metricHighlight.label}
              </span>
              <span className="text-2xl font-black text-slate-900 block mt-0.5">
                {selectedSector.metricHighlight.value}
              </span>
              <span className="text-[11px] font-medium text-emerald-700 block mt-0.5">
                {selectedSector.metricHighlight.note}
              </span>
            </div>
          </div>

          {/* Real Challenge & Real Solution Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                <Clock size={18} />
                <span>{isAr ? 'التحدي الشائع في السوق المصري:' : 'Typical Market Challenge:'}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                {selectedSector.challenge}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                <Zap size={18} />
                <span>{isAr ? 'كيف تحلها منظومة نمّي:' : 'How Nammy Solves It:'}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                {selectedSector.solution}
              </p>
            </div>
          </div>

          {/* Interactive Mock POS Receipt Preview for this specific sector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center text-start">
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-black text-xl text-slate-900">
                {isAr ? 'مميزات الكاشير ونقاط البيع الخاصة بالنشاط:' : 'Specialized POS & Workflow Features:'}
              </h3>

              <div className="space-y-2.5">
                {selectedSector.posFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => onOpenDemo(`${isAr ? 'بدء تجربة نشاط' : 'Launch Demo for'} ${selectedSector.name}`)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  {isAr ? `ابدأ تشغيل نشاط ${selectedSector.name} مجاناً` : `Launch ${selectedSector.name} Free`}
                </button>

                <button
                  onClick={() => onOpenDemo(`${isAr ? 'استشارة متخصصة لنشاط' : 'Consultation for'} ${selectedSector.name}`)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'تحدث مع مستشار النشاط' : 'Consult with specialist'}
                </button>
              </div>
            </div>

            {/* Mock Live Digital Receipt in Egyptian Pounds */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-xl relative overflow-hidden font-mono text-slate-800 space-y-3">
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto mb-1 font-bold">
                    <Receipt size={16} />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{selectedSector.name} - فرع القاهرة</h4>
                  <span className="text-[10px] text-slate-500 block">فاتورة إلكترونية معتمدة (ETA)</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">#INV-2026-08912 • مباشر</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {selectedSector.sampleItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span>{item.qty}x {item.name}</span>
                      <span className="font-bold tabular-nums">{(item.qty * item.price).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-xs">
                  {(() => {
                    const subtotal = selectedSector.sampleItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
                    const vat = Math.round(subtotal * 0.14);
                    const total = subtotal + vat;
                    return (
                      <>
                        <div className="flex justify-between text-slate-500 text-[10px]">
                          <span>المجموع قبل الضريبة</span>
                          <span>{subtotal.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[10px]">
                          <span>ضريبة القيمة المضافة (14%)</span>
                          <span>{vat.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                          <span>الإجمالي المدفوع</span>
                          <span className="text-amber-600">{total.toLocaleString()} ج.م</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold">
                    <ShieldCheck size={14} />
                    <span>تم الدفع إلكترونياً (إنستاباي)</span>
                  </div>
                  <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-700">
                    <QrCode size={18} />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* VIEW B: OVERVIEW CATALOG OF ALL SECTORS AND TEMPLATES */
        <>
          {/* Header Statement */}
          <div className="text-start space-y-3">
            <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
              {isAr ? 'الأنشطة ونماذج التجارة' : 'Sectors & Store Models'}
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {isAr ? (
                <>
                  مصممة{' '}
                  <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                    لكل أنواع الأنشطة
                  </span>
                  .. جاهزة لتبدأ اليوم.
                </>
              ) : (
                <>
                  Tailored for{' '}
                  <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                    every business trade
                  </span>
                  .. ready to launch today.
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-slate-700 max-w-2xl font-medium leading-relaxed">
              {isAr
                ? 'اضغط على أي نشاط لتصفح تفاصيله، طريقة عمل الكاشير والمخزن الخاصة به، وتجربة شاشة البيع المخصصة.'
                : 'Click on any business vertical to view its complete operating blueprint, POS workflows, and specialized inventory controls.'}
            </p>
          </div>

          {/* Switcher: Store Models vs All 12 Business Verticals */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/90 w-fit">
            <button
              onClick={() => setActiveTab('store-templates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'store-templates'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store size={15} className="text-amber-500" />
              <span>{isAr ? 'نماذج المتاجر الجاهزة (7 مجالات)' : 'Commerce Store Models (7)'}</span>
            </button>

            <button
              onClick={() => setActiveTab('all-sectors')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'all-sectors'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 size={15} className="text-indigo-600" />
              <span>{isAr ? 'كافة القطاعات التجارية (12 نشاط)' : 'All 12 Business Sectors'}</span>
            </button>
          </div>

          {/* TAB 1: 7 Commerce Showcase Store Models */}
          {activeTab === 'store-templates' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-start">
                <h3 className="font-black text-lg text-slate-900">
                  {isAr ? 'واجهات ونماذج تشغيلية جاهزة للتخصيص الفوري' : 'Pre-Engineered Commerce Operating Templates'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr ? 'اضغط على أي نموذج لعرض تفاصيله الكاملة والبدء الفوري' : 'Click on any template to inspect workflow & launch'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {COMMERCE_TEMPLATES.map((tmpl) => {
                  const meta = sectorIconsMap[tmpl.id] || sectorIconsMap.apparel;
                  const Icon = meta.icon;
                  const title = isAr ? tmpl.title : tmpl.titleEn;
                  const subtitle = isAr ? tmpl.subtitle : tmpl.subtitleEn;
                  const badge = isAr ? tmpl.badge : tmpl.badgeEn;

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedSectorId(tmpl.id)}
                      className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:border-amber-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group cursor-pointer text-start"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Icon size={30} strokeWidth={2} className={`${meta.color} transition-transform group-hover:scale-110`} />
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {badge}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-lg text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                            {title}
                          </h4>
                          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                            {subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
                        <span>{isAr ? 'عرض التفاصيل وشاشة الكاشير' : 'View Details & POS'}</span>
                        <ArrowLeft size={13} className="rtl:inline-block ltr:rotate-180 transition-transform group-hover:-translate-x-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: All 12 Explicit Business Sectors */}
          {activeTab === 'all-sectors' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-start">
                <h3 className="font-black text-lg text-slate-900">
                  {isAr ? 'الأنشطة والقطاعات المدعومة (12 نشاط)' : 'Supported Business Verticals (12)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr ? 'اختر نشاطك لمعاينة دورة العمل، شاشة الكاشير، والفوترة الإلكترونية المعتمدة' : 'Select your sector to view customized workflow, register, and tax billing'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SECTOR_ACTIVITIES.map((sector) => {
                  const meta = sectorIconsMap[sector.id] || sectorIconsMap.retail;
                  const Icon = meta.icon;
                  const name = isAr ? sector.name : sector.nameEn;
                  const tagline = isAr ? sector.tagline : sector.taglineEn;
                  const desc = isAr ? sector.description : sector.descriptionEn;

                  return (
                    <div
                      key={sector.id}
                      onClick={() => setSelectedSectorId(sector.id)}
                      className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:border-amber-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group cursor-pointer text-start"
                    >
                      <div>
                        <div className="mb-2.5 pt-0.5">
                          <Icon 
                            size={30} 
                            strokeWidth={2} 
                            className={`${meta.color} transition-transform duration-200 group-hover:scale-110`} 
                          />
                        </div>
                        
                        <h3 className="font-black text-lg text-slate-900 group-hover:text-amber-600 transition-colors">
                          {name}
                        </h3>
                        <span className="text-xs font-bold text-slate-500 block mt-0.5">
                          «{tagline}»
                        </span>
                        
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">
                          {desc}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
                        <span>{isAr ? 'تصفح صفحة النشاط' : 'Explore Sector Page'}</span>
                        <ArrowLeft size={13} className="rtl:inline-block ltr:rotate-180 transition-transform group-hover:-translate-x-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reassurance Banner */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">
                  {isAr ? 'نشاطك غير موجود في القائمة؟' : 'Don\'t see your exact business sector?'}
                </h4>
                <p className="text-xs text-slate-600">
                  {isAr ? 'نظام نمّي مرن تماماً وقابل للتخصيص ليناسب أي نشاط أو كاشير في مصر.' : 'Nammy Business OS is fully customizable for any physical trade, workflow, or register.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenDemo(isAr ? 'استشارة نشاط مخصص' : 'Custom Sector Consultation')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs"
            >
              {isAr ? 'تحدث مع مستشار لتهيئة نشاطك' : 'Consult with a specialist'}
            </button>
          </div>
        </>
      )}

    </div>
  );
};
