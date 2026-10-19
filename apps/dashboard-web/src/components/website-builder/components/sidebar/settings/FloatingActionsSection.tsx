import React from 'react';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useBuilder } from '../../../context/BuilderContext';
import type { WebsiteSettings } from '../../../types/builder';

interface FloatingActionsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: WebsiteSettings;
}

export const FloatingActionsSection: React.FC<FloatingActionsSectionProps> = ({
  isOpen,
  onToggle,
  settings,
}) => {
  const { updateWebsiteSettings } = useBuilder();

  const floating = settings.floatingActions || {
    whatsappButton: false,
    whatsappNumber: '',
    welcomeMessage: '',
    stickyMobileBottomBar: false,
  };

  return (
    <div className="p-3.5 space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-right cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              الواتساب وتجربة الموبايل
            </span>
            <p className="text-[10px] text-slate-400">
              زر الواتساب العائم والشريط السفلي للهواتف
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="pt-2 space-y-3.5 border-t border-slate-100 text-xs text-slate-700 animate-in fade-in duration-150">
          {/* WhatsApp Floating Button */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 block text-[11px]">
                زر واتساب عائم أسفل الشاشة
              </span>
              <span className="text-[10px] text-slate-500 block">
                محادثة مباشرة بنقرة واحدة من أي صفحة
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={floating.whatsappButton}
                onChange={(e) =>
                  updateWebsiteSettings({
                    floatingActions: {
                      ...floating,
                      whatsappButton: e.target.checked,
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {floating.whatsappButton && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رقم الواتساب (مع كود الدولة)
                </label>
                <input
                  type="text"
                  value={floating.whatsappNumber || ''}
                  onChange={(e) =>
                    updateWebsiteSettings({
                      floatingActions: {
                        ...floating,
                        whatsappNumber: e.target.value,
                      },
                    })
                  }
                  placeholder="201012345678"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden dir-ltr text-left"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رسالة الترحيب المسبقة
                </label>
                <input
                  type="text"
                  value={floating.welcomeMessage || ''}
                  onChange={(e) =>
                    updateWebsiteSettings({
                      floatingActions: {
                        ...floating,
                        welcomeMessage: e.target.value,
                      },
                    })
                  }
                  placeholder="مرحباً، أود الاستفسار عن تفاصيل الخدمات"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Sticky Mobile Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 block text-[11px]">
                شريط إجراءات سفلي ثابت للموبايل
              </span>
              <span className="text-[10px] text-slate-500 block">
                أزرار (اتصال، واتساب، السلة) سريعة بالهواتف
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={floating.stickyMobileBottomBar}
                onChange={(e) =>
                  updateWebsiteSettings({
                    floatingActions: {
                      ...floating,
                      stickyMobileBottomBar: e.target.checked,
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
