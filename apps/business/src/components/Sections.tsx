'use client';

import Link from 'next/link';
import { useState } from 'react';
import { HIDE_UNPUBLISHED } from '@/lib/moduleConfig';
import { MEN_MAKANAK_LIVE } from '@/nammy/menMakanak';
import {
  TrendingUp,
  ArrowLeft,
  Zap,
  ShoppingCart,
  BarChart3,
  Palette,
  Globe,
  Shield,
  Star,
  Store,
  Smartphone,
  CreditCard,
  Truck,
  Users,
  Sparkles,
  Package,
  Rocket,
  Target,
  Award,
  Layers,
  Code2,
  Headphones,
  Building2,
  Send,
  MapPin,
  Navigation,
  MessageSquare,
  LayoutGrid,
  Check,
  Boxes,
  Image as ImageIcon,
  Eye,
} from 'lucide-react';
import { RevealSection } from '@/lib/hooks';

const industryThemes = [
  {
    label: 'مطاعم',
    url: 'restaurant.myshop.com',
    desc: 'قوائم رقمية تفاعلية، حجز طاولات، وتوصيل مباشر للعملاء.',
    primary: '#EA580C',
    accent: '#F97316',
  },
  {
    label: 'تجزئة',
    url: 'retail.myshop.com',
    desc: 'عرض منتجاتك بشبكة أنيقة، فلاتر سريعة، ودفع إلكتروني مدمج.',
    primary: '#0369A1',
    accent: '#0EA5E9',
  },
  {
    label: 'صالونات',
    url: 'salon.myshop.com',
    desc: 'حجز مواعيد أسهل، قائمة خدمات واضحة، وتذكيرات لعملائك.',
    primary: '#BE185D',
    accent: '#EC4899',
  },
  {
    label: 'عيادات',
    url: 'clinic.myshop.com',
    desc: 'إدارة مواعيد المرضى، تذكيرات تلقائية، وبيانات آمنة.',
    primary: '#0F766E',
    accent: '#14B8A6',
  },
  {
    label: 'سيارات',
    url: 'cars.myshop.com',
    desc: 'عرض سياراتك بشكل احترافي، حجز اختبار قيادة، وطلب صيانة.',
    primary: '#4338CA',
    accent: '#6366F1',
  },
  {
    label: 'عقارات',
    url: 'realestate.myshop.com',
    desc: 'نشر إعلانات، تصفّح العقارات، وتواصل مباشر مع المهتمين.',
    primary: '#047857',
    accent: '#10B981',
  },
  {
    label: 'خدمات',
    url: 'services.myshop.com',
    desc: 'حجز مواعيد، استقبال طلبات، وعرض لخدماتك بوضوح.',
    primary: '#0E7490',
    accent: '#22D3EE',
  },
  {
    label: 'تعليم',
    url: 'study.myshop.com',
    desc: 'مناهج منظمة، حجز حصص، وتواصل مع الطلاب وأولياء الأمور.',
    primary: '#7C3AED',
    accent: '#A78BFA',
  },
  {
    label: 'رياضة',
    url: 'sport.myshop.com',
    desc: 'اشتراكات، حجز مدرب، ومتابعة تقدم الأعضاء.',
    primary: '#CA8A04',
    accent: '#FACC15',
  },
  {
    label: 'فعاليات',
    url: 'events.myshop.com',
    desc: 'حجز تذاكر، برنامج الفعالية، وإدارة الحضور من مكان واحد.',
    primary: '#C026D3',
    accent: '#E879F9',
  },
  {
    label: 'جملة',
    url: 'wholesale.myshop.com',
    desc: 'كروت أسعار بالجملة، قنوات بيع متعددة، وتتبع المخزون.',
    primary: '#1D4ED8',
    accent: '#3B82F6',
  },
  {
    label: 'شركات',
    url: 'company.myshop.com',
    desc: 'موقع مؤسسي يعرض خدماتك وأعمالك ويسهّل تواصل عملائك.',
    primary: '#0F172A',
    accent: '#475569',
  },
];

