'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Download,
  Trash2,
  Power,
  PowerOff,
  Store,
  CheckCircle2,
  LayoutGrid,
  RefreshCw,
  Image,
  Mic,
  MessageCircle,
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';

interface AppsTabProps {
  shop: any;
  onSaved?: () => void;
}

type AppWithStatus = {
  id: string;
  key: string;
  name: string;
  version?: string;
  description?: string;
  installed?: boolean;
  isActive?: boolean;
};

/**
 * Market-launch switch: finance, accounting, HR, and AI/assistant apps are
 * local-only for now, so they are stripped from the merchant app store in
 * production. Matching metadata also covers newly seeded server-side apps.
 */
function isLocalOnlyApp(app: Pick<AppWithStatus, 'key' | 'name' | 'description'>): boolean {
  const haystack = `${app?.key || ''} ${app?.name || ''} ${app?.description || ''}`;
  return /(^|[-_\s])(finance|financial|accounting|accountant|hr|payroll|ai)([-_\s]|$)|assistant|chatbot|chat-?gpt|gemini|مالي|محاس|موارد|رواتب|ذكاء/i.test(
    haystack
  );
}

export default function AppsTab({ shop, onSaved }: AppsTabProps) {
  const { toast } = useToast();
  const [apps, setApps] = useState<AppWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const visibleApps = HIDE_UNPUBLISHED ? apps.filter((app) => !isLocalOnlyApp(app)) : apps;
  const getAppIcon = (key: string) => {
    switch (key) {
      case 'image-editor':
        return Image;
      case 'voice-ordering':
        return Mic;
      case 'whatsapp-button':
        return MessageCircle;
      default:
        return Store;
    }
  };

  const getAppColor = (key: string) => {
    switch (key) {
      case 'image-editor':
        return 'from-purple-50 to-pink-100 text-purple-500';
      case 'voice-ordering':
        return 'from-blue-50 to-cyan-100 text-blue-500';
      case 'whatsapp-button':
        return 'from-green-50 to-emerald-100 text-green-500';
      default:
        return 'from-cyan-50 to-slate-100 text-cyan-500';
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [allApps, myApps] = await Promise.all([apiRequest('/apps'), apiRequest('/apps/me')]);
      // /apps/me returns flat rows with appKey (no nested app object, no appId)
      const installedMap = new Map<string, any>();
      for (const sa of Array.isArray(myApps) ? myApps : []) {
        if (sa.status === 'INSTALLED') installedMap.set(sa.appKey || sa.appId, sa);
      }
      const merged: AppWithStatus[] = (Array.isArray(allApps) ? allApps : []).map((app: any) => {
        const shopApp = installedMap.get(app.key) || installedMap.get(app.id);
        return { ...app, installed: !!shopApp, isActive: shopApp?.isActive ?? false };
      });
      setApps(merged);
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل تحميل التطبيقات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setAction = (key: string, val: boolean) =>
    setActionLoading((prev) => ({ ...prev, [key]: val }));

  const handleInstall = async (app: AppWithStatus) => {
    setAction(app.key, true);
    try {
      await apiRequest(`/apps/${app.key}/install`, { method: 'POST' });
      toast({ title: 'تم التثبيت', description: `تم تثبيت ${app.name} بنجاح` });
      await loadData();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e?.message || 'فشل التثبيت', variant: 'destructive' });
    } finally {
      setAction(app.key, false);
    }
  };

  const handleUninstall = async (app: AppWithStatus) => {
    setAction(app.key, true);
    try {
      await apiRequest(`/apps/${app.key}/uninstall`, { method: 'POST' });
      toast({ title: 'تم الإزالة', description: `تم إزالة ${app.name} بنجاح` });
      await loadData();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e?.message || 'فشل الإزالة', variant: 'destructive' });
    } finally {
      setAction(app.key, false);
    }
  };

  const handleToggle = async (app: AppWithStatus) => {
    setAction(app.key, true);
    try {
      if (app.isActive) {
        await apiRequest(`/apps/${app.key}/disable`, { method: 'POST' });
        toast({ title: 'تم التعطيل', description: `تم تعطيل ${app.name}` });
      } else {
        await apiRequest(`/apps/${app.key}/enable`, { method: 'POST' });
        toast({ title: 'تم التفعيل', description: `تم تفعيل ${app.name}` });
      }
      await loadData();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e?.message || 'فشلت العملية', variant: 'destructive' });
    } finally {
      setAction(app.key, false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-cyan-500 w-10 h-10" />
        <p className="font-semibold text-slate-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center gap-3 mb-2">
        <Store size={24} className="text-cyan-500" />
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">سوق التطبيقات</h2>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        ثبّت التطبيقات التي تناسب أعمالك وفعّلها بنقرة واحدة
      </p>

      {visibleApps.length === 0 ? (
        <div className="text-center py-16">
          <Store size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-semibold">لا توجد تطبيقات متاحة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleApps.map((app) => {
            const busy = !!actionLoading[app.key];
            const AppIcon = getAppIcon(app.key);
            const colorClass = getAppColor(app.key);
            return (
              <div
                key={app.id}
                className="relative bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
              >
                {app.installed && app.isActive && (
                  <div className="absolute top-3 left-3">
                    <CheckCircle2 size={18} className="text-green-500" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0`}
                  >
                    <AppIcon size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-base truncate">{app.name}</h3>
                    {app.version && (
                      <span className="text-xs text-slate-500 font-mono">v{app.version}</span>
                    )}
                  </div>
                </div>
                {app.description && (
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                    {app.description}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-2 pt-2">
                  {!app.installed ? (
                    <button
                      onClick={() => handleInstall(app)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      تثبيت
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggle(app)}
                        disabled={busy}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                          app.isActive
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {busy ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : app.isActive ? (
                          <PowerOff size={16} />
                        ) : (
                          <Power size={16} />
                        )}
                        {app.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button
                        onClick={() => handleUninstall(app)}
                        disabled={busy}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        إزالة
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
