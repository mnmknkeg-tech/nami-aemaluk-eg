import React from 'react';
import {
  UserCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useBuilder } from '../../../context/BuilderContext';
import type { WebsiteSettings, WebsiteAuthSettings } from '../../../types/builder';

interface AuthSettingsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: WebsiteSettings;
}

export const AuthSettingsSection: React.FC<AuthSettingsSectionProps> = ({
  isOpen,
  onToggle,
  settings,
}) => {
  const { website, updateWebsiteSettings, insertSectionTemplate, switchPage, addPage } = useBuilder();

  const authSettings: WebsiteAuthSettings = {
    enabled: true,
    mode: 'both',
    allowGuestCheckout: true,
    loginTitle: 'تسجيل الدخول إلى حسابك',
    requireVerification: false,
    ...settings.auth,
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
              authSettings.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">نظام تسجيل الدخول والأعضاء</span>
              {authSettings.enabled ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                  مفعّل
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500">
                  معطّل
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              إتاحة حسابات للعملاء لمتابعة الطلبات والاشتراكات
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
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="space-y-0.5 pr-1">
              <span className="font-bold text-slate-900 block text-[11px]">
                تفعيل تسجيل الدخول في الموقع
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                عرض رابط الدخول بالهيدر وحفظ بيانات العملاء بالـ CRM
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={authSettings.enabled}
                onChange={(e) =>
                  updateWebsiteSettings({
                    auth: {
                      ...authSettings,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {authSettings.enabled && (
            <div className="space-y-4 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
              {/* 1. Display Mode: Dedicated Page vs Embedded on Landing Page vs Both */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
                  طريقة عرض وتكامل تسجيل الدخول
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[
                    { id: 'dedicated_page', label: 'صفحة مستقلة (/login)', desc: 'صفحة منفصلة بالكامل' },
                    { id: 'embedded', label: 'قسم بصفحة الهبوط', desc: 'مدمج بصفحة البداية' },
                    { id: 'both', label: 'كلاهما معاً', desc: 'صفحة وقسم مدمج' },
                  ].map((dm) => {
                    const isSelected = (authSettings.displayMode || 'both') === dm.id;
                    return (
                      <button
                        key={dm.id}
                        type="button"
                        onClick={() =>
                          updateWebsiteSettings({
                            auth: {
                              ...authSettings,
                              displayMode: dm.id as any,
                            },
                          })
                        }
                        className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{dm.label}</span>
                        <span
                          className={`text-[9px] font-normal ${
                            isSelected ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          {dm.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Top Header Login Button / Icon */}
              <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-800 block">
                      أيقونة / زر تسجيل الدخول في الهيدر
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      تظهر أعلى الموقع وتوجه مباشرة لصفحة الدخول
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authSettings.headerButton?.show !== false}
                      onChange={(e) =>
                        updateWebsiteSettings({
                          auth: {
                            ...authSettings,
                            headerButton: {
                              ...authSettings.headerButton,
                              show: e.target.checked,
                            },
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {authSettings.headerButton?.show !== false && (
                  <div className="grid grid-cols-3 gap-1 pt-1 text-center">
                    {[
                      { id: 'icon', label: 'أيقونة فقط' },
                      { id: 'icon_and_text', label: 'أيقونة + نص' },
                      { id: 'button', label: 'زر مميز' },
                    ].map((st) => {
                      const isCur = (authSettings.headerButton?.style || 'icon_and_text') === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() =>
                            updateWebsiteSettings({
                              auth: {
                                ...authSettings,
                                headerButton: {
                                  ...authSettings.headerButton,
                                  show: true,
                                  style: st.id as any,
                                },
                              },
                            })
                          }
                          className={`py-1.5 px-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                            isCur
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Dedicated Pages Quick Access / Creator */}
              <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                <span className="text-[11px] font-bold text-slate-800 block">
                  الصفحات المستقلة المخصصة للعملاء
                </span>

                {/* Login Page check */}
                {(() => {
                  const loginPage = website.pages.find(
                    (p) => p.slug === 'login' || p.id.includes('login') || p.name.includes('تسجيل الدخول')
                  );
                  if (loginPage) {
                    return (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-100/70 border border-emerald-200 text-emerald-900">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-[11px] font-bold">صفحة الدخول: /{loginPage.slug}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => switchPage(loginPage.id)}
                          className="text-[10px] font-extrabold text-blue-700 hover:underline cursor-pointer"
                        >
                          تعديل الصفحة &larr;
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        addPage({
                          name: 'تسجيل الدخول',
                          slug: 'login',
                          placement: 'header_direct',
                          headerTitle: 'تسجيل الدخول',
                          includeHeaderFooter: true,
                          pageTemplate: 'login_page',
                        });
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>إنشاء صفحة تسجيل دخول مستقلة (/login) بنقرة واحدة</span>
                    </button>
                  );
                })()}

                {/* Register Page check */}
                {(() => {
                  const regPage = website.pages.find(
                    (p) => p.slug === 'register' || p.id.includes('register') || p.name.includes('إنشاء حساب')
                  );
                  if (regPage) {
                    return (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-100/70 border border-indigo-200 text-indigo-900">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="text-[11px] font-bold">صفحة التسجيل: /{regPage.slug}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => switchPage(regPage.id)}
                          className="text-[10px] font-extrabold text-blue-700 hover:underline cursor-pointer"
                        >
                          تعديل الصفحة &larr;
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        addPage({
                          name: 'إنشاء حساب',
                          slug: 'register',
                          placement: 'header_direct',
                          headerTitle: 'إنشاء حساب',
                          includeHeaderFooter: true,
                          pageTemplate: 'register_page',
                        });
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>إنشاء صفحة إنشاء حساب مستقلة (/register)</span>
                    </button>
                  );
                })()}
              </div>

              {/* 4. Auth Method */}
              <div className="pt-2 border-t border-emerald-200/60">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  طريقة تسجيل الدخول المفضلة
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[
                    { id: 'phone_otp', label: 'رقم الهاتف (OTP)', icon: Phone },
                    { id: 'email_password', label: 'البريد وكلمة المرور', icon: Mail },
                    { id: 'both', label: 'كلاهما معاً', icon: Zap },
                  ].map((m) => {
                    const isSelected = authSettings.mode === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          updateWebsiteSettings({
                            auth: {
                              ...authSettings,
                              mode: m.id as any,
                            },
                          })
                        }
                        className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Guest Checkout Option */}
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-800 block">
                    السماح بالشراء كزائر بدون تسجيل إجباري
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    للمحافظة على سرعة الشراء وزيادة نسبة المبيعات
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={authSettings.allowGuestCheckout !== false}
                  onChange={(e) =>
                    updateWebsiteSettings({
                      auth: {
                        ...authSettings,
                        allowGuestCheckout: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </div>

              {/* 6. Quick Insert Auth Section on Current Page */}
              <div className="pt-2 border-t border-emerald-200/60">
                <button
                  type="button"
                  onClick={() => {
                    insertSectionTemplate('auth_split_luxury');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>إضافة قسم تسجيل دخول فاخر بالصفحة الحالية</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
