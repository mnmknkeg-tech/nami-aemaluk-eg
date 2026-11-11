'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Eye, Share2, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';

/**
 * QuickActionsDock — منيوي دائري بـ 4 أزرار سريعة بيظهر فوق الفوتر السفلي.
 *
 * تصميمه مطابق للبروتوتايب اللي بعتو المستخدم:
 *   - احجز (Calendar)
 *   - اتفرج (Eye) → يفتح السلة
 *   - اشارك (Share)
 *   - اطلب (Bag) → يفتح السلة
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
      // اقفل الـ scroll على البودي لما المنيو يفتح
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    } else {
      setMounted(false);
    }
  }, [open]);

  // اقفل بـ Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const actions = [
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
      label: 'اتفرج',
      desc: 'تصفّح السلة',
      icon: Eye,
      color: '#7C3AED',
      bg: '#F5F3FF',
      onClick: () => {
        onClose();
        setCartOpen(true);
      },
    },
    {
      key: 'share',
      label: 'اشارك',
      desc: 'شارك التطبيق',
      icon: Share2,
      color: '#16A34A',
      bg: '#F0FDF4',
      onClick: async () => {
        onClose();
        try {
          if (navigator.share) {
            await navigator.share({
              title: 'من مكانك',
              text: 'كل حاجة من مكانك — تسوّق، منيو، حجوزات وخدمات',
              url: window.location.origin,
            });
          } else {
            await navigator.clipboard.writeText(window.location.origin);
          }
        } catch {}
      },
    },
    {
      key: 'order',
      label: 'اطلب',
      desc: 'السلة والدفع',
      icon: ShoppingBag,
      color: '#F97316',
      bg: '#FEF0DD',
      onClick: () => {
        onClose();
        setCartOpen(true);
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
            إجراءات سريعة
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

        {/* شبكة الـ 4 أزرار الدائرية */}
        <div className="grid grid-cols-4 gap-2.5 p-3 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                className="group flex flex-col items-center gap-1.5 py-1 active:scale-95 transition-transform"
              >
                <span
                  className="relative w-14 h-14 rounded-full flex items-center justify-center ring-2 transition-all group-hover:scale-105"
                  style={{
                    backgroundColor: a.bg,
                    color: a.color,
                    boxShadow: `0 6px 16px -4px ${a.color}40`,
                  }}
                >
                  <Icon className="w-6 h-6" strokeWidth={2.2} />
                </span>
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 leading-tight">
                  {a.label}
                </span>
                <span className="text-[8.5px] font-semibold text-slate-400 dark:text-slate-500 leading-tight -mt-1">
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
