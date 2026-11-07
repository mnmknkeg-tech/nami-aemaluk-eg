import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Loader2,
  Lock,
  X,
} from 'lucide-react';
import type { CashMovement, Shift, ShiftReport } from '../../lib/api';
import { money } from './types';

type Props = {
  activeShift: Shift | null;
  showCloseShift: boolean;
  closingAmount: number;
  closingNote: string;
  closingBusy: boolean;
  closingError: string;
  onClosingAmountChange: (amount: number) => void;
  onClosingNoteChange: (note: string) => void;
  onSubmitCloseShift: () => void;
  onCloseCloseShift: () => void;
  showReport: boolean;
  report: ShiftReport | null;
  onCloseReport: () => void;
  onOpenCashMove: () => void;
  showCashMove: boolean;
  cashMoveKind: 'in' | 'out';
  cashMoveAmount: number;
  cashMoveNote: string;
  cashMoveBusy: boolean;
  onCashMoveKindChange: (kind: 'in' | 'out') => void;
  onCashMoveAmountChange: (amount: number) => void;
  onCashMoveNoteChange: (note: string) => void;
  onSubmitCashMove: () => void;
  onCloseCashMove: () => void;
};

export default function ShiftModals({
  activeShift,
  showCloseShift,
  closingAmount,
  closingNote,
  closingBusy,
  closingError,
  onClosingAmountChange,
  onClosingNoteChange,
  onSubmitCloseShift,
  onCloseCloseShift,
  showReport,
  report,
  onCloseReport,
  onOpenCashMove,
  showCashMove,
  cashMoveKind,
  cashMoveAmount,
  cashMoveNote,
  cashMoveBusy,
  onCashMoveKindChange,
  onCashMoveAmountChange,
  onCashMoveNoteChange,
  onSubmitCashMove,
  onCloseCashMove,
}: Props) {
  return (
    <>
      {showCloseShift && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                <Lock size={26} className="text-red-500" />
              </div>
              <h2 className="text-xl font-black text-slate-900">إغلاق الوردية</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">
                اكتب الفلوس اللي في الدرج فعليًا
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">الفلوس في الدرج</label>
              <input
                type="number"
                min={0}
                value={closingAmount || ''}
                onChange={(event) => onClosingAmountChange(Number(event.target.value) || 0)}
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center focus:ring-2 focus:ring-[#BD00FF]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">ملاحظة (اختياري)</label>
              <input
                type="text"
                value={closingNote}
                onChange={(event) => onClosingNoteChange(event.target.value)}
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black focus:ring-2 focus:ring-[#BD00FF]"
              />
            </div>
            {activeShift && (
              <div className="p-3 rounded-xl bg-slate-50 text-[11px] font-black text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>العهدة الافتتاحية</span>
                  <span>{money(activeShift.openingAmount)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>مبيعات الوردية</span>
                  <span>{money(activeShift.totalSales)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>المتوقع في الدرج</span>
                  <span>{money(activeShift.openingAmount + activeShift.totalSales)} ج.م</span>
                </div>
              </div>
            )}
            {closingError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center">
                {closingError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSubmitCloseShift}
                disabled={closingBusy}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {closingBusy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                إغلاق
              </button>
              <button
                type="button"
                onClick={onCloseCloseShift}
                className="flex-1 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 font-black text-sm text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && report && report.shift && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">تقرير الوردية (X)</h2>
              <button
                type="button"
                onClick={onCloseReport}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'العهدة الافتتاحية', value: report.opening },
                { label: 'مبيعات كاش', value: report.cashSales },
                { label: 'فلوس داخلية', value: report.cashIn },
                { label: 'فلوس خارجية', value: report.cashOut },
                { label: 'الدرج الصافي', value: report.netCash },
                { label: 'عدد الفواتير', value: report.shift.ordersCount, plain: true },
              ].map((row) => (
                <div key={row.label} className="p-3 rounded-2xl bg-slate-50 text-center">
                  <p className="text-[10px] font-black text-slate-400">{row.label}</p>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {row.plain ? row.value : `${money(Number(row.value))} ج.م`}
                  </p>
                </div>
              ))}
            </div>
            {report.pendingSync > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold flex items-center gap-1.5">
                <AlertTriangle size={13} />
                {report.pendingSync} فاتورة لسه هتتزامن مع السيرفر
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs font-black text-slate-500">آخر حركات الكاش</p>
              {report.movements.length === 0 && (
                <p className="text-[11px] font-bold text-slate-300">مفيش حركات</p>
              )}
              {report.movements.map((movement: CashMovement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between text-xs font-black bg-slate-50 rounded-xl px-3 py-2"
                >
                  <span className="flex items-center gap-1.5">
                    {movement.kind === 'in' ? (
                      <ArrowDownToLine size={13} className="text-emerald-500" />
                    ) : (
                      <ArrowUpFromLine size={13} className="text-red-500" />
                    )}
                    {movement.kind === 'in' ? 'داخل' : 'خارج'}
                    {movement.note ? ` — ${movement.note}` : ''}
                  </span>
                  <span>{money(movement.amount)} ج.م</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenCashMove}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2"
            >
              <Coins size={16} />
              تسجيل حركة كاش
            </button>
          </div>
        </div>
      )}

      {showCashMove && (
        <div className="fixed inset-0 z-[10060] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-black text-slate-900">حركة كاش</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">
                فلوس داخلة للدرج أو خارجة منه (مش بيع)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'in', label: 'داخل (إيداع)', icon: ArrowDownToLine },
                  { id: 'out', label: 'خارج (سحب)', icon: ArrowUpFromLine },
                ] as const
              ).map((movement) => {
                const Icon = movement.icon;
                return (
                  <button
                    key={movement.id}
                    type="button"
                    onClick={() => onCashMoveKindChange(movement.id)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-black transition-all ${
                      cashMoveKind === movement.id
                        ? 'border-[#BD00FF] bg-[#BD00FF]/5 text-[#BD00FF]'
                        : 'border-slate-100 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Icon size={16} />
                    {movement.label}
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min={0}
              value={cashMoveAmount || ''}
              onChange={(event) => onCashMoveAmountChange(Number(event.target.value) || 0)}
              placeholder="المبلغ"
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center focus:ring-2 focus:ring-[#BD00FF]"
            />
            <input
              type="text"
              value={cashMoveNote}
              onChange={(event) => onCashMoveNoteChange(event.target.value)}
              placeholder="السبب (اختياري)"
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black focus:ring-2 focus:ring-[#BD00FF]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSubmitCashMove}
                disabled={cashMoveBusy}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {cashMoveBusy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Coins size={16} />
                )}
                تسجيل
              </button>
              <button
                type="button"
                onClick={onCloseCashMove}
                className="flex-1 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-black text-sm text-slate-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
