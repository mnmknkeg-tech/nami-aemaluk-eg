import React from 'react';
import { Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { useBuilder } from '../../../context/BuilderContext';
import type { WebsiteSettings } from '../../../types/builder';

interface SeoSettingsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: WebsiteSettings;
}

export const SeoSettingsSection: React.FC<SeoSettingsSectionProps> = ({
  isOpen,
  onToggle,
  settings,
}) => {
  const { updateWebsiteSettings } = useBuilder();

  const seo = settings.seo || {
    metaTitle: '',
    metaDescription: '',
    ogImage: '',
    metaPixelId: '',
    googleAnalyticsId: '',
  };

  return (
    <div className="p-3.5 space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-right cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              محركات البحث والأرشفة (SEO)
            </span>
            <p className="text-[10px] text-slate-400">
              عنوان الموقع، الوصف، وبيكسل التتبع الإعلاني
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
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              عنوان الموقع في جوجل
            </label>
            <input
              type="text"
              value={seo.metaTitle || ''}
              onChange={(e) =>
                updateWebsiteSettings({
                  seo: {
                    ...seo,
                    metaTitle: e.target.value,
                  },
                })
              }
              placeholder="اسم المتجر | أفضل متجر في مصر"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              الوصف التعريفي (Meta Description)
            </label>
            <textarea
              rows={2}
              value={seo.metaDescription || ''}
              onChange={(e) =>
                updateWebsiteSettings({
                  seo: {
                    ...seo,
                    metaDescription: e.target.value,
                  },
                })
              }
              placeholder="يقدم متجرنا أفضل المنتجات والخدمات الحصرية..."
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              رابط صورة المشاركة (OG Image)
            </label>
            <input
              type="text"
              value={seo.ogImage || ''}
              onChange={(e) =>
                updateWebsiteSettings({
                  seo: {
                    ...seo,
                    ogImage: e.target.value,
                  },
                })
              }
              placeholder="https://..."
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden dir-ltr text-left"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                معرف Meta Pixel
              </label>
              <input
                type="text"
                value={seo.metaPixelId || ''}
                onChange={(e) =>
                  updateWebsiteSettings({
                    seo: {
                      ...seo,
                      metaPixelId: e.target.value,
                    },
                  })
                }
                placeholder="1234567890"
                className="w-full px-2.5 py-1 rounded-md border border-slate-200 text-[11px] dir-ltr text-left"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                معرف Google Analytics
              </label>
              <input
                type="text"
                value={seo.googleAnalyticsId || ''}
                onChange={(e) =>
                  updateWebsiteSettings({
                    seo: {
                      ...seo,
                      googleAnalyticsId: e.target.value,
                    },
                  })
                }
                placeholder="G-XXXXXXX"
                className="w-full px-2.5 py-1 rounded-md border border-slate-200 text-[11px] dir-ltr text-left"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
