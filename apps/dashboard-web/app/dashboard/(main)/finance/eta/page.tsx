'use client';

import React, { useEffect, useState } from 'react';
import { ScanLine, CheckCircle2, Circle, Save, ExternalLink, ShieldCheck } from 'lucide-react';
import { readLocalRecord, writeLocalRecord } from '@/lib/localStore';
import LocalDataNotice from '@/components/LocalDataNotice';

type EtaConfig = {
  tin: string;
  nationalId: string;
  branchCode: string;
  activityCode: string;
};

const STEPS = [
  { id: 'data', label: 'بيانات النشاط الضريبي', desc: 'السجل التجاري والبطاقة الضريبية وسجل التاجر' },
  { id: 'device', label: 'تجهيز وحدة إصدار (ERP)', desc: 'الربط مع منظومة الضرائب المصرية عبر API' },
  { id: 'sign', label: 'التوقيع الإلكتروني', desc: 'توكن من مصر للمخاطر أو الحياد للتوقيع الرقمي' },
  { id: 'submit', label: 'إصدار أول فاتورة', desc: 'تجربة إرسال فاتورة واعتمادها من المنظومة' },
];

export default function EtaPage() {
  const [config, setConfig] = useState<EtaConfig>({ tin: '', nationalId: '', branchCode: '', activityCode: '' });
  const [saved, setSaved] = useState(false);
  const [doneSteps, setDoneSteps] = useState<string[]>([]);

  useEffect(() => {
    setConfig({ tin: '', nationalId: '', branchCode: '', activityCode: '', ...readLocalRecord<EtaConfig>('eta-config') });
    const s = readLocalRecord<{ steps: string[] }>('eta-steps').steps;
    setDoneSteps(s || []);
  }, []);

  const save = () => {
    writeLocalRecord('eta-config', config);
    writeLocalRecord('eta-steps', { steps: doneSteps });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const toggleStep = (id: string) => {
    setDoneSteps((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const progress = Math.round((doneSteps.length / STEPS.length) * 100);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <ScanLine size={22} className="text-teal-500" />
          الفاتورة الإلكترونية (ETA)
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-1">جهّز متجرك للربط مع منظومة الضرائب المصرية للفاتورة الإلكترونية</p>
      </div>

      <LocalDataNotice label="بيانات الربط محفوظة على جهازك مؤقتاً — الربط الفعلي مع منظومة الضرائب هيتم من خلال المنصة في التحديثات القادمة." />

      {/* Status card */}
      <div className={`rounded-2xl border p-5 mb-4 ${progress === 100 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${progress === 100 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">
                {progress === 100 ? 'جاهز للربط مع منظومة الضرائب' : progress > 0 ? 'قيد التجهيز' : 'غير مرتبط بعد'}
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-0.5">أكملت {doneSteps.length} من {STEPS.length} خطوات</div>
            </div>
          </div>
          <a href="https://eta.invoicing.eta.gov.eg/" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-[11px] font-black text-teal-600 hover:text-teal-700 transition-colors">
            بوابة الضرائب الإلكترونية
            <ExternalLink size={13} />
          </a>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-gradient-to-l from-[#00E5FF] to-[#BD00FF] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Setup steps */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h2 className="text-sm font-black text-slate-900 mb-4">خطوات التجهيز</h2>
        <div className="space-y-2">
          {STEPS.map((step, i) => {
            const done = doneSteps.includes(step.id);
            return (
              <button key={step.id} onClick={() => toggleStep(step.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all ${done ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 hover:bg-slate-100 border border-transparent'}`}>
                {done ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" /> : <Circle size={20} className="text-slate-300 shrink-0" />}
                <div className="flex-1">
                  <div className={`text-xs font-black ${done ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {i + 1}. {step.label}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">{step.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Registration data */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="text-sm font-black text-slate-900 mb-4">بيانات التسجيل الضريبي</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-1">الرقم الضريبي (TIN)</label>
            <input value={config.tin} onChange={(e) => setConfig({ ...config, tin: e.target.value })} placeholder="9 أرقام"
              className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-1">الرقم القومي / سجل التاجر</label>
            <input value={config.nationalId} onChange={(e) => setConfig({ ...config, nationalId: e.target.value })} placeholder="14 رقم"
              className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-1">كود الفرع في المنظومة</label>
            <input value={config.branchCode} onChange={(e) => setConfig({ ...config, branchCode: e.target.value })} placeholder="0 (المركز الرئيسي)"
              className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-1">كود النشاط (GS1)</label>
            <input value={config.activityCode} onChange={(e) => setConfig({ ...config, activityCode: e.target.value })} placeholder="مثال: 4711"
              className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
          </div>
        </div>
        <button onClick={save} className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors">
          <Save size={14} />
          {saved ? 'تم الحفظ ✓' : 'حفظ البيانات'}
        </button>
      </div>
    </div>
  );
}
