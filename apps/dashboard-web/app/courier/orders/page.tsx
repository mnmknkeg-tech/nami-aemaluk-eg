'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, apiRequest } from '@/lib/auth';
import { Package, MapPin, Loader2 } from 'lucide-react';

export default function CourierOrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || String(user.role || '').toLowerCase() !== 'courier')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && String(user.role || '').toLowerCase() === 'courier') {
      apiRequest('/courier/orders')
        .then((data) => setOrders(data?.orders || data || []))
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [user]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">طلبات التوصيل</h1>
        </div>
        {orders.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
            <MapPin size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 font-bold text-sm">لا توجد طلبات حالياً</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-slate-100 rounded-2xl p-6">
                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="text-right">
                    <div className="font-black text-slate-900">#{order.id?.slice(0, 8)}</div>
                    <div className="text-xs font-bold text-slate-400 mt-1">{order.customerName || 'عميل'}</div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                    {order.status || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
