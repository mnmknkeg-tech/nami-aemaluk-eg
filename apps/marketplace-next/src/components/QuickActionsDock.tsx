'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Images, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';

/**
 * QuickActionsDock — منيوي دائري بـ 3 أزرار فقط (زي ما اتفقنا في نظام الأوضاع):
 *
 *   1. اطلب  → المنتجات اللي بتنطلب بالسعر والسلة (mode = products/menu)
 *   2. احجز  → الحجوزات والمواعيد (mode = booking)
 *   3. عرض   → الصور فقط / طلب عرض سعر (mode = request_quote)
 *
 * بيفتح بضغطة على زر الوسط في الفوتر السفلي للموبايل، ويقفل بـ X أو
 * الضغط خارج المنيو.
 */
export function QuickActionsDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { setCartOpen } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    } else {
      setMounted(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // 3 أزرار فقط — كل واحد بيعكس وضع تجاري من نظام "العوالم":
  //   اطلب = products (سعر + سلة)         → /offers (كل المنتجات اللي بتنطلب)
  //   احجز = booking (مواعيد)             → /activity/clinics (مثال على الحجز)
  //   عرض  = request_quote (صور/عرض سعر)  → /activity/furniture (مثال على "صور بس")
  const actions = [
    {
      key: 'order',
      label: 'اطلب',
      desc: 'منتجات بالسعر',
      icon: ShoppingBag,
      color: '#F97316',
      bg: '#FEF0DD',
      onClick: () => {
        onClose();
        router.push('/offers');
      },
    },
    {
      key: 'book',
      label: 'احجز',
      desc: 'حجوزات ومواعيد',
      icon: CalendarCheck,
      color: '#0284C7',
      bg: '#EFF6FF',
      onClick: () => {
        onClose();
        router.push('/activity/clinics');
      },
    },
    {
      key: 'view',
      label: 'عرض',
      desc: 'صور وطلب عرض سعر',
      icon: Images,
      color: '#7C3AED',
      bg: '#F5F3FF',
      onClick: () => {
        onClose();
        router.push('/activity/furniture');
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[110] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="إجراءات سريعة"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px] animate-fade-in"
        onClick={onClose}
      />

      {/* الـ dock نفسه — بيظهر من تحت لفوق، فوق الفوتر السفلي مباشرة */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 animate-fade-up">
        {/* رأس المنيو — زر الإغلاق */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-white/90 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-ping" />
            اختار طريقتك
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* شبكة الـ 3 أزرار الدائرية — أزرار أكبر شوية عشان 3 بس */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                className="group flex flex-col items-center gap-2 py-1 active:scale-95 transition-transform"
              >
                <span
                  className="relative w-16 h-16 rounded-full flex items-center justify-center ring-2 transition-all group-hover:scale-105"
                  style={{
                    backgroundColor: a.bg,
                    color: a.color,
                    boxShadow: `0 6px 18px -4px ${a.color}40`,
                  }}
                >
                  <Icon className="w-7 h-7" strokeWidth={2.2} />
                </span>
                <span className="text-[12px] font-black text-slate-800 dark:text-slate-100 leading-tight">
                  {a.label}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 leading-tight -mt-1 text-center">
                  {a.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook بسيط لإدارة فتح/إغلاق الـ dock — بيتبعن في الـ parent component.
 */
export function useQuickActions() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openDock: () => setOpen(true),
    closeDock: () => setOpen(false),
    toggle: () => setOpen((v) => !v),
    dock: <QuickActionsDock open={open} onClose={() => setOpen(false)} />,
  };
}

export { cn };
