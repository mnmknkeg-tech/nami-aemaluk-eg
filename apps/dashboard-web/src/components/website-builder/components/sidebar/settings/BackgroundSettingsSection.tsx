import React, { useState } from 'react';
import { Image as ImageIcon, Upload, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useBuilder } from '../../../context/BuilderContext';
import type { WebsiteSettings } from '../../../types/builder';
import { uploadMediaFile } from '@/lib/api/upload';
import { validateImageFile } from '@/lib/image-utils';

interface BackgroundSettingsSectionProps {
  isOpen?: boolean;
  onToggle?: () => void;
  settings?: WebsiteSettings;
}

const DEFAULT_BACKGROUND = {
  enabled: true,
  imageUrl: '',
  size: 'cover',
  position: 'center top',
  repeat: 'no-repeat',
  attachment: 'scroll',
} as const;

export const BackgroundSettingsSection: React.FC<BackgroundSettingsSectionProps> = ({
  isOpen = true,
  onToggle,
  settings,
}) => {
  const { website, currentTenant, updateWebsiteSettings } = useBuilder();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const background = {
    ...DEFAULT_BACKGROUND,
    ...(settings || website.settings)?.background,
  };
  const updateBackground = (patch: Record<string, any>) =>
    updateWebsiteSettings({ background: { ...background, ...patch } });

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'نوع أو حجم الصورة غير مقبول.');
      input.value = '';
      return;
    }
    if (!currentTenant.id) {
      setUploadError('تعذر تحديد المتجر لرفع الصورة.');
      input.value = '';
      return;
    }
    setUploadError(null);
    try {
      const url = await uploadMediaFile(file, currentTenant.id, 'website_image');
      if (!url || !/^https:\/\//i.test(url) || /^blob:/i.test(url)) {
        throw new Error('لم يُرجع التخزين رابط صورة دائمًا وآمنًا.');
      }
      updateBackground({ imageUrl: url, enabled: true });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'فشل رفع الخلفية.');
    } finally {
      input.value = '';
    }
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
              background.imageUrl ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">خلفية الموقع الطويلة</span>
              {background.imageUrl && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800">
                  مفعّلة
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">تمتد تلقائيًا من بداية الصفحة حتى الفوتر</p>
          </div>
        </div>
        {onToggle &&
          (isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ))}
      </button>
      {isOpen && (
        <div className="pt-2 space-y-3 border-t border-slate-100 text-xs text-slate-700 animate-in fade-in duration-150">
          <label className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>إضافة خلفية</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">
              أو ضع رابط الخلفية
            </label>
            <input
              type="url"
              dir="ltr"
              value={background.imageUrl || ''}
              onChange={(event) =>
                updateBackground({ imageUrl: event.target.value, enabled: true })
              }
              placeholder="https://example.com/long-background.jpg"
              className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-[10px] text-slate-700 outline-hidden focus:border-blue-500"
            />
          </div>
          {background.imageUrl && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <div className="relative h-28 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img
                  src={background.imageUrl}
                  alt="معاينة خلفية الموقع"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-bold text-slate-500">
                  طريقة الملء
                  <select
                    value={background.size}
                    onChange={(event) => updateBackground({ size: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[10px] text-slate-700"
                  >
                    <option value="cover">تغطية كاملة</option>
                    <option value="contain">إظهار الصورة كاملة</option>
                    <option value="auto">الحجم الأصلي</option>
                  </select>
                </label>
                <label className="text-[10px] font-bold text-slate-500">
                  التثبيت
                  <select
                    value={background.attachment}
                    onChange={(event) => updateBackground({ attachment: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[10px] text-slate-700"
                  >
                    <option value="scroll">مع الصفحة</option>
                    <option value="fixed">ثابتة أثناء التمرير</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={() => updateBackground({ imageUrl: '', enabled: false })}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white p-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                إزالة الخلفية
              </button>
            </div>
          )}
          {uploadError && <p className="text-[10px] text-rose-600">{uploadError}</p>}
        </div>
      )}
    </div>
  );
};
