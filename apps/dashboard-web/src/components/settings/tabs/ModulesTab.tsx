'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  FileText,
  ShoppingCart,
  Camera,
  Users,
  Megaphone,
  Globe,
  BarChart3,
  Palette,
  Settings as SettingsIcon,
  LayoutGrid,
  Coins,
  UserCog,
  Clock,
  Wallet,
  Package,
  Tag,
  Monitor,
  Receipt,
  CreditCard,
  Loader2,
  Sparkles,
  ChevronDown,
  Calendar,
  ArrowLeftRight,
  Star,
  ListChecks,
  Clipboard,
  Truck,
  Scan,
  QrCode,
  Bell,
  TrendingUp,
  Briefcase,
  MessageSquare,
  Ticket,
  Headphones,
  ThumbsUp,
  StickyNote,
  Phone,
  Percent,
  Mail,
  Smartphone,
  Gift,
  Undo2,
  CalendarCheck,
  Building,
  Stethoscope,
  CalendarX,
  AlarmClock,
  Utensils,
  ShieldCheck,
  CalendarOff,
  CheckSquare,
  PieChart,
  LineChart,
  Eye,
  MousePointer,
  Pen,
  Search,
  Lightbulb,
  Brain,
  LockKeyhole,
  UnlockKeyhole,
  BookOpen,
  Repeat,
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { readMerchantCache, writeMerchantCache } from '@/lib/session-keys';

interface ModulesTabProps {
  shop: any;
  onSaved: () => void;
}

import { HIDE_UNPUBLISHED } from '@/config/sidebar';
import {
  MODULE_GROUPS as RAW_MODULE_GROUPS,
  REGISTRY_FEATURES as RAW_REGISTRY_FEATURES,
} from './modulesData.generated';

// Filter out unpublished groups and features in production builds (HIDE_UNPUBLISHED)
// while keeping them fully interactive on local/dev.
const MODULE_GROUPS = RAW_MODULE_GROUPS.filter((g) => !HIDE_UNPUBLISHED || g.published);

const REGISTRY_FEATURES: Record<
  string,
  Array<{ id: string; labelAr: string; icon: any; published: boolean; defaultEnabled: boolean }>
> = {};

for (const [k, v] of Object.entries(RAW_REGISTRY_FEATURES)) {
  REGISTRY_FEATURES[k] = v.filter((f) => !HIDE_UNPUBLISHED || f.published);
}

const FEATURE_ALIASES: Record<string, string> = {
  orders: 'sales',
  addProduct: 'products',
  promotions: 'campaigns',
  reservations: 'bookingsSchedule',
  bookingsOverview: 'bookingsSchedule',
  website: 'website_themes',
  discounts: 'offers',
  coupons: 'offers',
};

