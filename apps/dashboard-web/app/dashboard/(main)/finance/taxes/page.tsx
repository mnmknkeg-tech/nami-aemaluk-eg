'use client';

/**
 * الضرائب — محرك ضرائب مرن: أنواع الضرائب + الفترات المالية والإقرارات + ملخص.
 * الإقرارات تتولد من القيود المرحّلة (ضريبة مخرجات - مدخلات) وتُقدَّم من هنا.
 */
import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { Receipt, Loader2, Plus, Edit, Trash2, X, Percent, CheckCircle2, RefreshCw, CalendarClock, FileText, Send, Lock, Unlock } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  INV_PAGE_FONT,
  SectionTabs,
  useInvSectionTab,
  InvControlsCard,
  InvToolbar,
  InvToolButton,
  InvLoading,
} from '@/components/inventory/InventoryShell';

type Tax = {
  id: string;
  name: string;
  rate: number;
  taxType: 'vat' | 'wht' | 'other';
  isDefault: boolean;
  status: 'active' | 'inactive';
};

type Period = {
  id: string; shop_id: string; name: string;
  start_date: string; end_date: string;
  status: 'open' | 'closed'; closed_at: string;
};

type TaxReturn = {
  id: string; period_year: number; period_month: number;
  output_tax: number; input_tax: number; net_tax: number;
  sales_total: number; purchases_total: number;
  status: 'draft' | 'submitted'; generated_at: string; submitted_at: string;
};

const TYPE_META: Record<string, { label: string; cls: string }> = {
  vat: { label: 'ضريبة القيمة المضافة', cls: 'bg-emerald-100 text-emerald-700' },
  wht: { label: 'استقطاع تحت حساب الضريبة', cls: 'bg-amber-100 text-amber-700' },
  other: { label: 'أخرى', cls: 'bg-slate-100 text-slate-600' },
};

const MONTHS_AR = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const SECTION_TABS = [
  { id: 'rates', label: 'أنواع الضرائب' },
  { id: 'periods', label: 'الفترات والإقرارات' },
  { id: 'summary', label: 'ملخص الضرائب' },
];

