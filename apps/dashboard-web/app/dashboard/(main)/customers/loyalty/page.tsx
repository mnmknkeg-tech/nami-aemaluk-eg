'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, Loader2, Save, Search, Award } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';

/* ============================================================
 * الولاء والمكافآت — وحدة اختيارية: إعدادات + سجل النقاط + تعديل مسجّل
 * ============================================================ */

type LoyaltySettings = {
  enabled: boolean;
  pointsPerCurrency: number;
  signupPoints: number;
  minRedeemPoints: number;
};

type LedgerEntry = {
  id: string; customerId: string; delta: number; balanceAfter: number;
  reason: string; refId?: string; staffName?: string; createdAt: string;
};

const REASON_LABELS: Record<string, string> = {
  'earn:order': 'كسب من طلب', signup: 'نقاط تسجيل', redeem: 'استبدال', manual: 'تعديل يدوي',
};

export default function LoyaltyPage() {
  const { shop } = useShop();
  const shopId = shop?.id || '';
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [customerFilter, setCustomerFilter] = useState('');
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [settingsRes, ledgerRes, custRes] = await Promise.allSettled([
        apiRequest(`/shops/${shopId}/loyalty/settings`),
        apiRequest(`/shops/${shopId}/loyalty/ledger?limit=100`),
        apiRequest(`/shops/${shopId}/customers?limit=500`),
      ]);
      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value?.data ?? settingsRes.value;
        setSettings({
          enabled: Boolean(s?.enabled),
          pointsPerCurrency: Number(s?.pointsPerCurrency ?? 100),
          signupPoints: Number(s?.signupPoints ?? 0),
          minRedeemPoints: Number(s?.minRedeemPoints ?? 0),
        });
      }
      if (ledgerRes.status === 'fulfilled') {
        const l = ledgerRes.value?.data ?? ledgerRes.value;
        setLedger(Array.isArray(l) ? l : []);
      }
      if (custRes.status === 'fulfilled') {
        const c = custRes.value?.data ?? custRes.value;
        setCustomers(Array.isArray(c) ? c.map((x: any) => ({ id: String(x.id), name: x.name })) : []);
      }
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiRequest(`/shops/${shopId}/loyalty/settings`, { method: 'PUT', body: JSON.stringify(settings) });
      setSavedMsg('تم حفظ الإعدادات ✓');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {} finally { setSaving(false); }
  };

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || String(id).slice(0, 8);

  const filteredLedger = useMemo(
    () => (customerFilter ? ledger.filter((e) => e.customerId === customerFilter) : ledger),
    [ledger, customerFilter]
  );

  if (loading) {
    return (
      <div className="min-h-full bg-[#F4F5F7] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر موحد */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              الولاء والمكافآت
              {settings?.enabled && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">مفعّل</span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">وحدة اختيارية — نقاط تُكتسب من المشتريات وتُستبدل، وكل حركة مسجّلة</p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving || !settings}
            className="h-10 px-5 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            حفظ الإعدادات
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[12px] font-bold">{savedMsg}</div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-8 space-y-4">
        {/* الإعدادات */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award size={16} className="text-[#BD00FF]" />
            إعدادات البرنامج
          </h3>
          {!settings ? (
            <Loader2 size={18} className="animate-spin text-slate-300" />
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  settings.enabled ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-right">
                  <span className="block text-xs font-bold text-slate-900">تفعيل برنامج الولاء</span>
                  <span className="block text-[10px] font-semibold text-slate-400">العملاء بيكسبوا نقاط من مشترياتهم</span>
                </span>
                <span className={`w-11 h-6 rounded-full relative transition-all ${settings.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.enabled ? 'right-0.5' : 'right-5.5'}`} style={{ right: settings.enabled ? '2px' : '22px' }} />
                </span>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">كل كم جنيه = نقطة؟</label>
                  <input
                    type="number"
                    min={1}
                    value={settings.pointsPerCurrency || ''}
                    onChange={(e) => setSettings({ ...settings, pointsPerCurrency: Number(e.target.value) || 100 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">مثال: 100 = كل 100 ج.م يعطي نقطة</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">نقاط التسجيل</label>
                  <input
                    type="number"
                    min={0}
                    value={settings.signupPoints || ''}
                    onChange={(e) => setSettings({ ...settings, signupPoints: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">نقاط هدية أول ما العميل ينضم</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">الحد الأدنى للاستبدال</label>
                  <input
                    type="number"
                    min={0}
                    value={settings.minRedeemPoints || ''}
                    onChange={(e) => setSettings({ ...settings, minRedeemPoints: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">0 = بدون حد أدنى</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* سجل النقاط */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-3 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
            <Star size={15} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">سجل حركات النقاط</h3>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 mr-auto tabular-nums">{filteredLedger.length}</span>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="h-9 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none"
            >
              <option value="">كل العملاء</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {filteredLedger.length === 0 ? (
            <div className="text-center py-14">
              <Star size={36} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm font-bold text-slate-400">لا توجد حركات نقاط بعد</p>
              <p className="text-[11px] font-semibold text-slate-300 mt-1">أول ما الولاء يتفعل والعملاء يشتروا، الحركات هتظهر هنا</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">العميل</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الحركة</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">السبب</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الرصيد بعدها</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">بواسطة</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-900">{customerName(e.customerId)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-black tabular-nums ${e.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {e.delta > 0 ? `+${e.delta}` : e.delta}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-600">{REASON_LABELS[e.reason] || e.reason}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-900 tabular-nums">{e.balanceAfter}</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-400">{e.staffName || '—'}</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-400">{new Date(e.createdAt).toLocaleString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