const features = [
  {
    icon: ShoppingCart,
    title: 'متجر إلكتروني احترافي',
    desc: 'أنشئ متجراً يعكس هوية علامتك التجارية بألوان وتصميمات مخصصة — بدون خبرة تقنية.',
    color: 'from-cyan-500 to-blue-500',
    span: 'md:col-span-2',
  },
  {
    icon: BarChart3,
    title: 'تحليلات وتقارير ذكية',
    desc: 'تتبع مبيعاتك وأداء منتجاتك وسلوك عملائك بتحليلات واضحة وسهلة الفهم.',
    color: 'from-violet-500 to-purple-500',
    span: '',
  },
  {
    icon: Palette,
    title: 'مصمم صفحات مرن',
    desc: 'اسحب وأفلت لبناء واجهة متجرك بلمسات احترافية — بدون كتابة سطر كود.',
    color: 'from-pink-500 to-rose-500',
    span: '',
  },
  {
    icon: Globe,
    title: 'بيع على كل القنوات',
    desc: 'اعرض منتجاتك على متجرك الإلكتروني، نقطة البيع، ووسائل التواصل — كله متزامن.',
    color: 'from-emerald-500 to-teal-500',
    span: 'md:col-span-2',
  },
];

const steps = [
  {
    icon: Store,
    title: 'سجّل متجرك',
    desc: 'أنشئ حسابك في أقل من دقيقة واختر نوع نشاطك التجاري.',
    num: '01',
  },
  {
    icon: Palette,
    title: 'صمم واجهتك',
    desc: 'استخدم مصمم الصفحات لإنشاء متجر يعكس هويتك بألوان وصور مخصصة.',
    num: '02',
  },
  {
    icon: Rocket,
    title: 'ابدأ البيع',
    desc: 'أضف منتجاتك، فعّل طرق الدفع، وابدأ استقبال الطلبات فوراً.',
    num: '03',
  },
];

