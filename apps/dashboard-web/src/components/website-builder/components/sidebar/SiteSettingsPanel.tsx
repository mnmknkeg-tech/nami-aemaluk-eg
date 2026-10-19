import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import type { WebsiteSettings } from '../../types/builder';
import { AuthSettingsSection } from './settings/AuthSettingsSection';
import { AnnouncementSettingsSection } from './settings/AnnouncementSettingsSection';
import { FloatingActionsSection } from './settings/FloatingActionsSection';
import { SeoSettingsSection } from './settings/SeoSettingsSection';
import { CartSettingsSection } from './settings/CartSettingsSection';

export const SiteSettingsPanel: React.FC = () => {
  const { website } = useBuilder();
  const settings: WebsiteSettings = website.settings || {};

  const [activeSection, setActiveSection] = useState<
    'cart' | 'auth' | 'announcement' | 'floating' | 'seo' | null
  >('cart');

  const toggleSection = (sec: 'cart' | 'auth' | 'announcement' | 'floating' | 'seo') => {
    setActiveSection(activeSection === sec ? null : sec);
  };

  return (
    <div className="h-full flex flex-col bg-white select-none divide-y divide-slate-100 overflow-y-auto">
      {/* Header Info */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900">إعدادات الموقع الشاملة</h3>
            <p className="text-[10px] text-slate-500">
              تحكم كامل في السلة، نوع النشاط، الأعضاء، والـ SEO
            </p>
          </div>
        </div>
      </div>

      {/* 1. إعدادات السلة ونوع النشاط */}
      <CartSettingsSection
        isOpen={activeSection === 'cart'}
        onToggle={() => toggleSection('cart')}
        settings={settings}
      />

      {/* 2. نظام تسجيل الدخول وعضويات العملاء */}
      <AuthSettingsSection
        isOpen={activeSection === 'auth'}
        onToggle={() => toggleSection('auth')}
        settings={settings}
      />

      {/* 3. شريط الإعلانات العلوي */}
      <AnnouncementSettingsSection
        isOpen={activeSection === 'announcement'}
        onToggle={() => toggleSection('announcement')}
        settings={settings}
      />

      {/* 4. الأزرار العائمة والموبايل */}
      <FloatingActionsSection
        isOpen={activeSection === 'floating'}
        onToggle={() => toggleSection('floating')}
        settings={settings}
      />

      {/* 5. محركات البحث والأرشفة */}
      <SeoSettingsSection
        isOpen={activeSection === 'seo'}
        onToggle={() => toggleSection('seo')}
        settings={settings}
      />
    </div>
  );
};
