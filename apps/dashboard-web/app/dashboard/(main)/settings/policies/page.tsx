'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Truck, RefreshCcw, Package } from 'lucide-react';

interface Policy {
  type: string;
  title: string;
  content: string;
}

const policyTypes = [
  { type: 'refund', title: 'سياسة الاسترداد', icon: RefreshCcw },
  { type: 'exchange', title: 'سياسة الاستبدال', icon: Package },
  { type: 'shipping', title: 'سياسة الشحن', icon: Truck },
];

export default function PoliciesManagementPage() {
  const [policies, setPolicies] = useState<Record<string, string>>({
    refund: '',
    exchange: '',
    shipping: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/shops/me/policies', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const map: Record<string, string> = {};
        items.forEach((p: any) => {
          map[p.type] = p.content || '';
        });
        setPolicies((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const savePolicy = async (type: string) => {
    setSaving(type);
    try {
      await fetch(`/api/v1/shops/me/policies/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: policies[type] }),
      });
    } catch {
      // handle error
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <RefreshCw className="w-8 h-8 text-[#00E5FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">إدارة سياسات المتجر</h1>

      <div className="space-y-6">
        {policyTypes.map((pt) => {
          const Icon = pt.icon;
          return (
            <div key={pt.type} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#00E5FF]" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{pt.title}</h2>
              </div>
              <textarea
                value={policies[pt.type]}
                onChange={(e) => setPolicies((prev) => ({ ...prev, [pt.type]: e.target.value }))}
                rows={6}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white resize-y focus:ring-2 focus:ring-[#00E5FF]/50 outline-none"
                placeholder={`اكتب ${pt.title} هنا...`}
              />
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={() => savePolicy(pt.type)}
                  disabled={saving === pt.type}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#00E5FF] text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                >
                  {saving === pt.type ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  حفظ
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