function TaxesContent() {
  const [activeTab, setTab] = useInvSectionTab(SECTION_TABS.map(t => t.id), 'rates');
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [returns, setReturns] = useState<TaxReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterType, setFilterType] = useState('all');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTax, setEditTax] = useState<Tax | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shopId, setShopId] = useState('');
  const [form, setForm] = useState({ name: '', rate: 14, taxType: 'vat' as Tax['taxType'], isDefault: false });
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      setShopId(sid);
      const [taxRes, periodRes, returnRes] = await Promise.all([
        apiRequest(`/accounting/tax-rates/shop/${sid}`),
        apiRequest(`/accounting/fiscal-periods/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/accounting/tax-returns/shop/${sid}`).catch(() => ({ data: [] })),
      ]);
      const taxData = Array.isArray(taxRes) ? taxRes : (taxRes?.data || []);
      setTaxes(taxData.map((t: any) => ({
        id: String(t.id),
        name: t.name || '---',
        rate: Number(t.rate || 0),
        taxType: t.tax_type || t.taxType || 'other',
        isDefault: Boolean(t.is_default ?? t.isDefault),
        status: (t.status || 'active') as Tax['status'],
      })));
      setPeriods(Array.isArray(periodRes) ? periodRes : (periodRes?.data || []));
      setReturns(Array.isArray(returnRes) ? returnRes : (returnRes?.data || []));
    } catch { setTaxes([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => taxes
    .filter(t => t.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .filter(t => filterType === 'all' || t.taxType === filterType), [taxes, debouncedSearch, filterType]);

  const openAdd = () => {
    setForm({ name: '', rate: 14, taxType: 'vat', isDefault: false });
    setEditTax(null); setError(''); setModal('add');
  };

  const openEdit = (t: Tax) => {
    setForm({ name: t.name, rate: t.rate, taxType: t.taxType, isDefault: t.isDefault });
    setEditTax(t); setError(''); setModal('edit');
  };

  const save = async () => {
    if (!form.name || form.rate < 0 || form.rate > 100) { setError('أدخل اسمًا صحيحًا ونسبة بين 0 و 100'); return; }
    setSaving(true); setError('');
    try {
      if (modal === 'edit' && editTax) {
        await apiRequest(`/accounting/tax-rates/${editTax.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: form.name, rate: form.rate, status: editTax.status }),
        });
      } else {
        await apiRequest(`/accounting/tax-rates/shop/${shopId}`, {
          method: 'POST',
          body: JSON.stringify({ name: form.name, rate: form.rate, tax_type: form.taxType, is_default: form.isDefault }),
        });
      }
      setModal(null);
      await load();
    } catch (e: any) { setError(e?.message || 'تعذر الحفظ'); } finally { setSaving(false); }
  };

  const toggleStatus = async (t: Tax) => {
    try {
      await apiRequest(`/accounting/tax-rates/${t.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: t.status === 'active' ? 'inactive' : 'active' }),
      });
      await load();
    } catch (e: any) { alert(e?.message || 'تعذر التحديث'); }
  };

  const remove = async (t: Tax) => {
    if (!confirm(`حذف الضريبة "${t.name}"؟`)) return;
    try {
      await apiRequest(`/accounting/tax-rates/${t.id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) { alert(e?.message || 'تعذر الحذف'); }
  };

  // الفترات المالية
  const createPeriod = async () => {
    setBusy(true);
    try {
      await apiRequest(`/accounting/fiscal-periods/shop/${shopId}`, {
        method: 'POST',
        body: JSON.stringify({ year: newYear, month: newMonth }),
      });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  const closePeriod = async (p: Period) => {
    if (!confirm('إقفال الفترة؟ لن يمكن الترحيل لأي قيود داخلها بعد الآن.')) return;
    setBusy(true);
    try {
      await apiRequest(`/accounting/fiscal-periods/${p.id}/close`, { method: 'POST' });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  const reopenPeriod = async (p: Period) => {
    if (!confirm('إعادة فتح الفترة؟ سيُسمح بالترحيل داخلها مجددًا.')) return;
    setBusy(true);
    try {
      await apiRequest(`/accounting/fiscal-periods/${p.id}/reopen`, { method: 'POST' });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  // الإقرارات الضريبية
  const generateReturn = async () => {
    setBusy(true);
    try {
      await apiRequest(`/accounting/tax-returns/shop/${shopId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ year: newYear, month: newMonth }),
      });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  const submitReturn = async (r: TaxReturn) => {
    if (!confirm(`تقديم إقرار ${MONTHS_AR[r.period_month]} ${r.period_year}؟ الصافي المستحق: ${r.net_tax.toLocaleString('en-US')} ج.م`)) return;
    setBusy(true);
    try {
      await apiRequest(`/accounting/tax-returns/${r.id}/submit`, { method: 'POST' });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  // ملخص الضرائب من الإقرارات
  const summary = useMemo(() => {
    const submitted = returns.filter(r => r.status === 'submitted');
    const output = returns.reduce((s, r) => s + Number(r.output_tax || 0), 0);
    const input = returns.reduce((s, r) => s + Number(r.input_tax || 0), 0);
    const net = returns.reduce((s, r) => s + Number(r.net_tax || 0), 0);
    const sales = returns.reduce((s, r) => s + Number(r.sales_total || 0), 0);
    return { submittedCount: submitted.length, output, input, net, sales };
  }, [returns]);

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">الضرائب</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">أنواع الضرائب حسب نشاطك ودولتك — الفترات المالية والإقرارات والملخص</p>
          </div>
        </div>
      </div>

      <SectionTabs tabs={SECTION_TABS} active={activeTab} onChange={setTab} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
        {activeTab === 'rates' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'عدد الضرائب', val: String(taxes.length) },
                { label: 'ضرائب نشطة', val: String(taxes.filter(t => t.status === 'active').length) },
                { label: 'الضريبة الافتراضية', val: taxes.find(t => t.isDefault) ? `${taxes.find(t => t.isDefault)!.rate}%` : '—' },
                { label: 'أعلى نسبة', val: taxes.length ? `${Math.max(...taxes.map(t => t.rate))}%` : '—' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <span className="text-slate-500 font-semibold text-xs">{s.label}</span>
                  <div className="text-xl font-black text-slate-900 mt-1">{s.val}</div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <InvToolbar hint="الضرائب قابلة للتهيئة حسب الدولة والنشاط — تُستخدم في الفواتير عند التحديد">
                <InvToolButton primary onClick={openAdd}>
                  <Plus size={14} />
                  ضريبة جديدة
                </InvToolButton>
              </InvToolbar>
            </div>

            <div className="mt-3">
              <InvControlsCard
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="ابحث باسم الضريبة..."
                filters={
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none">
                    <option value="all">كل الأنواع</option>
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                }
              />
            </div>

            <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-x-auto">
              {loading ? (
                <InvLoading />
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt size={32} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400 font-bold text-sm">لا توجد ضرائب — أضف أول ضريبة مثل &quot;ضريبة القيمة المضافة 14%&quot;</p>
                </div>
              ) : (
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-500">
                      <th className="p-4 text-right">الاسم</th>
                      <th className="p-4 text-right">النوع</th>
                      <th className="p-4 text-left">النسبة</th>
                      <th className="p-4 text-right">الحالة</th>
                      <th className="p-4 text-left w-28">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-800 text-sm">
                          {t.name}
                          {t.isDefault && <span className="mr-2 text-[10px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-lg font-black">افتراضية</span>}
                        </td>
                        <td className="p-4"><span className={`px-2 py-1 rounded-lg text-[10px] font-black ${TYPE_META[t.taxType]?.cls || ''}`}>{TYPE_META[t.taxType]?.label || t.taxType}</span></td>
                        <td className="p-4 text-left font-mono font-black text-slate-700">{fmt(t.rate)}%</td>
                        <td className="p-4">
                          <button onClick={() => toggleStatus(t)} className={`px-2 py-1 rounded-lg text-[10px] font-black ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {t.status === 'active' ? 'نشطة' : 'معطلة'}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="تعديل"><Edit size={15} /></button>
                            <button onClick={() => remove(t)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400" title="حذف"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === 'periods' && (
          <>
            <div className="mt-4">
              <InvToolbar hint="الفترات المالية الشهرية — الإقفال يمنع الترحيل داخل الفترة، والإقرارات تتولد من القيود المرحّلة">
                <InvToolButton onClick={() => load()}>
                  <RefreshCw size={14} />
                  تحديث
                </InvToolButton>
              </InvToolbar>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* الفترات المالية */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-black text-slate-700 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2"><CalendarClock size={15} /> الفترات المالية</span>
                  <span className="flex items-center gap-1.5">
                    <select value={newMonth} onChange={e => setNewMonth(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold">
                      {MONTHS_AR.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={newYear} onChange={e => setNewYear(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold">
                      {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={createPeriod} disabled={busy} className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-black disabled:opacity-50">
                      <Plus size={12} className="inline" /> إنشاء
                    </button>
                  </span>
                </div>
                {loading ? (
                  <InvLoading />
                ) : periods.length === 0 ? (
                  <div className="py-10 text-center">
                    <CalendarClock size={30} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-400 font-bold text-sm">لا فترات — أنشئ فترة الشهر الحالي للبدء</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-[380px] overflow-y-auto">
                    {periods.sort((a, b) => String(b.start_date).localeCompare(String(a.start_date))).map(p => (
                      <div key={p.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="font-black text-slate-800 text-sm">{p.name || `${MONTHS_AR[new Date(p.start_date).getMonth() + 1]} ${new Date(p.start_date).getFullYear()}`}</div>
                          <div className="text-[11px] font-bold text-slate-400">{new Date(p.start_date).toLocaleDateString('ar-EG')} → {new Date(p.end_date).toLocaleDateString('ar-EG')}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${p.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {p.status === 'open' ? 'مفتوحة' : 'مقفولة'}
                          </span>
                          {p.status === 'open' ? (
                            <button onClick={() => closePeriod(p)} disabled={busy} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="إقفال"><Lock size={14} /></button>
                          ) : (
                            <button onClick={() => reopenPeriod(p)} disabled={busy} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="إعادة فتح"><Unlock size={14} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* الإقرارات الضريبية */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-black text-slate-700 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2"><FileText size={15} /> الإقرارات الضريبية</span>
                  <button onClick={generateReturn} disabled={busy} className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-black flex items-center gap-1 disabled:opacity-50">
                    <RefreshCw size={12} /> توليد إقرار {MONTHS_AR[newMonth]} {newYear}
                  </button>
                </div>
                {loading ? (
                  <InvLoading />
                ) : returns.length === 0 ? (
                  <div className="py-10 text-center">
                    <FileText size={30} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-400 font-bold text-sm">لا إقرارات — ولّد إقرارًا للفترة من زر التوليد</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-[380px] overflow-y-auto">
                    {returns.sort((a, b) => (b.period_year - a.period_year) || (b.period_month - a.period_month)).map(r => (
                      <div key={r.id} className="px-4 py-3 hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="font-black text-slate-800 text-sm">إقرار {MONTHS_AR[r.period_month]} {r.period_year}</div>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${r.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {r.status === 'submitted' ? 'مُقدَّم' : 'مسودة'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] font-bold">
                          <div className="bg-slate-50 rounded-lg p-2">
                            <span className="text-slate-400 block">ضريبة مخرجات</span>
                            <span className="text-emerald-700">ج.م {fmt(r.output_tax)}</span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2">
                            <span className="text-slate-400 block">ضريبة مدخلات</span>
                            <span className="text-sky-700">ج.م {fmt(r.input_tax)}</span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2">
                            <span className="text-slate-400 block">الصافي المستحق</span>
                            <span className={`font-black ${r.net_tax >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>ج.م {fmt(r.net_tax)}</span>
                          </div>
                        </div>
                        {r.status === 'draft' && (
                          <button onClick={() => submitReturn(r)} disabled={busy} className="mt-2 w-full py-2 rounded-lg bg-slate-900 text-white text-[11px] font-black flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <Send size={12} /> تقديم الإقرار
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'summary' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <span className="text-slate-500 font-semibold text-xs block">ضريبة المخرجات (على المبيعات)</span>
                <div className="text-lg font-black text-emerald-700 mt-1">ج.م {fmt(summary.output)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <span className="text-slate-500 font-semibold text-xs block">ضريبة المدخلات (على المشتريات)</span>
                <div className="text-lg font-black text-sky-700 mt-1">ج.م {fmt(summary.input)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <span className="text-slate-500 font-semibold text-xs block">الصافي المستحق</span>
                <div className={`text-lg font-black mt-1 ${summary.net >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>ج.م {fmt(summary.net)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <span className="text-slate-500 font-semibold text-xs block">إقرارات مُقدَّمة</span>
                <div className="text-lg font-black text-slate-900 mt-1">{summary.submittedCount} من {returns.length}</div>
              </div>
            </div>
            <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <Percent size={30} className="mx-auto mb-2 text-slate-300" />
              {returns.length === 0 ? (
                <p className="text-slate-400 font-bold text-sm">الملخص يُبنى من الإقرارات — ولّد إقرارًا من تبويب الفترات والإقرارات أولًا</p>
              ) : (
                <p className="text-slate-500 font-bold text-sm">
                  إجمالي المبيعات الخاضعة عبر الفترات: ج.م {fmt(summary.sales)} — الصافي {summary.net >= 0 ? 'مستحق للسلطة الضريبية' : 'قابل للخصم في الفترة القادمة'}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900">{modal === 'edit' ? 'تعديل ضريبة' : 'ضريبة جديدة'}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">{error}</div>}
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">اسم الضريبة</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: ضريبة القيمة المضافة" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
            </div>
            {modal === 'add' && (
              <>
                <div>
                  <label className="text-xs font-black text-slate-600 block mb-1">النوع</label>
                  <select value={form.taxType} onChange={e => setForm({ ...form, taxType: e.target.value as Tax['taxType'] })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white">
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} className="w-4 h-4" />
                  تعيين كضريبة افتراضية على الفواتير
                </label>
              </>
            )}
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">النسبة (%)</label>
              <input type="number" min={0} max={100} step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" dir="ltr" />
            </div>
            <button onClick={save} disabled={saving || !form.name} className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {modal === 'edit' ? 'حفظ التعديلات' : 'إضافة الضريبة'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaxesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <TaxesContent />
    </Suspense>
  );
}
