import { CheckCircle2, Printer } from 'lucide-react';
import type { Order, OrderItem } from '../../lib/api';
import { money } from './types';

type Props = {
  receipt: { order: Order; items: OrderItem[] } | null;
  onPrint: (receipt: { order: Order; items: OrderItem[] }) => void;
  onClose: () => void;
};

export default function ReceiptModal({ receipt, onPrint, onClose }: Props) {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-1">
          <CheckCircle2 size={30} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-black text-slate-900">تمت العملية ✅</h2>
        <p className="text-xs font-bold text-slate-400">
          فاتورة #{receipt.order.id.slice(0, 8)} — ج.م {money(receipt.order.total)}
          {!receipt.order.synced && (
            <span className="block text-amber-500 mt-1">
              (محفوظة محليًا — هتتزامن أول ما النت يرجع)
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => onPrint(receipt)}
          className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all"
        >
          <Printer size={18} />
          طباعة الإيصال
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-50 border border-slate-100 font-black text-sm text-slate-600 hover:bg-slate-100 transition-all"
        >
          بيع جديد
        </button>
      </div>
    </div>
  );
}
