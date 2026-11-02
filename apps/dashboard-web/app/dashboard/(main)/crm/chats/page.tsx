'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Download,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Info,
  User,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InventoryPage,
  InvToolButton,
  InvPagination,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Chat = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  status: 'open' | 'closed' | 'pending' | 'resolved';
  assignedTo: string;
  unreadCount: number;
  messageCount: number;
  channel: 'web' | 'mobile' | 'email' | 'social';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editChat, setEditChat] = useState<Chat | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    status: 'open' as 'open' | 'closed' | 'pending' | 'resolved',
    assignedTo: '',
    channel: 'web' as 'web' | 'mobile' | 'email' | 'social',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    tags: '',
  });

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/chats/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setChats(
        data.map((c: any) => ({
          id: String(c.id),
          customerName: c.customerName || c.customer_name || '---',
          customerEmail: c.customerEmail || c.customer_email || '---',
          customerPhone: c.customerPhone || c.customer_phone || '---',
          lastMessage: c.lastMessage || c.last_message || '---',
          lastMessageTime: c.lastMessageTime || c.last_message_time || new Date().toISOString(),
          status: c.status || 'open',
          assignedTo: c.assignedTo || c.assigned_to || '---',
          unreadCount: Number(c.unreadCount || c.unread_count || 0),
          messageCount: Number(c.messageCount || c.message_count || 0),
          channel: c.channel || 'web',
          priority: c.priority || 'medium',
          tags: c.tags || [],
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const filtered = useMemo(() => {
    let result = chats.filter(
      (c) =>
        c.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.customerEmail.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.customerPhone.includes(debouncedSearch) ||
        c.lastMessage.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    if (filterStatus !== 'all') {
      result = result.filter((c) => c.status === filterStatus);
    }

    if (filterChannel !== 'all') {
      result = result.filter((c) => c.channel === filterChannel);
    }

    if (filterPriority !== 'all') {
      result = result.filter((c) => c.priority === filterPriority);
    }

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'customerName'
          ? a.customerName
          : sortBy === 'unreadCount'
            ? a.unreadCount
            : sortBy === 'messageCount'
              ? a.messageCount
              : a.updatedAt;
      const bVal =
        sortBy === 'customerName'
          ? b.customerName
          : sortBy === 'unreadCount'
            ? b.unreadCount
            : sortBy === 'messageCount'
              ? b.messageCount
              : b.updatedAt;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [chats, debouncedSearch, filterStatus, filterChannel, filterPriority, sortBy, sortOrder]);

  const paginatedChats = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedChats.length && paginatedChats.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedChats.map((c) => c.id)));
    }
  }, [paginatedChats, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} محادثة؟`)) return;
    try {
      // TODO: Implement bulk delete API call
      alert(`تم حذف ${selectedIds.size} محادثة`);
      setSelectedIds(new Set());
      loadChats();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  }, [selectedIds, loadChats]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Last Message',
      'Last Message Time',
      'Status',
      'Assigned To',
      'Unread Count',
      'Message Count',
      'Channel',
      'Priority',
      'Tags',
      'Created At',
    ];
    const rows = filtered.map((c) => [
      c.customerName,
      c.customerEmail,
      c.customerPhone,
      c.lastMessage,
      c.lastMessageTime,
      c.status,
      c.assignedTo,
      c.unreadCount,
      c.messageCount,
      c.channel,
      c.priority,
      c.tags.join(', '),
      c.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'chats.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'chats.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/chats', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          shopId: sid,
          tags: formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t),
        }),
      });
      setAddModal(false);
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        status: 'open',
        assignedTo: '',
        channel: 'web',
        priority: 'medium',
        tags: '',
      });
      loadChats();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة المحادثة');
    }
  }, [formData, loadChats]);

  const handleEdit = useCallback(async () => {
    if (!editChat) return;
    try {
      await apiRequest(`/chats/${editChat.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          tags: formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t),
        }),
      });
      setEditModal(false);
      setEditChat(null);
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        status: 'open',
        assignedTo: '',
        channel: 'web',
        priority: 'medium',
        tags: '',
      });
      loadChats();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل المحادثة');
    }
  }, [editChat, formData, loadChats]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;
      try {
        await apiRequest(`/chats/${id}`, { method: 'DELETE' });
        loadChats();
      } catch (error) {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadChats]
  );

  const openEditModal = useCallback((chat: Chat) => {
    setEditChat(chat);
    setFormData({
      customerName: chat.customerName,
      customerEmail: chat.customerEmail,
      customerPhone: chat.customerPhone,
      status: chat.status,
      assignedTo: chat.assignedTo,
      channel: chat.channel,
      priority: chat.priority,
      tags: chat.tags.join(', '),
    });
    setEditModal(true);
  }, []);

  const STATUS_CONFIG = {
    open: { label: 'مفتوح', color: 'bg-blue-50 text-blue-600' },
    closed: { label: 'مغلق', color: 'bg-slate-50 text-slate-600' },
    pending: { label: 'معلق', color: 'bg-amber-50 text-amber-600' },
    resolved: { label: 'تم الحل', color: 'bg-green-50 text-green-600' },
  };

  const CHANNEL_CONFIG = {
    web: { label: 'ويب', color: 'bg-blue-50 text-blue-600' },
    mobile: { label: 'موبايل', color: 'bg-purple-50 text-purple-600' },
    email: { label: 'إيميل', color: 'bg-green-50 text-green-600' },
    social: { label: 'سوشيال', color: 'bg-amber-50 text-amber-600' },
  };

  const PRIORITY_CONFIG = {
    low: { label: 'منخفض', color: 'bg-slate-50 text-slate-600' },
    medium: { label: 'متوسط', color: 'bg-blue-50 text-blue-600' },
    high: { label: 'عالي', color: 'bg-amber-50 text-amber-600' },
    urgent: { label: 'عاجل', color: 'bg-red-50 text-red-600' },
  };

  const statusTabs = [
    { id: 'all', label: 'الكل', count: chats.length },
    { id: 'open', label: 'مفتوح', count: chats.filter((c) => c.status === 'open').length },
    { id: 'pending', label: 'معلق', count: chats.filter((c) => c.status === 'pending').length },
    {
      id: 'resolved',
      label: 'تم الحل',
      count: chats.filter((c) => c.status === 'resolved').length,
    },
    { id: 'closed', label: 'مغلق', count: chats.filter((c) => c.status === 'closed').length },
  ];

  return (
    <>
      <InventoryPage
        title="المحادثات"
        subtitle="إدارة محادثات العملاء عبر القنوات المختلفة"
        onInfo={() => setGuideOpen(true)}
        actions={
          <>
            <InvToolButton primary onClick={() => setAddModal(true)}>
              <Plus size={14} /> محادثة جديدة
            </InvToolButton>
            <InvToolButton onClick={exportCSV}>
              <Download size={14} /> تصدير CSV
            </InvToolButton>
          </>
        }
        tabs={statusTabs}
        activeTab={filterStatus}
        onTabChange={(id) => {
          setFilterStatus(id);
          setCurrentPage(1);
        }}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="بحث بالعميل أو الرسالة…"
        filters={
          <>
            <select
              value={filterChannel}
              onChange={(e) => {
                setFilterChannel(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
            >
              <option value="all">كل القنوات</option>
              <option value="web">ويب</option>
              <option value="mobile">موبايل</option>
              <option value="email">إيميل</option>
              <option value="social">سوشيال</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => {
                setFilterPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
            >
              <option value="all">كل الأولويات</option>
              <option value="low">منخفض</option>
              <option value="medium">متوسط</option>
              <option value="high">عالي</option>
              <option value="urgent">عاجل</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
            >
              <option value="customerName">العميل</option>
              <option value="unreadCount">غير مقروء</option>
              <option value="messageCount">الرسائل</option>
              <option value="updatedAt">آخر تحديث</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
              title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
            >
              {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </>
        }
        loading={loading}
        empty={
          filtered.length === 0 ? (
            <InvEmpty icon={MessageSquare} title="لا توجد محادثات حالياً">
              <InvToolButton primary onClick={() => setAddModal(true)}>
                <Plus size={14} /> محادثة جديدة
              </InvToolButton>
            </InvEmpty>
          ) : undefined
        }
        footer={
          <>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[12px] font-bold">
                <span>{selectedIds.size} محادثة محددة</span>
                <button
                  onClick={bulkDelete}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={14} /> حذف
                </button>
              </div>
            )}
            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={itemsPerPage}
              onPage={(p) => setCurrentPage(p)}
              label="محادثة"
            />
          </>
        }
      >
        <div className="hidden md:block overflow-x-auto touch-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-right border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="p-1">
                    {selectedIds.size === paginatedChats.length && paginatedChats.length > 0 ? (
                      <Check size={18} className="text-[#00E5FF]" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                    )}
                  </button>
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500">العميل</th>
                <th className="p-4 text-xs font-semibold text-slate-500">آخر رسالة</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الحالة</th>
                <th className="p-4 text-xs font-semibold text-slate-500">القناة</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الأولوية</th>
                <th className="p-4 text-xs font-semibold text-slate-500">المسند إليه</th>
                <th className="p-4 text-xs font-semibold text-slate-500">غير مقروء</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الرسائل</th>
                <th className="p-4 text-xs font-semibold text-slate-500">آخر تحديث</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedChats.map((chat) => {
                const statusConfig = STATUS_CONFIG[chat.status];
                const channelConfig = CHANNEL_CONFIG[chat.channel];
                const priorityConfig = PRIORITY_CONFIG[chat.priority];
                return (
                  <tr key={chat.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4">
                      <button onClick={() => toggleSelect(chat.id)} className="p-1">
                        {selectedIds.has(chat.id) ? (
                          <Check size={18} className="text-[#00E5FF]" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{chat.customerName}</div>
                      <div className="text-slate-500 text-xs">{chat.customerEmail}</div>
                      <div className="text-slate-500 text-xs">{chat.customerPhone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm truncate max-w-xs">
                        {chat.lastMessage}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${channelConfig.color}`}
                      >
                        {channelConfig.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${priorityConfig.color}`}
                      >
                        {priorityConfig.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm flex items-center gap-1">
                        <User size={12} />
                        {chat.assignedTo}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{chat.unreadCount}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{chat.messageCount}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm">
                        {new Date(chat.lastMessageTime).toLocaleDateString('ar-EG')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(chat)}
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all"
                          title="تعديل"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(chat.id)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </InventoryPage>

      {/* Add Modal */}
      {addModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">محادثة جديدة</h2>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">اسم العميل</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Customer Name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الإيميل</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الهاتف</label>
                <input
                  type="text"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="+20 123 456 7890"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="open">مفتوح</option>
                  <option value="closed">مغلق</option>
                  <option value="pending">معلق</option>
                  <option value="resolved">تم الحل</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">المسند إليه</label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  placeholder="اسم الموظف"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">القناة</label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="web">ويب</option>
                  <option value="mobile">موبايل</option>
                  <option value="email">إيميل</option>
                  <option value="social">سوشيال</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الأولوية</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="low">منخفض</option>
                  <option value="medium">متوسط</option>
                  <option value="high">عالي</option>
                  <option value="urgent">عاجل</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الوسوم (مفصولة بفاصلة)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2.5 rounded-xl bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all"
              >
                إضافة المحادثة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل المحادثة</h2>
              <button
                onClick={() => setEditModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">اسم العميل</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الإيميل</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الهاتف</label>
                <input
                  type="text"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="open">مفتوح</option>
                  <option value="closed">مغلق</option>
                  <option value="pending">معلق</option>
                  <option value="resolved">تم الحل</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">المسند إليه</label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">القناة</label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="web">ويب</option>
                  <option value="mobile">موبايل</option>
                  <option value="email">إيميل</option>
                  <option value="social">سوشيال</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الأولوية</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="low">منخفض</option>
                  <option value="medium">متوسط</option>
                  <option value="high">عالي</option>
                  <option value="urgent">عاجل</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الوسوم (مفصولة بفاصلة)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                onClick={handleEdit}
                className="w-full py-2.5 rounded-xl bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {guideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل المحادثات</h2>
              <button
                onClick={() => setGuideOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">وظيفة الصفحة</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  إدارة محادثات العملاء عبر القنوات المختلفة.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">الميزات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إضافة وتعديل وحذف المحادثات</li>
                  <li>• قنوات متعددة (ويب، موبايل، إيميل، سوشيال)</li>
                  <li>• تتبع الرسائل غير المقروءة</li>
                  <li>• إدارة الأولويات</li>
                  <li>• تصدير تقارير المحادثات</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