export function ThemeShowcase() {
  const [active, setActive] = useState(0);
  const t = industryThemes[active];

  return (
    <section id="themes" className="relative bg-white py-20 md:py-32 overflow-hidden">
      {/* خلفية توهّجية تتفاعل مع لون النشاط المختار */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-80 blur-[130px] opacity-30 transition-colors duration-700"
        style={{ backgroundColor: t.accent }}
      />
      <div
        className="pointer-events-none absolute -right-20 top-10 w-72 h-72 rounded-full blur-[120px] opacity-20 transition-colors duration-700"
        style={{ backgroundColor: t.primary }}
      />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
        <RevealSection className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            واجهة <span className="text-cyan-600">على مقاس نشاطك</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            مش قالب واحد للجميع — اختار قطاعك وشاهد واجهتك بتتبدل خطوة بخطوة، بتصميم نضيف بيشتغل
            بسرعة على كل الأجهزة.
          </p>
        </RevealSection>

        {/* مربعات الأنشطة */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
          {industryThemes.map((it, i) => (
            <button
              key={it.label}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-2xl px-3 py-4 text-sm font-bold border transition-all duration-300 ${
                active === i
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.03]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:-translate-y-0.5'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>

        {/* المعاينة التفاعلية */}
        <div
          key={t.label}
          className="animate-fade-up grid lg:grid-cols-2 gap-6 md:gap-8 items-center rounded-3xl border border-slate-200 bg-white p-5 md:p-8 shadow-xl shadow-slate-200/60"
        >
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xl shadow-slate-900/10">
            <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 px-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 h-5 flex-1 max-w-[220px] rounded-md bg-white border border-slate-200 text-[10px] text-slate-400 flex items-center px-2 truncate">
                {t.url}
              </span>
            </div>
            <div className="p-4 sm:p-5 bg-white">
              <div className="flex items-center justify-between pb-4">
                <div className="w-6 h-6 rounded-lg" style={{ background: t.primary }} />
                <div className="flex gap-2">
                  <div className="h-1.5 w-10 rounded-full" style={{ background: t.accent }} />
                  <div className="h-1.5 w-10 rounded-full bg-slate-300" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="col-span-2 space-y-2.5">
                  <div className="h-3.5 w-full rounded" style={{ background: t.primary }} />
                  <div className="h-2.5 w-2/3 rounded" style={{ background: t.accent }} />
                  <div className="h-7 w-24 rounded-lg" style={{ background: t.primary }} />
                </div>
                <div
                  className="rounded-xl flex flex-col items-center justify-center gap-1 text-white text-xs font-black"
                  style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.primary})` }}
                >
                  {t.label}
                </div>
              </div>
            </div>
          </div>

          <div>
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black mb-4"
              style={{ background: t.accent + '14', color: t.primary }}
            >
              {t.label}
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
              {t.label} بتصميم يفهم نشاطك
            </h3>
            <p className="text-slate-500 text-lg leading-relaxed mb-7">{t.desc}</p>
            <Link
              href="/#products"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-white font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: t.primary }}
            >
              ابدأ متجرك
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="relative bg-white py-20 md:py-32 overflow-hidden z-20">
      <div className="hidden md:block absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-500/5 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 relative">
        <RevealSection className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-600 text-sm font-bold mb-6">
            <Sparkles className="w-4 h-4" />
            من نحن
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            نحن هنا لمساعدة التجار على النجاح في العالم الرقمي
          </h2>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
          {[
            {
              icon: Target,
              title: 'مهمتنا',
              desc: 'مهمتنا هي تمكين كل تاجر من بناء متجر إلكتروني احترافي وإدارة أعماله بكفاءة',
              color: 'from-cyan-500 to-blue-500',
            },
            {
              icon: Award,
              title: 'رؤيتنا',
              desc: 'رؤيتنا هي أن نكون المنصة الرائدة في المنطقة لحلول التجارة الإلكترونية',
              color: 'from-violet-500 to-purple-500',
            },
            {
              icon: Users,
              title: 'مجتمعنا',
              desc: 'نبني مجتمعاً من التجار الناجحين وندعمهم في كل خطوة',
              color: 'from-pink-500 to-rose-500',
            },
          ].map((item, i) => (
            <RevealSection key={i} delay={i * 120}>
              <div className="group relative overflow-hidden rounded-3xl bg-slate-50 border border-slate-200 p-6 md:p-8 transition-all duration-300 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1">
                <div
                  className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`}
                />
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${item.color} mb-5 shadow-lg`}
                >
                  <item.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm md:text-base leading-relaxed">{item.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <RevealSection>
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-50 p-8 md:p-12">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-200/40 rounded-full blur-3xl" />
              <div className="relative">
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">قصتنا</h3>
                <p className="text-slate-500 text-base leading-relaxed mb-6">
                  بدأنا برؤية بسيطة: جعل التجارة الإلكترونية متاحة للجميع. اليوم، نساعد آلاف التجار
                  على تحقيق أحلامهم.
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <div className="text-slate-900 font-bold text-sm">تأسست 2024</div>
                    <div className="text-slate-400 text-xs">القاهرة، مصر</div>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
          <RevealSection delay={200}>
            <div className="space-y-6">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">
                لماذا تختارنا؟
              </h3>
              {[
                {
                  icon: Shield,
                  label: 'أمان عالمي مع تشفير متقدم وحماية لبياناتك',
                  color: 'text-blue-600',
                },
                {
                  icon: Zap,
                  label: 'سرعة فائقة وأداء محسن لتجربة مستخدم سلسة',
                  color: 'text-amber-600',
                },
                {
                  icon: Globe,
                  label: 'دعم متعدد اللغات مع واجهة عربية بالكامل',
                  color: 'text-emerald-600',
                },
                {
                  icon: Headphones,
                  label: 'دعم فني متاح 24/7 لمساعدتك في أي وقت',
                  color: 'text-rose-600',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </div>
    </section>
  );
}

export function GrowthJourney() {
  const cards = [
    {
      img: '/images/new/journey-store.png',
      title: 'أول محل',
      desc: 'ابدأ صح من أول فاتورة، ونظّم شغلك من اليوم الأول.',
    },
    {
      img: '/images/new/journey-growth.png',
      title: 'تجارة بتتوسع',
      desc: 'فروع أكتر، منتجات أكتر، عملاء أكتر.. وإدارة أسهل.',
    },
    {
      img: '/images/new/journey-enterprise.png',
      title: 'بزنس على مستوى أكبر',
      desc: 'تحكّم في عملياتك وفروعك وبياناتك من مكان واحد.',
    },
  ];

  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        {/* العنوان */}
        <div className="text-center mb-10 md:mb-14">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/70 px-4 py-1.5 text-xs md:text-sm font-bold text-cyan-700">
              <Rocket className="w-3.5 h-3.5" />
              رحلة نموّك
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.35]">
            مهما كانت تجارتك النهارده..
            <br />
            إحنا جاهزين لبكرة.
          </h2>
          <p className="mt-4 text-slate-500 text-sm sm:text-base md:text-lg">
            من أول محل صغير.. لأكبر شركة، نمِّي تجارتك بخطوات أسهل.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 lg:gap-8">
          {/* النص والسهم — على اليمين في الديسكتوب (أول عنصر = يمين في RTL) */}
          <div className="w-full lg:w-[300px] shrink-0 text-center lg:pt-10 order-1 lg:order-1">
            <div className="inline-block lg:block text-center">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00E5FF] to-[#0057FF] shadow-lg shadow-cyan-500/30 mb-4">
                <Send className="w-6 h-6 text-white" fill="currentColor" />
              </span>
              <h3 className="text-2xl md:text-[28px] font-black text-slate-900 leading-snug mb-2">
                من أول عملية بيع.. لأكبر فرع.
              </h3>
              <p className="text-slate-500 text-sm md:text-base mb-6">
                من محل واحد.. لمنظومة كاملة.
              </p>
              {/* سهم منقّط منحني — معكوس */}
              <svg
                viewBox="0 0 220 60"
                className="w-48 h-12 mx-auto mb-4 text-cyan-600"
                fill="none"
              >
                <path
                  d="M205 8 C 150 45, 80 50, 25 32"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="8 7"
                  strokeLinecap="round"
                />
                <path d="M32 22 L14 30 L30 40 Z" fill="currentColor" />
              </svg>
              <Link
                href="/signup"
                className="inline-block text-cyan-700 font-bold text-sm md:text-base hover:gap-3 gap-2 transition-all"
              >
                ابدأ من مكانك الحالي وكبَّر واحنا معاك.
              </Link>
            </div>
          </div>

          {/* الكروت — على الشمال (تاني عنصر = شمال في RTL) */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6 order-2 lg:order-2">
            {cards.map((c, i) => (
              <div
                key={i}
                className="reveal bg-white rounded-[2rem] border border-slate-200 shadow-[0_20px_60px_-20px_rgba(100,116,139,0.22)] p-6 md:p-7 text-center flex flex-col items-center hover:-translate-y-1.5 hover:shadow-[0_28px_70px_-20px_rgba(100,116,139,0.32)] transition-all duration-300"
              >
                <div className="w-full h-44 md:h-52 rounded-3xl overflow-hidden bg-slate-50 border border-slate-200 mb-5">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2.5">{c.title}</h3>
                <p className="text-slate-500 text-sm md:text-[15px] leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Market-launch switch: marketing blocks must never advertise sections that are
 * local-only (finance + accounting + HR + analytics + AI), so entries flagged
 * `localOnly` are stripped from the public page in production builds.
 */
function visibleMarketingItems<T extends { localOnly?: boolean }>(items: T[]): T[] {
  return HIDE_UNPUBLISHED ? items.filter((item) => !item.localOnly) : items;
}

export function ConnectedEcosystem() {
  const orbit = visibleMarketingItems([
    { icon: Boxes, label: 'المخزون', pos: 'top-[2%] left-1/2 -translate-x-1/2' },
    { icon: BarChart3, label: 'المبيعات', pos: 'top-[18%] left-[6%] md:left-[14%]' },
    { icon: Users, label: 'العملاء', pos: 'top-[18%] right-[6%] md:right-[14%]' },
    { icon: Users, label: 'الموظفين', pos: 'top-[52%] left-[0%] md:left-[6%]', localOnly: true },
    { icon: Truck, label: 'الشحن', pos: 'top-[52%] right-[0%] md:right-[6%]' },
    { icon: MessageSquare, label: 'الرسائل', pos: 'bottom-[13%] right-[10%] md:right-[18%]' },
    { icon: Globe, label: 'الدومينات', pos: 'bottom-[13%] left-[10%] md:left-[18%]' },
    { icon: LayoutGrid, label: 'صفحات البيع', pos: 'bottom-[0%] left-1/2 -translate-x-1/2' },
  ]);

  const list = visibleMarketingItems([
    { label: 'إدارة المبيعات' },
    { label: 'إدارة المخزون' },
    { label: 'إدارة العملاء' },
    { label: 'إدارة الموظفين', localOnly: true },
    { label: 'التقارير والتحليلات', localOnly: true },
    { label: 'الشحن والدفع' },
    { label: 'صفحات البيع والدومينات' },
  ]);

  return (
    <section dir="rtl" className="relative overflow-hidden bg-white py-16 md:py-24">
      {/* توهج خفيف بألوان البراند */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full bg-cyan-100/50 blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
        {/* العنوان */}
        <div className="text-center mb-10 md:mb-14">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/70 px-4 py-1.5 text-xs md:text-sm font-bold text-cyan-700">
              <Layers className="w-3.5 h-3.5" />
              منظومة واحدة
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.4]">
            كل حاجة متصلة
          </h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base md:text-lg">
            نربط كل أدوات تجارتك في منظومة واحدة.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-6 items-center">
          {/* النص + الزر — يمين في الديسكتوب (أول عنصر في RTL) */}
          <div className="text-center lg:text-right order-1">
            <h3 className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-900 leading-[1.9]">
              إنت شايف عملية بيع.
              <br />
              إحنا شايفين تجارتك كلها.
            </h3>
            <p className="mt-4 text-slate-500 text-sm md:text-base leading-[2.1]">
              كل فاتورة، كل منتج، كل حركة في المخزون، وكل عميل..
              <br />
              بنتحول لبيانات تساعدك تعرف إيه اللي بيحصل في
              <br />
              تجارتك وإيه اللي محتاج يتغير.
            </p>
            <Link
              href="/solutions"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-7 py-3 text-cyan-700 font-bold text-sm md:text-base hover:bg-cyan-50 shadow-sm transition-colors"
            >
              اكتشف كل الحلول
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          {/* المدار — النص في الوسط */}
          <div className="relative mx-auto w-full max-w-[420px] aspect-square order-2">
            {/* خطوط الربط */}
            <svg
              viewBox="0 0 400 400"
              className="absolute inset-0 w-full h-full text-cyan-400/60"
              fill="none"
            >
              {[
                'M200 40 L200 130',
                'M110 95 L155 145',
                'M290 95 L245 145',
                'M70 210 L135 190',
                'M330 210 L265 190',
                'M290 310 L245 250',
                'M110 310 L155 250',
                'M200 365 L200 275',
              ].map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 5"
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* المتجر في النص */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="absolute inset-0 -m-8 rounded-[2.5rem] bg-cyan-300/40 blur-3xl" />
              <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-[1.8rem] overflow-hidden border border-white shadow-[0_0_60px_-10px_rgba(0,87,255,0.45)] bg-cyan-50">
                <img
                  src="/images/new/store-island.webp"
                  alt="متجرك"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* الحبوب المدارية */}
            {orbit.map((o, i) => (
              <span
                key={i}
                className={`absolute ${o.pos} inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-white/90 backdrop-blur px-3.5 py-1.5 text-[13px] font-bold text-slate-800 shadow-md shadow-cyan-500/10 whitespace-nowrap`}
              >
                {o.label}
                <o.icon className="w-4 h-4 text-cyan-600" />
              </span>
            ))}
          </div>

          {/* حلولنا تشمل — شمال في الديسكتوب */}
          <div className="order-3">
            <div className="mx-auto lg:mx-0 max-w-[320px] rounded-[2rem] border border-cyan-100 bg-white shadow-xl shadow-cyan-100/70 p-7 md:p-8 text-center">
              <h4 className="text-slate-900 font-black text-lg md:text-xl mb-5">حلولنا تشمل</h4>
              <ul className="space-y-3.5">
                {list.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-center lg:justify-start gap-2.5 text-slate-600 text-sm md:text-[15px]"
                  >
                    <span className="w-6 h-6 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-cyan-700" strokeWidth={3} />
                    </span>
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ShopTypes() {
  const types = [
    { title: 'التجزئة', desc: 'كل رف له قصة', img: '/images/new/type-retail.png' },
    { title: 'الملابس', desc: 'من المخزن لحد العميل', img: '/images/new/type-fashion.png' },
    { title: 'المطاعم', desc: 'طلبات أكتر، فوضى أقل', img: '/images/new/type-restaurant.png' },
    {
      title: 'السوبر ماركت',
      desc: 'آلاف المنتجات وإدارة أبسط',
      img: '/images/new/type-supermarket.png',
    },
    { title: 'الفروع', desc: 'كل فروعك في مكان واحد', img: '/images/new/type-branches.png' },
    { title: 'الشركات', desc: 'إدارة أكثر احترافية', img: '/images/new/type-enterprise.png' },
  ];

  return (
    <section dir="rtl" className="relative overflow-hidden bg-white py-16 md:py-24">
      {/* توهج علوي خفيف */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[720px] h-[320px] rounded-full bg-white/60 blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-10 md:mb-14">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/70 px-4 py-1.5 text-xs md:text-sm font-bold text-cyan-700">
              <Store className="w-3.5 h-3.5" />
              لكل نشاط حله
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.4]">
            مصممة لكل أنواع التجارة
          </h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base md:text-lg">
            من المحلات الصغيرة إلى الشركات الكبيرة، حلول تناسب كل نشاط.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
          {types.map((t, i) => (
            <div
              key={i}
              className="group rounded-[2rem] border border-slate-100 bg-white p-3 pb-5 text-center shadow-[0_10px_40px_-15px_rgba(100,116,139,0.15)] hover:shadow-[0_20px_50px_-15px_rgba(0,87,255,0.22)] hover:border-cyan-200 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="rounded-[1.5rem] bg-white overflow-hidden aspect-square flex items-center justify-center">
                <img
                  src={t.img}
                  alt={t.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <h3 className="mt-4 font-black text-slate-900 text-sm md:text-base">{t.title}</h3>
              <p className="mt-1 text-slate-500 text-[11px] md:text-xs leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BeforeAfter() {
  const before = [
    'دفاتر وورق وكشوف مبعثرة',
    'مش عارف المخزون خلص إمتى',
    'أرقام المبيعات متأخرة يوم أو اتنين',
    'كل فرع بيشتغل لوحده',
  ];
  const after = [
    'كل حاجة مسجلة في مكان واحد',
    'المخزون يتحدث مع كل عملية بيع',
    'المبيعات قدامك أول بأول',
    'الفروع كلها تحت عينك',
  ];

  return (
    <section dir="rtl" className="relative overflow-hidden bg-white py-16 md:py-24">
      {/* توهج أزرق خفيف */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[480px] rounded-full bg-white/50 blur-[110px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-10 md:mb-14">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/70 px-4 py-1.5 text-xs md:text-sm font-bold text-cyan-700">
              <Zap className="w-3.5 h-3.5" />
              الفرق واضح
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.4]">
            الفرق اللي هتحسه من أول أسبوع
          </h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base md:text-lg">
            نفس المحل.. بس بطريقة إدارة مختلفة تمامًا.
          </p>
        </div>

        <div className="relative flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-0">
          {/* كارت بعد */}
          <div className="flex-1 rounded-[2rem] bg-white border border-cyan-100 shadow-[0_20px_60px_-20px_rgba(0,87,255,0.25)] p-6 md:p-10 md:ml-10">
            <div className="text-[#0057FF] font-black text-sm md:text-base mb-5">بعد</div>
            <ul className="space-y-4 md:space-y-5">
              {after.map((t, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-green-50 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-500" strokeWidth={3} />
                  </span>
                  <span className="font-bold text-slate-900 text-sm md:text-lg">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* زر التحويل */}
          <div className="flex md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 items-center justify-center z-10">
            <span className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#0057FF] shadow-lg shadow-blue-500/40 flex items-center justify-center rotate-90 md:rotate-0">
              <ArrowLeft className="w-6 h-6 text-white rotate-180" />
            </span>
          </div>

          {/* كارت قبل */}
          <div className="flex-1 rounded-[2rem] bg-white border border-slate-100 p-6 md:p-10 md:mr-10">
            <div className="text-slate-700 font-black text-sm md:text-base mb-5">قبل</div>
            <ul className="space-y-4 md:space-y-5">
              {before.map((t, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
                    <span className="text-red-500 font-black text-sm leading-none">×</span>
                  </span>
                  <span className="text-slate-500 text-sm md:text-lg">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function MahallyShowcase() {
  // تسويق تطبيق «من مكانك» لسه مش منشور — مخفي في الإنتاج (شغال في اللوكل).
  if (!MEN_MAKANAK_LIVE) return null;
  const points = [
    { icon: Navigation, text: 'متجرك يظهر للي حواليك على الخريطة — أول ما يدوروا يلاقوك.' },
    { icon: Zap, text: 'عروضك ومنتجاتك توصل لعملاء جاهزين يشتروا النهارده.' },
    { icon: TrendingUp, text: 'كل زيارة من التطبيق بتتحول لعملية بيع في متجرك.' },
    { icon: Store, text: 'اربط فروعك ومخزونك — والعميل يوصلك من أقرب فرع.' },
  ];

  return (
    <section dir="rtl" className="relative overflow-hidden bg-white pb-16 md:pb-24 pt-0">
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 px-6 py-8 md:p-10">
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            {/* النص */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-14 h-14 rounded-2xl bg-white border border-sky-100 shadow-lg shadow-sky-500/20 flex items-center justify-center overflow-hidden p-1.5">
                  <img
                    src="/brand/logo.png"
                    alt="من مكانك"
                    className="w-full h-full object-contain"
                  />
                </span>
                <span className="leading-tight">
                  <span className="block font-black text-2xl text-slate-900">من مكانك</span>
                  <span className="block font-bold text-sm text-sky-600 -mt-0.5" dir="ltr">
                    men makanak
                  </span>
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-[1.5]">
                العملاء اللي حواليك.. <span className="text-sky-600">بقوا عملاءك</span>
              </h2>
              <p className="mt-3 text-slate-500 text-sm sm:text-base leading-relaxed">
                «من مكانك» يوصّل متجرك لعملاء حواليك مستعدين يشتروا — يشوفوك على الخريطة، يتصفحوا
                منتجاتك، ويوصلوا لباب محلك.
              </p>

              <ul className="mt-6 space-y-4">
                {points.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 justify-start">
                    <span className="shrink-0 w-10 h-10 rounded-xl bg-white border border-sky-100 shadow-sm flex items-center justify-center">
                      <p.icon className="w-5 h-5 text-sky-600" />
                    </span>
                    <span className="font-bold text-slate-800 text-sm sm:text-base leading-relaxed">
                      {p.text}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-4">
                <span className="relative flex items-center gap-3 rounded-xl bg-white text-slate-900 px-6 py-3.5 border border-slate-200 border-b-4 border-b-[#00CFFF] shadow-sm cursor-not-allowed select-none overflow-visible">
                  <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-l from-sky-500 to-cyan-400 text-white text-[10px] font-black px-2.5 py-0.5 shadow">
                    قريبًا
                  </span>
                  <span className="leading-tight text-right">
                    <span className="block text-[11px] text-slate-500">حمّل التطبيق من</span>
                    <span className="block font-black text-lg">متجر أبل ستور</span>
                  </span>
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-slate-900" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.87 3.03-.83 1.32.11 2.31.63 2.97 1.57-2.73 1.63-2.28 5.21.45 6.21-.5 1.31-1.14 2.61-2.53 3.22zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                </span>
                <span className="relative flex items-center gap-3 rounded-xl bg-white text-slate-900 px-6 py-3.5 border border-slate-200 border-b-4 border-b-[#00CFFF] shadow-sm cursor-not-allowed select-none overflow-visible">
                  <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-l from-sky-500 to-cyan-400 text-white text-[10px] font-black px-2.5 py-0.5 shadow">
                    قريبًا
                  </span>
                  <span className="leading-tight text-right">
                    <span className="block text-[11px] text-slate-500">حمّل التطبيق من</span>
                    <span className="block font-black text-lg">متجر جوجل بلاي</span>
                  </span>
                  <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden="true">
                    <path
                      fill="#00A0FF"
                      d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2l-.1.1z"
                    />
                    <path
                      fill="#FFCE00"
                      d="m16.9 8.5-3.9 3.9L3.6 21.7c.4.4 1 .4 1.6.1l11.7-6.6c.8-.5.8-1.2 0-1.7L16.9 8.5z"
                      opacity=".9"
                    />
                    <path
                      fill="#FF3A44"
                      d="m16.9 8.5 2.3 1.3c.8.5.8 1.2 0 1.7l-2.3 1.3-3.9-3.9 3.9-3.9 3.9 3.5z"
                      opacity=".85"
                    />
                    <path
                      fill="#00F076"
                      d="m13 12.4-9.4 9.3c.3.3.8.4 1.4.2l11.7-6.6-3.7-2.9z"
                      opacity=".85"
                    />
                    <path
                      fill="#00A0FF"
                      d="M13 12.4 4.9 4.1c-.6-.2-1.1-.1-1.4.2L13 12.4z"
                      opacity=".6"
                    />
                  </svg>
                </span>
              </div>
            </div>

            {/* الموبايل — لازق في آخر الشمال */}
            <div className="relative flex justify-center md:justify-end md:pl-0 md:-ml-10">
              <img
                src="/images/new/men-makanak-app.png"
                alt="تطبيق من مكانك"
                className="w-[280px] sm:w-[320px] md:w-[360px] rounded-[2.2rem] border-[6px] border-slate-900 shadow-[0_30px_60px_-20px_rgba(2,132,199,0.35)] object-cover bg-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <div className="relative z-20 bg-white">
      <section className="relative sticky top-0 min-h-[70vh] md:min-h-screen flex items-center py-12 md:py-32 overflow-hidden">
        <div className="hidden md:block absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-500/5 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-6 relative w-full">
          <RevealSection className="text-center mb-12 md:mb-20">
            <div className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/70 px-4 py-1.5 text-xs md:text-sm font-bold text-cyan-700">
                <Sparkles className="w-3.5 h-3.5" />
                ابدأ في دقائق
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              ثلاث خطوات فقط
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">من الفكرة إلى البيع في دقائق</p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
            <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
            {steps.map((step, i) => (
              <RevealSection key={i} delay={i * 120} className="text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white border border-slate-200 mb-6 mx-auto transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-slate-200/50 hover:border-cyan-300">
                  <step.icon className="w-7 h-7 md:w-8 md:h-8 text-cyan-600" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-cyan-500 text-white text-xs font-black flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