export default function ModulesTab({ shop, onSaved }: ModulesTabProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [moduleFeatures, setModuleFeatures] = useState<Record<string, Set<string>>>({});
  const savedFeatures = (shop as any)?.layoutConfig?.enabledFeatures as
    Record<string, string[]> | undefined;

  const isFirstRender = useRef(true);

  useEffect(() => {
    const initial: Record<string, Set<string>> = {};
    const hasAnySaved = savedFeatures && Object.keys(savedFeatures).length > 0;
    for (const modId of Object.keys(REGISTRY_FEATURES)) {
      const saved =
        savedFeatures?.[modId] || (modId === 'sales' ? savedFeatures?.['orders'] : undefined);
      if (Array.isArray(saved)) {
        initial[modId] = new Set(saved.map((f) => FEATURE_ALIASES[f] || f));
      } else if (!hasAnySaved) {
        initial[modId] = new Set(
          REGISTRY_FEATURES[modId].filter((f) => f.defaultEnabled).map((f) => f.id)
        );
      } else {
        initial[modId] = new Set();
      }
    }
    setModuleFeatures(initial);
  }, [savedFeatures]);

  const persistFeatures = useCallback(
    async (
      nextFeatures: Record<string, Set<string>>,
      opts?: { onError?: () => void }
    ): Promise<boolean> => {
      setSaving(true);
      try {
        const featuresObj: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(nextFeatures)) featuresObj[k] = Array.from(v);
        const previousLayout =
          (shop as any)?.layoutConfig && typeof (shop as any).layoutConfig === 'object'
            ? (shop as any).layoutConfig
            : {};

        const activeModules = Object.keys(featuresObj).filter(
          (mod) => Array.isArray(featuresObj[mod]) && featuresObj[mod].length > 0
        );

        const updatedLayout = {
          ...previousLayout,
          enabledFeatures: featuresObj,
          enabledModules: activeModules,
        };

        await apiRequest('/shops/me', {
          method: 'PATCH',
          body: JSON.stringify({
            layoutConfig: updatedLayout,
          }),
        });

        if (shop && typeof shop === 'object') {
          (shop as any).layoutConfig = updatedLayout;
        }

        try {
          // قراءة/كتابة موسومة بالمالك — لا يُدمج تعديل الوحدات في كاش تاجر آخر.
          const cached = readMerchantCache<Record<string, unknown>>() || {};
          writeMerchantCache({ ...cached, layoutConfig: updatedLayout });
        } catch {}

        window.dispatchEvent(
          new CustomEvent('merchant-modules-changed', {
            detail: { enabledFeatures: featuresObj, enabledModules: activeModules },
          })
        );

        onSaved?.();
        return true;
      } catch (e: any) {
        opts?.onError?.();
        toast({
          title: 'خطأ',
          description: e?.message || 'فشل حفظ الميزات',
          variant: 'destructive',
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [shop, toast, onSaved]
  );

  const toggleModule = (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = moduleFeatures[moduleId] || new Set<string>();
    const isModuleActive = current.size > 0;
    const groupDef = MODULE_GROUPS.find((g) => g.id === moduleId);
    const groupFeatures = REGISTRY_FEATURES[moduleId] || [];

    const revert = () => {
      setModuleFeatures((prev) => ({ ...prev, [moduleId]: current }));
    };

    // Compute nextState from the CURRENT state (event handler — state is fresh).
    // Side effects (setTogglingFeature + persistFeatures) live OUTSIDE any
    // setState updater: React may invoke updaters twice (StrictMode /
    // concurrent rendering), which used to fire duplicate PATCH requests —
    // one winning, one failing + reverting, so the toggle "needed many clicks".
    let nextState: Record<string, Set<string>>;
    if (isModuleActive) {
      nextState = { ...moduleFeatures, [moduleId]: new Set<string>() };
    } else {
      const featuresToEnable = groupFeatures.filter((f) => f.defaultEnabled).map((f) => f.id);
      const toAdd = featuresToEnable.length > 0 ? featuresToEnable : groupFeatures.map((f) => f.id);
      nextState = { ...moduleFeatures, [moduleId]: new Set<string>(toAdd) };
    }

    setModuleFeatures(nextState);
    setTogglingFeature(moduleId);
    void persistFeatures(nextState, { onError: revert })
      .then((ok) => {
        if (ok) {
          toast({
            title: isModuleActive ? 'تم الإيقاف' : 'تم التفعيل',
            description: `تم ${isModuleActive ? 'إيقاف' : 'تفعيل'} قسم ${groupDef?.label || ''} بنجاح`,
          });
        }
      })
      .finally(() => setTogglingFeature(null));
  };

  const toggleFeature = (moduleId: string, featureId: string) => {
    const current = moduleFeatures[moduleId] || new Set<string>();
    const isCurrentlyEnabled = current.has(featureId);
    const featureKey = `${moduleId}:${featureId}`;
    const featureDef = (REGISTRY_FEATURES[moduleId] || []).find((f) => f.id === featureId);
    const featureName = featureDef?.labelAr || 'الميزة';

    const revert = () => {
      setModuleFeatures((prev) => {
        const next = new Set(prev[moduleId] || new Set<string>());
        if (isCurrentlyEnabled) next.add(featureId);
        else next.delete(featureId);
        return { ...prev, [moduleId]: next };
      });
    };

    const next = new Set(current);
    if (isCurrentlyEnabled) next.delete(featureId);
    else next.add(featureId);
    const nextState = { ...moduleFeatures, [moduleId]: next };

    setModuleFeatures(nextState);
    setTogglingFeature(featureKey);
    void persistFeatures(nextState, { onError: revert })
      .then((ok) => {
        if (ok) {
          toast({
            title: isCurrentlyEnabled ? 'تم الإيقاف' : 'تم التفعيل',
            description: isCurrentlyEnabled
              ? `تم إيقاف ${featureName} بنجاح`
              : `تم تفعيل ${featureName} فوراً في لوحتك`,
          });
        }
      })
      .finally(() => setTogglingFeature(null));
  };

  // Emit changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      const enabledFeatures: Record<string, string[]> = {};
      for (const [moduleId, features] of Object.entries(moduleFeatures)) {
        enabledFeatures[moduleId] = Array.from(features);
      }
      const activeModules = Object.keys(enabledFeatures).filter(
        (mod) => Array.isArray(enabledFeatures[mod]) && enabledFeatures[mod].length > 0
      );
      window.dispatchEvent(
        new CustomEvent('merchant-modules-changed', {
          detail: { enabledFeatures, enabledModules: activeModules },
        })
      );
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'modules', count: 0 },
        })
      );
    } catch {}
  }, [moduleFeatures]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const coreModules = [
    { id: 'overview', label: 'النظرة العامة', icon: LayoutGrid },
    { id: 'products', label: 'المنتجات', icon: Package },
    { id: 'promotions', label: 'العروض', icon: Tag },
    { id: 'builder', label: 'البولدر', icon: Monitor },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-10 text-right" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl">
        <h3 className="text-3xl font-black">ترقية الأقسام</h3>
        <p className="text-sm font-bold text-slate-300 mt-3 leading-relaxed max-w-2xl">
          فعّل أو أوقف أي ميزة إضافية بنفسك فوراً — بمراجعة ولا انتظار.
        </p>
      </div>

      {/* Core Modules */}
      <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
            <LayoutGrid size={20} />
          </div>
          <div className="font-black text-slate-900 text-lg">الأقسام الأساسية</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {coreModules.map((m) => {
            const Icon = m.icon || LayoutGrid;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-900 text-sm truncate">{m.label}</div>
                  <div className="text-[10px] font-black text-emerald-600">أساسي</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Modules (grouped by registry) */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="font-black text-slate-900 text-lg">الأقسام الاختيارية</div>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              فعّل الميزات الإضافية التي تناسب أعمالك
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {MODULE_GROUPS.map((group) => {
            const features = REGISTRY_FEATURES[group.id] || [];
            if (features.length === 0) return null;
            const isExpanded = expandedGroups.has(group.id);
            const activeCount = (moduleFeatures[group.id] || new Set()).size;
            const GroupIcon = group.icon;
            return (
              <div
                key={group.id}
                className="rounded-[2rem] border border-slate-100 overflow-hidden transition-all bg-white"
              >
                <div
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-all cursor-pointer select-none"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm text-white shrink-0"
                    style={{ backgroundColor: group.color }}
                  >
                    <GroupIcon size={24} />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-black text-slate-900 text-base">{group.label}</h4>
                      <span
                        className={`text-[10px] font-black rounded-full px-2 py-0.5 border ${
                          activeCount > 0
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-slate-500 bg-slate-100 border-slate-200'
                        }`}
                      >
                        {activeCount > 0 ? 'مفعّل' : 'موقوف'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-black text-slate-400">
                        {features.length} ميزة
                      </span>
                      {activeCount > 0 && (
                        <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                          {activeCount} مفعّلة
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Master Module Toggle */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleModule(group.id, e)}
                      disabled={saving || togglingFeature === group.id}
                      title={
                        activeCount > 0 ? `إيقاف قسم ${group.label}` : `تفعيل قسم ${group.label}`
                      }
                      className={`w-12 h-6.5 rounded-full transition-colors flex items-center p-0.5 shrink-0 focus:outline-none disabled:opacity-50 ${
                        activeCount > 0
                          ? 'bg-emerald-500 justify-end'
                          : 'bg-slate-200 justify-start'
                      }`}
                    >
                      {togglingFeature === group.id ? (
                        <div className="w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center shadow-md">
                          <Loader2 size={12} className="animate-spin text-slate-500" />
                        </div>
                      ) : (
                        <span className="w-5.5 h-5.5 rounded-full bg-white shadow-md transition-all block" />
                      )}
                    </button>
                  </div>

                  <ChevronDown
                    size={22}
                    className={`text-slate-400 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {isExpanded && (
                  <div className="p-4 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-2">
                    {features.map((feature) => {
                      const featureEnabled = (moduleFeatures[group.id] || new Set()).has(
                        feature.id
                      );
                      const isFeatureToggling = togglingFeature === `${group.id}:${feature.id}`;
                      return (
                        <div
                          key={feature.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            featureEnabled
                              ? 'border-emerald-200 bg-emerald-50/50'
                              : 'border-slate-100 bg-white'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              featureEnabled
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {featureEnabled ? (
                              <Check size={16} strokeWidth={3} />
                            ) : (
                              (() => {
                                const FeatureIcon = feature.icon || LayoutGrid;
                                return <FeatureIcon size={16} />;
                              })()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-slate-900">
                              {feature.labelAr}
                            </div>
                            <div
                              className={`text-[10px] font-bold mt-0.5 ${
                                featureEnabled ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            >
                              {featureEnabled ? 'مفعّلة' : 'موقوفة'}
                            </div>
                          </div>

                          {/* Sub-feature Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => toggleFeature(group.id, feature.id)}
                            disabled={saving || isFeatureToggling}
                            title={
                              featureEnabled
                                ? `إيقاف ${feature.labelAr}`
                                : `تفعيل ${feature.labelAr}`
                            }
                            className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 focus:outline-none disabled:opacity-50 ${
                              featureEnabled
                                ? 'bg-emerald-500 justify-end'
                                : 'bg-slate-200 justify-start'
                            }`}
                          >
                            {isFeatureToggling ? (
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <Loader2 size={11} className="animate-spin text-slate-500" />
                              </div>
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-all block" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
