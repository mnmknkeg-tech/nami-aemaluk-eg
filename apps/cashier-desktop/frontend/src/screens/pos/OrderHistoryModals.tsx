import { Trash2, X } from 'lucide-react';
import type { HeldOrder, Order } from '../../lib/api';
import { money } from './types';

type Props = {
  heldOrders: HeldOrder[];
  showHeld: boolean;
  onCloseHeld: () => void;
  onResumeHeld: (order: HeldOrder) => void;
  onDeleteHeld: (id: string) => Promise<void>;
  invoices: Order[];
  showInvoices: boolean;
  onCloseInvoices: () => void;
};

export default function OrderHistoryModals({
  heldOrders,
  showHeld,
  onCloseHeld,
  onResumeHeld,
  onDeleteHeld,
  invoices,
  showInvoices,
  onCloseInvoices,
}: Props) {
  return (
    <>
      {showHeld && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">الطلبات المعلقة</h2>
              <button
                type="button"
                onClick={onCloseHeld}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            {heldOrders.length === 0 && (
              <p className="text-xs font-bold text-slate-300 text-center py-6">مفيش طلبات معلقة</p>
            )}
            {heldOrders.map((heldOrder) => (
              <div
                key={heldOrder.id}
                className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3"
              >
                <div>
                  <p className="text-xs font-black text-slate-800">{heldOrder.label}</p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {new Date(heldOrder.createdAt + 'Z').toLocaleString('ar-EG')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onResumeHeld(heldOrder)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600"
                  >
                    استكمال
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteHeld(heldOrder.id)}
                    className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-[11px] font-black hover:bg-red-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvoices && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">فواتير الكاشير</h2>
              <button
                type="button"
                onClick={onCloseInvoices}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            {invoices.length === 0 && (
              <p className="text-xs font-bold text-slate-300 text-center py-6">مفيش فواتير</p>
            )}
            {invoices.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3"
              >
                <div>
                  <p className="text-xs font-black text-slate-800">
                    #{order.id.slice(0, 8)} — ج.م {money(order.total)}
                    {!order.synced && <span className="text-amber-500"> (في انتظار المزامنة)</span>}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {order.cashierName || '-'} •{' '}
                    {new Date(order.createdAt + 'Z').toLocaleString('ar-EG')}
                  </p>
                </div>
                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-white border border-slate-100 text-slate-500">
                  {order.paymentMethod === 'COD'
                    ? 'كاش'
                    : order.paymentMethod === 'CARD'
                      ? 'بطاقة'
                      : order.paymentMethod === 'WALLET'
                        ? 'محفظة'
                        : 'آجل'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
