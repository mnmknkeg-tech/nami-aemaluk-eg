'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Download, Edit3, Trash2, AlertOctagon, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { APP_SCOPE, getCsrfToken, isSessionActive } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

type ConsentType = 'essential' | 'analytics' | 'marketing';

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface DSRRequest {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
}

const consentLabels: Record<ConsentType, string> = {
  essential: 'كوكيز ضرورية',
  analytics: 'كوكيز تحليلية',
  marketing: 'كوكيز تسويقية',
};

const CONSENT_KEY = 'ray_consents';

function readConsents(): ConsentState {
  if (typeof window === 'undefined') return { essential: true, analytics: false, marketing: false };
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { essential: true, analytics: false, marketing: false };
    return { essential: true, analytics: false, marketing: false, ...JSON.parse(raw) };
  } catch {
    return { essential: true, analytics: false, marketing: false };
  }
}

function writeConsentsToStorage(c: ConsentState) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(c));
}

const dsrActions = [
  { type: 'access', label: 'طلب بياناتي', icon: FileText, color: 'bg-blue-500' },
  { type: 'correction', label: 'تصحيح بياناتي', icon: Edit3, color: 'bg-amber-500' },
  { type: 'deletion', label: 'حذف حسابي', icon: Trash2, color: 'bg-red-500' },
  { type: 'objection', label: 'الاعتراض على المعالجة', icon: AlertOctagon, color: 'bg-purple-500' },
  { type: 'portability', label: 'تصدير بياناتي', icon: Download, color: 'bg-green-500' },
] as const;

const statusLabels: Record<string, string> = {
  pending: 'قيد المراجعة',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
  rejected: 'مرفوض',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

export default function PrivacySettingsPage() {
  const router = useRouter();
  const [consents, setConsents] = useState<ConsentState>({
    essential: true,
    analytics: false,
    marketing: false,
  });
  const [dsrRequests, setDsrRequests] = useState<DSRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Cookie-first session check — no localStorage credential anymore.
    const token = isSessionActive() ? 'active' : '';
    if (!token) {
      router.replace('/login?returnTo=/account/privacy');
      return;
    }
    setAuthChecked(true);
    setConsents(readConsents());

    // Load DSR requests
    fetch('/api/v1/dsr', {
      credentials: 'include',
      headers: { 'X-App-Scope': APP_SCOPE },
    })
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setDsrRequests(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const toggleConsent = (type: ConsentType) => {
    if (type === 'essential') return;
    setConsents((prev) => {
      const next = { ...prev, [type]: !prev[type] };
      writeConsentsToStorage(next);
      // Sync to backend
      fetch('/api/v1/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Scope': APP_SCOPE,
          ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ types: Object.keys(next).filter((k) => next[k as ConsentType]) }),
      }).catch(() => {});
      return next;
    });
  };

  const submitDSR = async (type: string) => {
    if (type === 'deletion' && !deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setSubmitting(type);
    try {
      await fetch('/api/v1/dsr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Scope': APP_SCOPE,
          ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ type }),
      });
      // Refresh list
      const res = await fetch('/api/v1/dsr', {
        credentials: 'include',
        headers: { 'X-App-Scope': APP_SCOPE },
      });
      const data = await res.json();
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setDsrRequests(items);
      setDeleteConfirm(false);
    } catch {
      // handle error
    } finally {
      setSubmitting(null);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8" dir="rtl" aria-busy>
        <span className="sr-only">جاري التحميل...</span>
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-8 w-56 rounded-xl" />
          </div>
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8" dir="rtl">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-[#00E5FF]" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إعدادات الخصوصية</h1>
        </div>

        {/* Consent Toggles */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">تفضيلات الكوكيز</h2>
          <div className="space-y-3">
            {(Object.keys(consents) as ConsentType[]).map((type) => (
              <div
                key={type}
                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
              >
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                  {consentLabels[type]}
                </span>
                <button
                  type="button"
                  onClick={() => toggleConsent(type)}
                  disabled={type === 'essential'}
                  className={`relative w-12 h-7 rounded-full transition-all
                    ${consents[type] ? 'bg-[#00E5FF]' : 'bg-slate-300 dark:bg-slate-600'}
                    ${type === 'essential' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all
                    ${consents[type] ? 'right-1' : 'right-6'}
                  `}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* DSR Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">حقوق بياناتك</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dsrActions.map((action) => {
              const Icon = action.icon;
              const isDelete = action.type === 'deletion';
              return (
                <button
                  key={action.type}
                  type="button"
                  onClick={() => submitDSR(action.type)}
                  disabled={submitting !== null}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  <div
                    className={`w-9 h-9 rounded-lg ${action.color} flex items-center justify-center`}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {action.label}
                  </span>
                  {submitting === action.type && (
                    <div className="w-4 h-4 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin mr-auto" />
                  )}
                </button>
              );
            })}
          </div>

          {deleteConfirm && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
              <p className="text-red-700 dark:text-red-400 font-bold text-sm mb-3">
                تأكيد حذف الحساب: هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك نهائيًا.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => submitDSR('deletion')}
                  className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg text-sm hover:bg-red-600 transition-all"
                >
                  تأكيد الحذف
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DSR History */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">طلبات سابقة</h2>
          {dsrRequests.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">لا توجد طلبات سابقة</p>
          ) : (
            <div className="space-y-2">
              {dsrRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                      {req.type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-bold ${statusColors[req.status] || ''}`}
                  >
                    {statusLabels[req.status] || req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
