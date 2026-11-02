'use client';

import React, { useState } from 'react';
import { Check, ArrowLeft } from 'lucide-react';
import { Language } from '@/nammy/types';
import { MEN_MAKANAK_LIVE } from '@/nammy/menMakanak';

interface PricingPageViewProps {
  lang: Language;
  onOpenDemo: (plan?: string) => void;
}

export const PricingPageView: React.FC<PricingPageViewProps> = ({ lang, onOpenDemo }) => {
  const [isAnnual, setIsAnnual] = useState(true);
  const isAr = lang === 'ar';

  const plans = isAr
    ? [
        {
          name: 'أول محل',
          badge: 'للمحلات والمتاجر الناشئة',
          priceMonthly: 450,
          priceAnnual: 360,
          desc: 'ابدأ صح من أول فاتورة، ونظّم كاشيرك ومخزنك من اليوم الأول.',
          color: 'border-slate-200',
          btnColor: 'bg-slate-900 hover:bg-slate-800 text-white',
          features: [
            'نقطة بيع سحابية واحدة سريعة (POS)',
            'متجر إلكتروني بهوية خاصة ودومين مجاني',
            'إدارة حتى 500 صنف مع متابعة حركة الرف',
            'ربط طرق الدفع (فوري، إنستاباي، فودافون كاش، ميزة)',
            ...(MEN_MAKANAK_LIVE ? ['تطبيق «من مكانك» لجلب زبائن منطقتك'] : []),
          ],
        },
        {
          name: 'تجارة بتتوسع',
          badge: 'الأكثر طلباً بين التجار',
          popular: true,
          priceMonthly: 890,
          priceAnnual: 710,
          desc: 'فروع أكتر، مخزون أكبر، عملاء أكتر.. وإدارة أسهل بكتير.',
          color: 'border-amber-500 shadow-xl ring-2 ring-amber-500/20',
          btnColor: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md',
          features: [
            'نقاط بيع سريعة مفتوحة لـ 3 فروع أو مخازن',
            'منتجات وأصناف غير محدودة في كافة الفروع',
            'ربط شركات الشحن والتوصيل المنزلي السريع',
            'حملات رسائل وعروض حصرية لعملاء من مكانك',
            'متوافق مع منظومة الفاتورة والإيصال الإلكتروني المصري (ETA)',
            'دعم فني واستشاري مخصص 24/7',
          ],
        },
        {
          name: 'سلاسل وشركات',
          badge: 'للأنشطة الكبيرة والفروع',
          priceMonthly: 2400,
          priceAnnual: 1920,
          desc: 'تحكّم في فروعك ومخازنك وحساباتك من شاشة واحدة بكل دقة.',
          color: 'border-slate-200',
          btnColor: 'bg-slate-900 hover:bg-slate-800 text-white',
          features: [
            'فروع وكاشيرات غير محدودة بجميع محافظات مصر',
            'تكامل كامل مع برامج الحسابات والـ ERP',
            'صلاحيات دقيقة لكل كاشير ومدير ومحاسب',
            'اتفاقية تشغيل معتمدة SLA بنسبة تشغيل 99.95%',
            'مدير حساب واستشارات دورية لتطوير المبيعات',
          ],
        },
      ]
    : [
        {
          name: 'First Store',
          badge: 'For Starter Shops',
          priceMonthly: 450,
          priceAnnual: 360,
          desc: 'Start clean from bill #1 and streamline your inventory from day one.',
          color: 'border-slate-200',
          btnColor: 'bg-slate-900 hover:bg-slate-800 text-white',
          features: [
            'Single high-speed cloud POS terminal',
            'Custom domain web store with rapid mobile checkout',
            'Up to 500 SKUs with live shelf tracking',
            'Direct gateways (Fawry, InstaPay, Mobile Wallets, Meeza)',
            ...(MEN_MAKANAK_LIVE ? ['Full Men Makanak local discovery integration'] : []),
          ],
        },
        {
          name: 'Expanding Retail',
          badge: 'Most Popular',
          popular: true,
          priceMonthly: 890,
          priceAnnual: 710,
          desc: 'More branches, broader catalog, larger clientele, yet simpler oversight.',
          color: 'border-amber-500 shadow-xl ring-2 ring-amber-500/20',
          btnColor: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md',
          features: [
            'Unlimited POS registers across 3 store locations',
            'Unlimited catalog items & multi-warehouse transfers',
            'Instant courier booking and local express dispatch',
            'Loyalty retention system and broadcast promo campaigns',
            'Egyptian Tax Authority (ETA) e-invoicing & e-receipt compliance',
            'Dedicated 24/7 priority merchant assistance',
          ],
        },
        {
          name: 'Enterprise Chain',
          badge: 'Multi-Store Chains',
          priceMonthly: 2400,
          priceAnnual: 1920,
          desc: 'Control operations, inventory vaults, and multi-tier finances from one hub.',
          color: 'border-slate-200',
          btnColor: 'bg-slate-900 hover:bg-slate-800 text-white',
          features: [
            'Unlimited branches nationwide across all governorates',
            'Custom ERP & enterprise accounting pipelines',
            'Granular role-based permissions per staff member',
            '99.95% high availability SLA guarantee',
            'Dedicated account director and quarterly growth audits',
          ],
        },
      ];

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-start space-y-3">
        <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
          {isAr ? 'الأسعار والخطط' : 'Pricing & Investment'}
        </span>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {isAr ? (
            <>
              استثمر في نمو تجارتك{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                بوضوح وبدون مصاريف خفية
              </span>
            </>
          ) : (
            <>
              Invest in your retail growth{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                with zero hidden fees
              </span>
            </>
          )}
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 font-medium">
          {isAr
            ? 'ابدأ مجاناً بدون أي التزامات — خطط مرنة تتطور معك خطوة بخطوة'
            : 'Start free with zero commitment — flexible tiers that scale alongside your volume'}
        </p>

        {/* Toggle */}
        <div className="mt-3 inline-flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              !isAnnual ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            {isAr ? 'دفع شهري' : 'Monthly'}
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              isAnnual ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            <span>{isAr ? 'دفع سنوي' : 'Annual Billing'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
              {isAr ? 'وفر 20%' : 'Save 20%'}
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p, idx) => {
          const price = isAnnual ? p.priceAnnual : p.priceMonthly;
          return (
            <div
              key={idx}
              className={`rounded-3xl p-6 bg-white border flex flex-col justify-between space-y-5 transition-all ${p.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-lg text-slate-900">{p.name}</h3>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      p.popular
                        ? 'bg-amber-100 text-amber-900 font-black'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-600 min-h-[32px] leading-relaxed">{p.desc}</p>

                <div className="my-4 pb-4 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 tabular-nums">{price}</span>
                    <span className="text-xs font-bold text-slate-500">
                      {isAr ? 'ج.م / شهر' : 'EGP / mo'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isAnnual
                      ? isAr
                        ? 'تُدفع سنوياً مع وفر شهرين مجاناً'
                        : 'Billed annually with 2 months free'
                      : isAr
                        ? 'تجديد شهري بدون التزام'
                        : 'Flexible monthly renewal'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {p.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onOpenDemo(`${isAr ? 'طلب اشتراك' : 'Plan'} ${p.name}`)}
                className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${p.btnColor}`}
              >
                <span>{isAr ? 'ابدأ الآن مجاناً' : 'Start 14-Day Trial'}</span>
                <ArrowLeft size={13} className="rtl:inline-block ltr:rotate-180" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
