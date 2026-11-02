'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Headset, MessageSquare, Plus, Star, Ticket, UserRound } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import {
  InvEmpty,
  InvLoading,
  InvToolButton,
  InventoryPage,
} from '@/components/inventory/InventoryShell';

type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
type ServiceTicket = {
  id: string;
  status: TicketStatus;
  subject?: string;
  customerName?: string;
  createdAt?: string;
};

const STATUS_TABS: { id: 'all' | TicketStatus; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'open', label: 'مفتوح' },
  { id: 'in_progress', label: 'قيد المعالجة' },
  { id: 'pending', label: 'بانتظار رد' },
  { id: 'resolved', label: 'تم الحل' },
  { id: 'closed', label: 'مغلق' },
];

export default function CustomerServicePage() {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<'all' | TicketStatus>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shop = await apiRequest('/shops/me');
      if (!shop?.id) return;
      const response = await apiRequest(`/tickets/shop/${shop.id}`);
      const rows = Array.isArray(response) ? response : response?.data || [];
      setTickets(
        rows.map((item: any) => ({
          id: String(item.id),
          status: item.status || 'open',
          subject: item.subjectAr || item.subject_ar || item.subject,
          customerName: item.customerName || item.customer_name,
          createdAt: item.createdAt || item.created_at,
        }))
      );
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const values = Object.fromEntries(
      STATUS_TABS.map(({ id }) => [
        id,
        id === 'all' ? tickets.length : tickets.filter((ticket) => ticket.status === id).length,
      ])
    );
    return values as Record<'all' | TicketStatus, number>;
  }, [tickets]);

  const visibleTickets =
    active === 'all' ? tickets : tickets.filter((ticket) => ticket.status === active);

  return (
    <InventoryPage
      title="خدمة العملاء"
      subtitle="تابع التذاكر والمحادثات والتقييمات من مكان واحد"
      actions={
        <>
          <InvToolButton onClick={load} title="تحديث البيانات">
            تحديث
          </InvToolButton>
          <Link
            href="/dashboard/crm/tickets"
            className="h-9 px-4 rounded-full text-[12px] font-bold flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-700 transition-colors"
          >
            <Plus size={15} /> تذكرة جديدة
          </Link>
        </>
      }
    >
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 flex gap-1 overflow-x-auto border-b border-slate-100">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`h-8 px-3 rounded-full whitespace-nowrap text-[12px] font-bold transition-colors ${active === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {tab.label}{' '}
              <span className={`mr-1 ${active === tab.id ? 'text-white/75' : 'text-slate-400'}`}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-x-reverse divide-slate-100">
          <Link
            href="/dashboard/crm/tickets"
            className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <span className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 grid place-items-center">
              <Ticket size={17} />
            </span>
            <span>
              <b className="block text-sm text-slate-800">التذاكر</b>
              <small className="text-xs text-slate-400">إدارة طلبات العملاء</small>
            </span>
          </Link>
          <Link
            href="/dashboard/crm/chats"
            className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
              <MessageSquare size={17} />
            </span>
            <span>
              <b className="block text-sm text-slate-800">المحادثات</b>
              <small className="text-xs text-slate-400">الرد السريع على العملاء</small>
            </span>
          </Link>
          <Link
            href="/dashboard/crm/reviews"
            className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 grid place-items-center">
              <Star size={17} />
            </span>
            <span>
              <b className="block text-sm text-slate-800">التقييمات</b>
              <small className="text-xs text-slate-400">متابعة رضا العملاء</small>
            </span>
          </Link>
        </div>
      </div>

      {loading ? (
        <InvLoading />
      ) : visibleTickets.length === 0 ? (
        <InvEmpty
          icon={Headset}
          title={active === 'all' ? 'لا توجد تذاكر حتى الآن' : 'لا توجد تذاكر بهذه الحالة'}
        >
          <Link
            href="/dashboard/crm/tickets"
            className="text-xs font-bold text-slate-700 underline"
          >
            فتح صفحة التذاكر
          </Link>
        </InvEmpty>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] px-4 py-3 bg-slate-50 text-[11px] font-bold text-slate-400">
            <span>أحدث التذاكر</span>
            <span>الحالة</span>
          </div>
          {visibleTickets.slice(0, 5).map((ticket) => (
            <Link
              key={ticket.id}
              href="/dashboard/crm/tickets"
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-3.5 border-t border-slate-100 hover:bg-slate-50"
            >
              <span className="min-w-0">
                <b className="block text-sm text-slate-800 truncate">
                  {ticket.subject || 'تذكرة خدمة عملاء'}
                </b>
                <small className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                  <UserRound size={12} /> {ticket.customerName || 'عميل'}
                </small>
              </span>
              <span className="self-center text-[11px] font-bold rounded-full px-2 py-1 bg-slate-100 text-slate-600">
                {STATUS_TABS.find((tab) => tab.id === ticket.status)?.label || ticket.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </InventoryPage>
  );
}
