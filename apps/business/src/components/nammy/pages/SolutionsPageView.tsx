'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  Package, 
  Users, 
  Truck, 
  Globe,
  Receipt,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { Language } from '@/nammy/types';

interface SolutionsPageViewProps {
  lang: Language;
  onOpenDemo: (ctx?: string) => void;
}

export const SolutionsPageView: React.FC<SolutionsPageViewProps> = ({ lang, onOpenDemo }) => {
  const isAr = lang === 'ar';
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState<number>(0);

  const storePillars = isAr
    ? ['المبيعات والكاشير', 'المخزون والرف', 'الفوترة الإلكترونية ETA', 'الشحن والدفع', 'إدارة العملاء', 'الدومينات وصفحات البيع']
    : ['Sales POS', 'Inventory & Shelves', 'ETA E-Invoicing', 'Dispatch & Pay', 'CRM & Loyalty', 'Domains & Storefronts'];

  const solutionsList = [
    {
      id: 'pos',
      title: isAr ? 'الكاشير وإدارة المبيعات' : 'Sales & Cloud POS',
      desc: isAr
        ? 'فواتير سحابية فائقة السرعة، كاشير يدعم وضع Offline عند انقطاع الإنترنت، ومتابعة دقيقة لكل قرش وإيراد في متجرك وفروعك.'
        : 'Instant invoicing, offline-ready cloud POS, and precision cash tracking across all branches.',
      icon: BarChart3,
      iconColor: 'text-emerald-500 group-hover:text-emerald-600',
      highlights: isAr ? [
        'إصدار الفاتورة بلمسة واحدة في أقل من 3 ثوانٍ',
        'يعمل بدون إنترنت وتزامن تلقائي فور عودة الشبكة',
        'دعم كل أنواع طابعات البلوتوث والـ USB والشبكة',
      ] : [
        'One-touch checkout under 3 seconds',
        'Full offline mode with automatic cloud sync',
        'Works with all thermal receipt printers and cash drawers',
      ],
    },
    {
      id: 'inventory',
      title: isAr ? 'المخزون وحركة الرف' : 'Inventory & Stock Velocity',
      desc: isAr
        ? 'المخزون يتحدث تلقائياً مع كل عملية بيع في الفرع أو المتجر، مع تنبيهات مسبقة قبل نفاد أي صنف من الرف.'
        : 'Automated inventory depletion per transaction, with proactive restock threshold alerts.',
      icon: Package,
      iconColor: 'text-amber-500 group-hover:text-amber-600',
      highlights: isAr ? [
        'خصم فوري من المخزن بمجرد مسح الباركود على الكاشير',
        'تنبيهات نواقص قبل نفاد الصنف لتفادي ضياع المبيعات',
        'تحويل سريع للبضائع بين الفروع والمستودعات المركزية',
      ] : [
        'Instant stock deduction on cashier barcode scan',
        'Proactive restock threshold notifications',
        'Seamless stock transfers between store branches',
      ],
    },
    {
      id: 'eta-tax',
      title: isAr ? 'الفوترة الإلكترونية المصرية (ETA)' : 'ETA Tax Invoicing & E-Receipts',
      desc: isAr
        ? 'منظومة معتمدة ومتوافقة بالكامل مع مصلحة الضرائب المصرية لمنظومتي الفاتورة والإيصال الإلكتروني مع باركود QR المشفر.'
        : 'Fully compliant with Egyptian Tax Authority (ETA) e-invoicing and e-receipts with official QR barcodes.',
      icon: Receipt,
      iconColor: 'text-indigo-600 group-hover:text-indigo-700',
      highlights: isAr ? [
        'توليد رمز الاستجابة السريع QR المشفر تلقائياً في كل إيصال',
        'ربط مباشر مع البورتال الرسمي لمصلحة الضرائب المصرية',
        'أرشفة سحابية مشفرة لكافة السجلات المالية والضريبية',
      ] : [
        'Automated encrypted QR code generation on receipts',
        'Direct certified gateway connection to ETA portal',
        'Encrypted archiving of all statutory financial audits',
      ],
    },
    {
      id: 'logistics',
      title: isAr ? 'الشحن والمدفوعات المصرية' : 'Logistics & Egyptian Gateways',
      desc: isAr
        ? 'ربط مباشر مع كبرى شركات الشحن والتوصيل في جميع المحافظات، مع قبول فوري لـ (إنستاباي، فوري، فودافون كاش ومحافظ المحمول، وميزة).'
        : 'Integrated with Egyptian courier fleets, Fawry, InstaPay, Vodafone Cash, Meeza, and Cash on Delivery.',
      icon: Truck,
      iconColor: 'text-sky-500 group-hover:text-sky-600',
      highlights: isAr ? [
        'تسوية فورية للمدفوعات الرقمية بدون تأخير',
        'طباعة بوالص الشحن السريع للمحافظات بنقرة واحدة',
        'متابعة تحصيل أموال الدفع عند الاستلام (COD) مع شركات الشحن',
      ] : [
        'Instant digital payment settlements with zero lag',
        '1-click express shipping airway bill printing',
        'Automated cash on delivery (COD) courier reconciliation',
      ],
    },
    {
      id: 'crm',
      title: isAr ? 'إدارة العملاء والولاء' : 'Customer Loyalty & CRM',
      desc: isAr
        ? 'سجل كامل لكل عميل، تاريخ مشترياته، وبرامج ولاء ورسائل ترويجية عبر واتساب تحفزه للشراء المتكرر.'
        : 'Rich client purchase histories, loyalty point engines, and automated re-engagement notifications.',
      icon: Users,
      iconColor: 'text-violet-600 group-hover:text-violet-700',
      highlights: isAr ? [
        'سجل مشتريات وتفضيلات العميل برقم الموبايل',
        'برنامج نقاط ومكافآت ذكي يشجع على تكرار الزيارة',
        'حملات رسائل وعروض مستهدفة عبر واتساب والرسائل القصيرة',
      ] : [
        'Customer purchase logs tied to mobile phone numbers',
        'Smart loyalty points engine driving repeat store visits',
        'Targeted WhatsApp and SMS broadcast campaigns',
      ],
    },
    {
      id: 'storefront',
      title: isAr ? 'صفحات البيع والدومينات' : 'Landing Pages & Custom Domains',
      desc: isAr
        ? 'صمم واجهات متجرك بدومين خاص يعكس هويتك، وصفحات هبوط سريعة للموبايل مخصصة لكل حملة أو منتج مميز.'
        : 'Deploy branded custom domain storefronts and high-converting single product drops.',
      icon: Globe,
      iconColor: 'text-rose-500 group-hover:text-rose-600',
      highlights: isAr ? [
        'ربط دومينك الخاص (yourbrand.com) بسهولة وبدون تعقيد',
        'صفحات بيع سريعة للموبايل تزيد معدل التحويل',
        'تعديل فوري للأسعار والصور من نفس لوحة تحكم المحل',
      ] : [
        'Connect custom domains easily with zero DNS headache',
        'Ultra-fast mobile landing pages boosting conversions',
        'Synchronize prices & pictures directly from POS catalog',
      ],
    },
  ];

  const currentSol = solutionsList[selectedSolutionIndex] || solutionsList[0];

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      
      {/* Header Statement */}
      <div className="text-start space-y-3">
        <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
          {isAr ? 'منظومة واحدة متصلة' : 'Connected Architecture'}
        </span>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          {isAr ? (
            <>
              إنت شايف{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                عملية بيع
              </span>
              .. <br />
              إحنا شايفين{' '}
              <span className="bg-violet-100 text-violet-950 px-2 py-0.5 rounded-lg border-b-2 border-violet-400 inline-block">
                تجارتك كلها.
              </span>
            </>
          ) : (
            <>
              You see an{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                isolated sale
              </span>
              .. <br />
              We see your{' '}
              <span className="bg-violet-100 text-violet-950 px-2 py-0.5 rounded-lg border-b-2 border-violet-400 inline-block">
                entire commerce.
              </span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base text-slate-700 max-w-2xl font-medium leading-relaxed">
          {isAr
            ? 'نربط كل أدوات تجارتك في منظومة واحدة. كل فاتورة، كل منتج، كل حركة في المخزون، والفوترة الضريبية.. بتتحول لبيانات واضحة تساعدك تكبر وتدير أسهل.'
            : 'We unite every physical and digital channel into one cohesive operational cockpit. Every receipt, SKU depletion, and customer reorder becomes actionable clarity.'}
        </p>

        {/* Store Pillars Row */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs mt-4">
          <span className="text-xs font-black text-slate-500 block mb-2">
            {isAr ? 'أدوات متجرك المترابطة:' : 'Unified Store Modules:'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {storePillars.map((pillar, idx) => (
              <span key={idx} className="px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
                ✓ {pillar}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Solutions Detailed Grid */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="text-start space-y-1">
          <span className="text-xs font-black text-violet-600 uppercase tracking-wider">
            {isAr ? 'حلولنا تشمل' : 'Comprehensive Capabilities'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            {isAr ? 'أدوات متكاملة تدير كل شريان في تجارتك' : 'Core Tools Powering Real Retail'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {solutionsList.map((sol, idx) => {
            const Icon = sol.icon;
            const isSelected = selectedSolutionIndex === idx;
            return (
              <div 
                key={sol.id}
                onClick={() => setSelectedSolutionIndex(idx)}
                className={`group p-5 rounded-2xl bg-white border transition-all duration-200 text-start cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected 
                    ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20' 
                    : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="pt-1 mb-2">
                    <Icon 
                      size={28} 
                      strokeWidth={2} 
                      className={`${sol.iconColor} transition-transform duration-200 group-hover:scale-110`} 
                    />
                  </div>
                  <h3 className="font-black text-base text-slate-900 group-hover:text-amber-600 transition-colors">
                    {sol.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    {sol.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-amber-600">
                  <span>{isAr ? 'عرض مميزات الأداة' : 'View Module Specs'}</span>
                  <ArrowLeft size={12} className="rtl:inline-block ltr:rotate-180" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Detail Inspector for the Selected Solution */}
      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-start space-y-4 shadow-sm animate-in fade-in duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              ✓
            </span>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900">
                {currentSol.title}
              </h3>
              <span className="text-[11px] text-slate-500 font-bold">
                {isAr ? 'تفاصيل الميزات والتشغيل في مصر' : 'Operational specs & integrations'}
              </span>
            </div>
          </div>

          <button
            onClick={() => onOpenDemo(`${isAr ? 'تجربة أداة' : 'Demo for'} ${currentSol.title}`)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            {isAr ? 'ابدأ تجربة هذه الأداة' : 'Test This Tool'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {currentSol.highlights.map((h, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs">
                <CheckCircle2 size={15} />
                <span>{isAr ? `ميزة #${i + 1}` : `Feature #${i + 1}`}</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 leading-snug">
                {h}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Final Human CTA Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-start shadow-md">
        <div className="space-y-1">
          <h3 className="font-black text-base sm:text-lg">
            {isAr ? 'جاهز تربط تجارتك في منظومة واحدة؟' : 'Ready to streamline your stores?'}
          </h3>
          <p className="text-xs text-slate-300">
            {isAr ? 'ابدأ الآن مجاناً وانسَ الدفاتر واللخبطة نهائياً.' : 'Start free today and leave scattered workbooks behind.'}
          </p>
        </div>

        <button
          onClick={() => onOpenDemo(isAr ? 'طلب تجربة الحلول' : 'Solutions Walkthrough')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer active:scale-95"
        >
          {isAr ? 'ابدأ تجربتك المجانية' : 'Start Free Trial'}
        </button>
      </div>

    </div>
  );
};
