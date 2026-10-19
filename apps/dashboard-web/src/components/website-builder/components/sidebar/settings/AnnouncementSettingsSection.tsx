import React from 'react';
import { Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { useBuilder } from '../../../context/BuilderContext';
import type { WebsiteSettings } from '../../../types/builder';

interface AnnouncementSettingsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: WebsiteSettings;
}

export const AnnouncementSettingsSection: React.FC<AnnouncementSettingsSectionProps> = ({
  isOpen,
  onToggle,
  settings,
}) => {
  const { updateWebsiteSettings } = useBuilder();

  const announcement = settings.announcement || {
    enabled: false,
    text: 'عروض حصرية لفترة محدودة ⚡ شحن مجاني لكافة الطلبات',
    link: '',
    bgColor: '#1d4ed8',
    textColor: '#ffffff',
  };

  return (
    <div className="p-3.5 space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-right cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              announcement.enabled ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">شريط الإعلانات العلوي</span>
              {announcement.enabled ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800">
                  مفعّل
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500">
                  معطّل
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              شريط ترويجي يظهر بأعلى الصفحة للإعلانات والخصومات
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
        <div className="pt-2 space-y-3 border-t border-slate-100 text-xs text-slate-700 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="font-bold text-slate-900 text-[11px]">إظهار شريط الإعلانات</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={announcement.enabled}
                onChange={(e) =>
                  updateWebsiteSettings({
                    announcement: {
                      ...announcement,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {announcement.enabled && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  نص الإعلان
                </label>
                <input
                  type="text"
                  value={announcement.text}
                  onChange={(e) =>
                    updateWebsiteSettings({
                      announcement: {
                        ...announcement,
                        text: e.target.value,
                      },
                    })
                  }
                  placeholder="خصم 20% لفترة محدودة باستخدام كود SALE20"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رابط عند النقر (اختياري)
                </label>
                <input
                  type="text"
                  value={announcement.link || ''}
                  onChange={(e) =>
                    updateWebsiteSettings({
                      announcement: {
                        ...announcement,
                        link: e.target.value,
                      },
                    })
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden dir-ltr text-left"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    لون الخلفية
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={announcement.bgColor || '#1d4ed8'}
                      onChange={(e) =>
                        updateWebsiteSettings({
                          announcement: {
                            ...announcement,
                            bgColor: e.target.value,
                          },
                        })
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      {announcement.bgColor}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    لون الخط
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={announcement.textColor || '#ffffff'}
                      onChange={(e) =>
                        updateWebsiteSettings({
                          announcement: {
                            ...announcement,
                            textColor: e.target.value,
                          },
                        })
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      {announcement.textColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
