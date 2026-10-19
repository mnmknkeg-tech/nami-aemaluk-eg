'use client';

import React, { useEffect, useState } from 'react';
import {
  Facebook, Instagram, MessageCircle, Send, Youtube, Twitter, Linkedin,
  Globe, Save, Check, Plus, X, Link as LinkIcon, Music2,
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';

interface SocialMediaTabProps {
  shop: any;
  onSaved?: () => void;
}

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: <Facebook size={20} />, color: 'text-blue-600', placeholder: 'https://facebook.com/yourpage' },
  { id: 'instagram', label: 'Instagram', icon: <Instagram size={20} />, color: 'text-pink-600', placeholder: 'https://instagram.com/youraccount' },
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={20} />, color: 'text-green-600', placeholder: 'https://wa.me/201234567890' },
  { id: 'telegram', label: 'Telegram', icon: <Send size={20} />, color: 'text-cyan-600', placeholder: 'https://t.me/yourchannel' },
  { id: 'youtube', label: 'YouTube', icon: <Youtube size={20} />, color: 'text-red-600', placeholder: 'https://youtube.com/@yourchannel' },
  { id: 'twitter', label: 'Twitter / X', icon: <Twitter size={20} />, color: 'text-slate-900', placeholder: 'https://twitter.com/youraccount' },
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={20} />, color: 'text-blue-700', placeholder: 'https://linkedin.com/company/yourcompany' },
  { id: 'tiktok', label: 'TikTok', icon: <Music2 size={20} />, color: 'text-slate-900', placeholder: 'https://tiktok.com/@youraccount' },
  { id: 'snapchat', label: 'Snapchat', icon: <Globe size={20} />, color: 'text-yellow-500', placeholder: 'https://snapchat.com/add/youraccount' },
  { id: 'website', label: 'Website', icon: <Globe size={20} />, color: 'text-indigo-600', placeholder: 'https://yourwebsite.com' },
];

export default function SocialMediaTab({ shop, onSaved }: SocialMediaTabProps) {
  const { toast } = useToast();
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [savedLinks, setSavedLinks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const layout = shop?.layoutConfig && typeof shop.layoutConfig === 'object' ? shop.layoutConfig : {};
    const social = (layout as any)?.socialLinks || {};
    const normalized: Record<string, string> = {};
    for (const platform of PLATFORMS) {
      normalized[platform.id] = String(social[platform.id] || '');
    }
    setSocialLinks(normalized);
    setSavedLinks({ ...normalized });
  }, [shop]);

  const hasChanges = JSON.stringify(socialLinks) !== JSON.stringify(savedLinks);

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'social_media', count: hasChanges ? 1 : 0 },
        })
      );
    } catch {}
  }, [hasChanges]);

  const handleChange = (platformId: string, value: string) => {
    setSocialLinks((prev) => ({ ...prev, [platformId]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const layout = shop?.layoutConfig && typeof shop.layoutConfig === 'object' ? { ...shop.layoutConfig } : {};
      const updated = { ...layout, socialLinks: { ...socialLinks } };
      await apiRequest('/shops/me', { method: 'PATCH', body: JSON.stringify({ layoutConfig: updated }) });
      setSavedLinks({ ...socialLinks });
      toast({ title: 'تم حفظ الروابط', description: 'تم تحديث روابط السوشيال ميديا' });
      onSaved?.();
      return true;
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل حفظ الروابط', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-register-save-handler', {
          detail: { sectionId: 'social_media', handler: handleSave },
        })
      );
    } catch {}
  }, [handleSave]);

  const connectedCount = Object.values(savedLinks).filter((v) => String(v).trim()).length;
  const visiblePlatforms = showAll ? PLATFORMS : PLATFORMS.slice(0, 6);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900">روابط السوشيال ميديا</h3>
          <p className="text-sm text-slate-400 font-bold mt-1">اربط حساباتك على منصات التواصل — تظهر في موقعك وتُستخدم في مركز التسويق</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl">
          <Check size={16} className="text-green-500" />
          <span className="text-xs font-black text-slate-600">{connectedCount} متصل</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visiblePlatforms.map((platform) => {
          const value = socialLinks[platform.id] || '';
          const isConnected = String(savedLinks[platform.id] || '').trim() !== '';
          return (
            <div key={platform.id} className={`p-4 rounded-2xl border transition-all ${isConnected ? 'border-green-200 bg-green-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${platform.color} shadow-sm`}>
                  {platform.icon}
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm text-slate-900">{platform.label}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{isConnected ? 'متصل' : 'غير متصل'}</p>
                </div>
                {isConnected && <span className="w-2 h-2 rounded-full bg-green-500" />}
              </div>
              <div className="flex items-center gap-2">
                <LinkIcon size={14} className="text-slate-300 shrink-0" />
                <input
                  type="url"
                  value={value}
                  onChange={(e) => handleChange(platform.id, e.target.value)}
                  placeholder={platform.placeholder}
                  className="flex-1 px-3 py-2.5 bg-white rounded-xl border border-slate-100 text-xs font-bold focus:outline-none focus:border-purple-300 transition-colors"
                />
              </div>
            </div>
          );
        })}
      </div>

      {!showAll && PLATFORMS.length > 6 && (
        <button onClick={() => setShowAll(true)} className="w-full py-3 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
          <Plus size={14} />
          عرض جميع المنصات ({PLATFORMS.length - 6} إضافية)
        </button>
      )}
      {showAll && PLATFORMS.length > 6 && (
        <button onClick={() => setShowAll(false)} className="w-full py-3 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
          <X size={14} />
          عرض أقل
        </button>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 font-bold">{hasChanges ? 'تغييرات غير محفوظة' : 'كل الروابط محفوظة'}</p>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all ${hasChanges && !saving ? 'bg-slate-900 text-white hover:bg-black' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
        >
          <Save size={14} />
          {saving ? 'جاري الحفظ...' : 'حفظ الروابط'}
        </button>
      </div>
    </div>
  );
}
