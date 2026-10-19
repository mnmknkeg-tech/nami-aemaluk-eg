'use client';

import Link from 'next/link';
import Image from 'next/image';
import { businessBrand } from '@/lib/brand';
import {
  TrendingUp,
  ArrowLeft,
  Zap,
  ShoppingCart,
  BarChart3,
  Palette,
  Shield,
  Smartphone,
  Package,
  Send,
  Heart,
  Building2,
  MessageSquare,
  Bell,
  Headphones,
  Rocket,
  Target,
  Award,
  Layers,
  Code2,
  Image as ImageIcon,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { RevealSection } from '@/lib/hooks';
import { HIDE_UNPUBLISHED } from '@/lib/moduleConfig';
import FooterVideoBackground from '@/components/FooterVideoBackground';
import { industries } from '@/lib/siteData';

/**
 * Market-launch switch: marketing blocks must never advertise sections that are
 * local-only (finance + accounting + HR + analytics + AI), so entries flagged
 * `localOnly` are stripped from the public page in production builds.
 */
function visibleMarketingItems<T extends { localOnly?: boolean }>(items: T[]): T[] {
  return HIDE_UNPUBLISHED ? items.filter((item) => !item.localOnly) : items;
}

const growthPoints = [
  { icon: Target, title: 'وصول أوسع', desc: 'اجعل متجرك متاحاً للجميع على الإنترنت وفوق الخريطة.' },
  // Market-launch switch: analytics is local-only for now.
  { icon: Zap, title: 'قرارات أذكى', desc: 'تحليلات تساعدك على فهم ما يحبه عملاؤك ومتى يشترون.', localOnly: true },
  {
    icon: Award,
    title: 'ولاء العملاء',
    desc: 'احتفظ ببيانات عملائك وقدم لهم عروضاً مخصصة لزيادة عودتهم.',
  },
  {
    icon: Layers,
    title: 'توسعة مستمرة',
    desc: 'أدوات قابلة للتوسع مع نمو أعمالك — من منتج واحد إلى آلاف.',
  },
];

export function IndustriesSection() {
  return (
    <section id="industries" className="relative z-20 bg-white py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <RevealSection className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-sm font-bold mb-6">
            <Building2 className="w-4 h-4" />
            متجرك لأي نشاط
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            متجرك لأي نشاط
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            المنصة تتكيف مع نوع نشاطك التجاري — من المطاعم إلى العيادات إلى العقارات
          </p>
        </RevealSection>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {industries.map((industry, i) => (
            <RevealSection
              key={i}
              delay={i * 50}
              className="group flex flex-col items-center justify-center gap-3 p-5 md:p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-cyan-50 transition-colors duration-300">
                <industry.icon className="w-5 h-5 text-slate-500 group-hover:text-cyan-600 transition-colors duration-300" />
              </div>
              <span className="text-slate-600 text-xs md:text-sm font-medium text-center group-hover:text-slate-900 transition-colors">
                {industry.label}
              </span>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GrowthSection() {
  return (
    <section className="relative z-20 bg-white py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <RevealSection>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-sm font-bold mb-6">
                <TrendingUp className="w-4 h-4" />
                لا تكتفِ بالإدارة — انطلق نحو النمو
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
                لا تكتفِ بالإدارة — انطلق نحو النمو
              </h2>
              <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                نوفر لك الأدوات والبيانات اللازمة لاتخاذ قرارات أذكى وتوسيع قاعدة عملائك.
              </p>
            </RevealSection>
            <div className="space-y-4">
              {visibleMarketingItems(growthPoints).map((point, i) => (
                <RevealSection
                  key={i}
                  delay={i * 80}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <point.icon className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1">{point.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{point.desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
          <RevealSection delay={200}>
            <GrowthChartMockup />
          </RevealSection>
        </div>
      </div>
    </section>
  );
}

function GrowthChartMockup() {
  return (
    <div className="relative rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-400 text-sm mb-1">نمو الإيرادات</p>
          <p className="text-slate-900 font-black text-2xl md:text-3xl">
            248% <span className="text-emerald-500 text-sm font-bold">↑</span>
          </p>
        </div>
        <div className="flex gap-2">
          {['7د', '30د', '90د'].map((label, i) => (
            <div
              key={i}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                i === 1 ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-48 md:h-64">
        <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[40, 80, 120, 160].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="400"
              y2={y}
              stroke="rgba(15,23,42,0.05)"
              strokeWidth="1"
            />
          ))}
          <path
            d="M0,180 L40,160 L80,140 L120,100 L160,120 L200,80 L240,60 L280,40 L320,50 L360,20 L400,10 L400,200 L0,200 Z"
            fill="url(#growthGradient)"
          />
          <path
            d="M0,180 L40,160 L80,140 L120,100 L160,120 L200,80 L240,60 L280,40 L320,50 L360,20 L400,10"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="400" cy="10" r="4" fill="#06b6d4" />
          <circle cx="400" cy="10" r="8" fill="#06b6d4" opacity="0.2" />
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
        {[
          { label: 'الإيرادات', value: '48.2K', change: '+18%' },
          { label: 'الطلبات', value: '1,240', change: '+24%' },
          { label: 'العملاء', value: '892', change: '+12%' },
        ].map((stat, i) => (
          <div key={i}>
            <p className="text-slate-400 text-xs mb-1">{stat.label}</p>
            <p className="text-slate-900 font-bold text-base md:text-lg">{stat.value}</p>
            <p className="text-emerald-500 text-xs font-bold">{stat.change}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AboutSection2() {
  return (
    <section className="relative z-20 bg-white py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <RevealSection>
            <div className="relative">
              <div
                className="absolute inset-0 rounded-3xl opacity-[0.07]"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.5) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                }}
              />
              <div className="relative rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="w-3 h-3 rounded-full bg-red-400/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  <div className="flex-1 mx-3 h-6 rounded-md bg-slate-100 flex items-center px-3">
                    <span className="text-slate-400 text-xs font-mono">mnmknk.com</span>
                  </div>
                </div>
                <div className="p-6 md:p-8 space-y-4">
                  <div className="h-8 w-3/4 rounded-lg bg-slate-200 bl-anim-shimmer" />
                  <div className="h-4 w-full rounded-md bg-slate-100" />
                  <div className="h-4 w-5/6 rounded-md bg-slate-100" />
                  <div className="flex gap-3 pt-2">
                    <div className="h-10 w-32 rounded-xl bg-cyan-100" />
                    <div className="h-10 w-28 rounded-xl bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-4">
                    <div className="h-20 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-slate-100" />
                    <div className="h-20 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-slate-100" />
                    <div className="h-20 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border border-slate-100" />
                  </div>
                </div>
              </div>
              <div className="hidden md:block absolute -bottom-8 -left-8 w-40 lg:w-48 aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-2xl bl-anim-float-slow">
                <img
                  src="/images/about/owner-photo.jpg"
                  alt="أحد أصحاب الأعمال على منصتنا"
                  className="absolute inset-0 w-full h-full object-cover bl-ken-burns"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fb) fb.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 items-center justify-center bg-gradient-to-br from-cyan-100 to-violet-100">
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                </div>
              </div>
            </div>
          </RevealSection>
          <div>
            <RevealSection>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
                نبني مستقبل التجارة الرقمية
              </h2>
              <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                منصة عربية متكاملة تمكّن التجار من إدارة أعمالهم بسهولة واحترافية. نؤمن أن كل تاجر
                يستحق أدوات عالمية بلغته وبسعر يناسبه.
              </p>
            </RevealSection>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Code2, title: 'منصة عربية', desc: 'مصممة خصيصاً للسوق العربي' },
                { icon: Shield, title: 'أمان عالمي', desc: 'تشفير وحماية بمعايير عالمية' },
                { icon: Rocket, title: 'انطلاق سريع', desc: 'ابدأ البيع في دقائق' },
                { icon: Headphones, title: 'دعم متواصل', desc: 'فريق دعم متاح على مدار الساعة' },
              ].map((item, i) => (
                <RevealSection
                  key={i}
                  delay={i * 80}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <item.icon className="w-6 h-6 text-cyan-600 mb-3" />
                  <h3 className="text-slate-900 font-bold text-sm mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                </RevealSection>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductsSection() {
  return (
    <section id="products" className="relative z-20 bg-white py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <RevealSection className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-sm font-bold mb-6">
            <Package className="w-4 h-4" />
            منتجاتنا
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            منتجاتنا
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            كل ما تحتاجه لإدارة وتنمية نشاطك التجاري
          </p>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {visibleMarketingItems([
            {
              icon: ShoppingCart,
              title: 'المتجر الإلكتروني',
              desc: 'متجر إلكتروني متكامل مع إدارة المنتجات والطلبات والمخزون',
              color: 'from-cyan-500 to-blue-500',
            },
            {
              icon: LayoutDashboard,
              title: 'لوحة التحكم',
              desc: 'لوحة تحكم شاملة لإدارة كل جوانب نشاطك من مكان واحد',
              color: 'from-violet-500 to-purple-500',
            },
            {
              icon: Palette,
              title: 'مصمم الصفحات',
              desc: 'أداة سحب وإفلات لتخصيص تصميم متجرك بدون برمجة',
              color: 'from-pink-500 to-rose-500',
            },
            {
              icon: BarChart3,
              title: 'التحليلات والتقارير',
              desc: 'تقارير مفصلة عن المبيعات والعملاء وأداء المتجر',
              color: 'from-amber-500 to-orange-500',
              // Market-launch switch: analytics is local-only for now.
              localOnly: true,
            },
            {
              icon: Smartphone,
              title: 'تطبيق الموبايل',
              desc: 'إدارة متجرك من أي مكان عبر تطبيق الموبايل',
              color: 'from-emerald-500 to-green-500',
            },
            {
              icon: Shield,
              title: 'الأمان والحماية',
              desc: 'حماية متقدمة لبياناتك وبيانات عملائك',
              color: 'from-slate-500 to-slate-600',
            },
          ]).map((product, i) => (
            <RevealSection key={i} delay={i * 80}>
              <div className="group relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 md:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:border-slate-300">
                <div
                  className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${product.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`}
                />
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${product.color} mb-5 shadow-lg`}
                >
                  <product.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
                  {product.title}
                </h3>
                <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                  {product.desc}
                </p>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="relative z-20 bg-white py-20 md:py-32">
      <div className="max-w-4xl mx-auto px-5 sm:px-6">
        <RevealSection className="text-center mb-12 md:mb-16">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/70 px-4 py-1.5 text-xs md:text-sm font-bold text-cyan-700">
              <MessageSquare className="w-3.5 h-3.5" />
              عندك سؤال؟
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            الأسئلة الشائعة
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            إجابات للأسئلة الأكثر شيوعاً حول منصتنا
          </p>
        </RevealSection>

        <div className="space-y-4">
          {[
            {
              q: 'كيف أبدأ في استخدام المنصة؟',
              a: 'ببساطة سجل حساباً مجانياً، اختر نشاطك التجاري، وابدأ في بناء متجرك في دقائق.',
            },
            {
              q: 'هل الدفع مجاني؟',
              a: 'نعم، يمكنك البدء مجاناً بدون أي التزامات. نقدم خطط مرنة تناسب جميع الأحجام.',
            },
            {
              q: 'هل يمكنني تخصيص تصميم متجري؟',
              a: 'بالتأكيد! نوفر مصمم صفحات ذكي يتيح لك تخصيص كل تفصيل في متجرك بسهولة.',
            },
            {
              q: 'هل تدعمون الدفع الإلكتروني؟',
              a: 'نعم، ندعم طرق دفع متعددة بما في ذلك البطاقات والمحافظ الإلكترونية.',
            },
            {
              q: 'كيف يمكنني الحصول على الدعم؟',
              a: 'فريق الدعم متاح 24/7 لمساعدتك عبر الدردشة أو البريد الإلكتروني.',
            },
          ].map((faq, i) => (
            <RevealSection key={i} delay={i * 80}>
              <div className="group rounded-2xl bg-white border border-slate-200 overflow-hidden hover:shadow-sm transition-all">
                <details className="group">
                  <summary className="flex items-center justify-between p-5 md:p-6 cursor-pointer list-none">
                    <span className="text-slate-900 font-bold text-sm md:text-base">{faq.q}</span>
                    <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-300" />
                  </summary>
                  <div className="px-5 md:px-6 pb-5 md:pb-6">
                    <p className="text-slate-500 text-sm md:text-base leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section dir="rtl" className="relative overflow-hidden bg-white">
      {/* سحاب زي الهيرو */}
      <span className="biz-cloud biz-cloud-top" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="biz-cloud biz-cloud-right" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* النص — يمين */}
          <div className="text-center md:text-right">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.5]">
              تجارتك تكبر على أرض الواقع..
              <br />
              <span className="text-[#0057FF]">وإحنا نكبرها معاك.</span>
            </h2>
            <p className="mt-4 text-slate-500 text-sm sm:text-base md:text-lg">جاهز تبدأ خطوتك؟</p>
            <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              {[
                { icon: Send, text: 'أدوات أقوى' },
                { icon: Heart, text: 'دعم حقيقي' },
                { icon: TrendingUp, text: 'نمو مستمر' },
              ].map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-100 shadow-sm text-slate-800 text-xs sm:text-sm font-bold"
                >
                  {p.text}
                  <p.icon className="w-4 h-4 text-[#0057FF]" />
                </span>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 bg-[#0057FF] hover:bg-[#0046CC] text-white px-10 py-4 rounded-full font-black text-base sm:text-lg shadow-lg shadow-blue-600/25 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                ابدأ الآن
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* الصورة — شمال */}
          <div className="relative">
            <div
              className="absolute -inset-4 bg-[#0057FF]/10 rounded-[2rem] blur-2xl"
              aria-hidden
            />
            <div className="relative">
              <img
                src="/images/new/cta-store.png"
                alt="متجر Bluora — تجارتك تكبر على أرض الواقع"
                loading="lazy"
                className="w-full h-auto object-contain drop-shadow-2xl"
                onError={(e) => {
                  // لو صورة المتجر لسه متحطتش — اعرض الصورة الموجودة مؤقتاً
                  const el = e.target as HTMLImageElement;
                  if (!el.src.includes('store-island')) el.src = '/images/new/store-island.webp';
                  else el.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative z-20">
      <FooterVideoBackground className="pt-20 md:pt-32 pb-8">
        {/* ── Footer links ── */}
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden">
                  <Image
                    src={businessBrand.logo}
                    alt={businessBrand.name}
                    width={28}
                    height={28}
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <span className="text-white font-black text-lg">{businessBrand.name}</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4 max-w-xs">
                منصة عربية متكاملة لإدارة وتنمية أعمالك التجارية.
              </p>
              <div className="flex gap-3">
                {[
                  { icon: MessageSquare, label: 'WhatsApp' },
                  { icon: Bell, label: 'Notifications' },
                  { icon: Headphones, label: 'Support' },
                ].map((social, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-slate-300 hover:text-[#00E5FF] hover:border-[#00E5FF]/50 hover:bg-white/15 transition-all duration-300 cursor-pointer"
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            {[
              {
                title: 'المنتج',
                links: [
                  { label: 'المميزات', href: '#features' },
                  { label: 'مصمم الصفحات', href: '#' },
                  { label: 'لوحة التحكم', href: '#' },
                ],
              },
              {
                title: 'الشركة',
                links: [
                  { label: 'من نحن', href: '#about' },
                  { label: 'تواصل معنا', href: '#' },
                  { label: 'المدونة', href: '#' },
                ],
              },
              {
                title: 'الدعم',
                links: [
                  { label: 'المساعدة', href: '#' },
                  { label: 'الخصوصية', href: '#' },
                  { label: 'الشروط', href: '#' },
                ],
              },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-white font-bold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a
                        href={link.href}
                        className="text-slate-400 text-sm hover:text-[#00E5FF] transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-xs sm:text-sm">
              © {new Date().getFullYear()} من مكانك. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-4 text-slate-400 text-xs">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                كل الأنظمة تعمل
              </span>
            </div>
          </div>
        </div>
      </FooterVideoBackground>
    </footer>
  );
}
