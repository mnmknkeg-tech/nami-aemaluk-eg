'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Download,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  User,
  Star,
  Clock,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InventoryPage,
  InvToolButton,
  InvPagination,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Ticket = {
  id: string;
  subject: string;
  subjectAr: string;
  description: string;
  customerName: string;
  customerEmail: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  assignedTo: string;
  department: string;
  dueDate: string;
  resolvedDate: string;
  responseTime: number;
  satisfaction: number;
  attachments: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    subjectAr: '',
    description: '',
    customerName: '',
    customerEmail: '',
    status: 'open' as 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    category: '',
    assignedTo: '',
    department: '',
    dueDate: '',
    tags: '',
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/tickets/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setTickets(
        data.map((t: any) => ({
          id: String(t.id),
          subject: t.subject || '---',
          subjectAr: t.subjectAr || t.subject_ar || '---',
          description: t.description || '---',
          customerName: t.customerName || t.customer_name || '---',
          customerEmail: t.customerEmail || t.customer_email || '---',
          status: t.status || 'open',
          priority: t.priority || 'medium',
          category: t.category || '---',
          assignedTo: t.assignedTo || t.assigned_to || '---',
          department: t.department || '---',
          dueDate: t.dueDate || t.due_date || null,
          resolvedDate: t.resolvedDate || t.resolved_date || null,
          responseTime: Number(t.responseTime || t.response_time || 0),
          satisfaction: Number(t.satisfaction || 0),
          attachments: t.attachments || [],
          tags: t.tags || [],
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filtered = useMemo(() => {
    let result = tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.subjectAr.includes(debouncedSearch) ||
        t.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.customerEmail.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    if (filterStatus !== 'all') {
      result = result.filter((t) => t.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      result = result.filter((t) => t.priority === filterPriority);
    }

    if (filterCategory !== 'all') {
      result = result.filter((t) => t.category === filterCategory);
    }

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'subject'
          ? a.subject
          : sortBy === 'priority'
            ? a.priority
            : sortBy === 'responseTime'
              ? a.responseTime
              : a.createdAt;
      const bVal =
        sortBy === 'subject'
          ? b.subject
          : sortBy === 'priority'
            ? b.priority
            : sortBy === 'responseTime'
              ? b.responseTime
              : b.createdAt;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [tickets, debouncedSearch, filterStatus, filterPriority, filterCategory, sortBy, sortOrder]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedTickets.length && paginatedTickets.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTickets.map((t) => t.id)));
    }
  }, [paginatedTickets, selectedIds.size]);

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
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} تذكرة؟`)) return;
    try {
      // TODO: Implement bulk delete API call
      alert(`تم حذف ${selectedIds.size} تذكرة`);
      setSelectedIds(new Set());
      loadTickets();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  }, [selectedIds, loadTickets]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Subject',
      'Subject (Arabic)',
      'Customer Name',
      'Customer Email',
      'Status',
      'Priority',
      'Category',
      'Assigned To',
      'Department',
      'Due Date',
      'Resolved Date',
      'Response Time (hrs)',
      'Satisfaction',
      'Tags',
      'Created At',
    ];
    const rows = filtered.map((t) => [
      t.subject,
      t.subjectAr,
      t.customerName,
      t.customerEmail,
      t.status,
      t.priority,
      t.category,
      t.assignedTo,
      t.department,
      t.dueDate || '-',
      t.resolvedDate || '-',
      t.responseTime,
      t.satisfaction,
      t.tags.join(', '),
      t.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'tickets.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'tickets.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/tickets', {
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
        subject: '',
        subjectAr: '',
        description: '',
        customerName: '',
        customerEmail: '',
        status: 'open',
        priority: 'medium',
        category: '',
        assignedTo: '',
        department: '',
        dueDate: '',
        tags: '',
      });
      loadTickets();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة التذكرة');
    }
  }, [formData, loadTickets]);

  const handleEdit = useCallback(async () => {
    if (!editTicket) return;
    try {
      await apiRequest(`/tickets/${editTicket.id}`, {
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
      setEditTicket(null);
      setFormData({
        subject: '',
        subjectAr: '',
        description: '',
        customerName: '',
        customerEmail: '',
        status: 'open',
        priority: 'medium',
        category: '',
        assignedTo: '',
        department: '',
        dueDate: '',
        tags: '',
      });
      loadTickets();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل التذكرة');
    }
  }, [editTicket, formData, loadTickets]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذه التذكرة؟')) return;
      try {
        await apiRequest(`/tickets/${id}`, { method: 'DELETE' });
        loadTickets();
      } catch (error) {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadTickets]
  );

  const openEditModal = useCallback((ticket: Ticket) => {
    setEditTicket(ticket);
    setFormData({
      subject: ticket.subject,
      subjectAr: ticket.subjectAr,
      description: ticket.description,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      assignedTo: ticket.assignedTo,
      department: ticket.department,
      dueDate: ticket.dueDate,
      tags: ticket.tags.join(', '),
    });
    setEditModal(true);
  }, []);

  const STATUS_CONFIG = {
    open: { label: 'مفتوح', color: 'bg-blue-50 text-blue-600' },
    in_progress: { label: 'قيد المعالجة', color: 'bg-amber-50 text-amber-600' },
    pending: { label: 'معلق', color: 'bg-slate-50 text-slate-600' },
    resolved: { label: 'تم الحل', color: 'bg-green-50 text-green-600' },
    closed: { label: 'مغلق', color: 'bg-purple-50 text-purple-600' },
  };

  const PRIORITY_CONFIG = {
    low: { label: 'منخفض', color: 'bg-slate-50 text-slate-600' },
    medium: { label: 'متوسط', color: 'bg-blue-50 text-blue-600' },
    high: { label: 'عالي', color: 'bg-amber-50 text-amber-600' },
    critical: { label: 'حرج', color: 'bg-red-50 text-red-600' },
  };

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'open').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const resolved = tickets.filter((t) => t.status === 'resolved').length;
    const critical = tickets.filter((t) => t.priority === 'critical').length;
    const avgResponseTime =
      tickets.length > 0 ? tickets.reduce((sum, t) => sum + t.responseTime, 0) / tickets.length : 0;
    const avgSatisfaction =
      tickets.length > 0 ? tickets.reduce((sum, t) => sum + t.satisfaction, 0) / tickets.length : 0;
    return [
      { label: 'إجمالي التذاكر', value: total, icon: Ticket, color: 'bg-blue-50 text-blue-600' },
      { label: 'مفتوح', value: open, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
      {
        label: 'قيد المعالجة',
        value: inProgress,
        icon: Clock,
        color: 'bg-amber-50 text-amber-600',
      },
      {
        label: 'تم الحل',
        value: resolved,
        icon: CheckCircle2,
        color: 'bg-emerald-50 text-emerald-600',
      },
      { label: 'حرج', value: critical, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
      {
        label: 'متوسط الرضا',
        value: `${avgSatisfaction.toFixed(1)}/5`,
        icon: Star,
        color: 'bg-purple-50 text-purple-600',
      },
    ];
  }, [tickets]);
  const statusTabs = [
    { id: 'all', label: 'الكل', count: tickets.length },
    { id: 'open', label: 'مفتوح', count: tickets.filter((t) => t.status === 'open').length },
    {
      id: 'in_progress',
      label: 'قيد المعالجة',
      count: tickets.filter((t) => t.status === 'in_progress').length,
    },
    { id: 'pending', label: 'معلق', count: tickets.filter((t) => t.status === 'pending').length },
    {
      id: 'resolved',
      label: 'تم الحل',
      count: tickets.filter((t) => t.status === 'resolved').length,
    },
    { id: 'closed', label: 'مغلق', count: tickets.filter((t) => t.status === 'closed').length },
  ];

  return (
    <>
      <InventoryPage
        title="التذاكر"
        subtitle="إدارة تذاكر الدعم الفني وخدمة العملاء"
        onInfo={() => setGuideOpen(true)}
        actions={
          <>
            <InvToolButton primary onClick={() => setAddModal(true)}>
              <Plus size={14} /> تذكرة جديدة
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
        searchPlaceholder="بحث بالموضوع أو العميل…"
        filters={
          <>
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
              <option value="critical">حرج</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
            >
              <option value="all">كل الفئات</option>
              <option value="technical">فني</option>
              <option value="billing">فواتير</option>
              <option value="general">عام</option>
              <option value="feature">ميزات</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
            >
              <option value="subject">الموضوع</option>
              <option value="priority">الأولوية</option>
              <option value="responseTime">وقت الاستجابة</option>
              <option value="createdAt">تاريخ الإنشاء</option>
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
          <InvEmpty icon={Ticket} title="لا توجد تذاكر حالياً">
            <InvToolButton primary onClick={() => setAddModal(true)}>
              <Plus size={14} /> تذكرة جديدة
            </InvToolButton>
          </InvEmpty>
        }
        footer={
          <>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[12px] font-bold">
                <span>{selectedIds.size} تذكرة محددة</span>
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
              label="تذكرة"
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
                    {selectedIds.size === paginatedTickets.length && paginatedTickets.length > 0 ? (
                      <Check size={18} className="text-[#00E5FF]" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                    )}
                  </button>
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500">الموضوع</th>
                <th className="p-4 text-xs font-semibold text-slate-500">العميل</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الحالة</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الأولوية</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الفئة</th>
                <th className="p-4 text-xs font-semibold text-slate-500">المسند إليه</th>
                <th className="p-4 text-xs font-semibold text-slate-500">القسم</th>
                <th className="p-4 text-xs font-semibold text-slate-500">تاريخ الاستحقاق</th>
                <th className="p-4 text-xs font-semibold text-slate-500">وقت الاستجابة</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الرضا</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTickets.map((ticket) => {
                const statusConfig = STATUS_CONFIG[ticket.status];
                const priorityConfig = PRIORITY_CONFIG[ticket.priority];
                return (
                  <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4">
                      <button onClick={() => toggleSelect(ticket.id)} className="p-1">
                        {selectedIds.has(ticket.id) ? (
                          <Check size={18} className="text-[#00E5FF]" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{ticket.subject}</div>
                      <div className="text-slate-500 text-xs">{ticket.subjectAr}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm">{ticket.customerName}</div>
                      <div className="text-slate-500 text-xs">{ticket.customerEmail}</div>
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
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${priorityConfig.color}`}
                      >
                        {priorityConfig.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm">{ticket.category}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm flex items-center gap-1">
                        <User size={12} />
                        {ticket.assignedTo}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm">{ticket.department}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm">
                        {ticket.dueDate
                          ? new Date(ticket.dueDate).toLocaleDateString('ar-EG')
                          : '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm">{ticket.responseTime} ساعة</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-500" />
                        <span className="text-slate-600 text-sm">{ticket.satisfaction}/5</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(ticket)}
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all"
                          title="تعديل"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(ticket.id)}
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
              <h2 className="text-xl font-black text-slate-900">تذكرة جديدة</h2>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الموضوع (إنجليزي)
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Subject"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الموضوع (عربي)
                </label>
                <input
                  type="text"
                  value={formData.subjectAr}
                  onChange={(e) => setFormData({ ...formData, subjectAr: e.target.value })}
                  placeholder="الموضوع"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف المشكلة"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
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
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="open">مفتوح</option>
                  <option value="in_progress">قيد المعالجة</option>
                  <option value="pending">معلق</option>
                  <option value="resolved">تم الحل</option>
                  <option value="closed">مغلق</option>
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
                  <option value="critical">حرج</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الفئة</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">اختر الفئة</option>
                  <option value="technical">فني</option>
                  <option value="billing">فواتير</option>
                  <option value="general">عام</option>
                  <option value="feature">ميزات</option>
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
                <label className="text-sm font-bold text-slate-700 mb-1 block">القسم</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="القسم"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  تاريخ الاستحقاق
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
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
                إضافة التذكرة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل التذكرة</h2>
              <button
                onClick={() => setEditModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الموضوع (إنجليزي)
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الموضوع (عربي)
                </label>
                <input
                  type="text"
                  value={formData.subjectAr}
                  onChange={(e) => setFormData({ ...formData, subjectAr: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
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
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="open">مفتوح</option>
                  <option value="in_progress">قيد المعالجة</option>
                  <option value="pending">معلق</option>
                  <option value="resolved">تم الحل</option>
                  <option value="closed">مغلق</option>
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
                  <option value="critical">حرج</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الفئة</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">اختر الفئة</option>
                  <option value="technical">فني</option>
                  <option value="billing">فواتير</option>
                  <option value="general">عام</option>
                  <option value="feature">ميزات</option>
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
                <label className="text-sm font-bold text-slate-700 mb-1 block">القسم</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  تاريخ الاستحقاق
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
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
              <h2 className="text-xl font-black text-slate-900">دليل التذاكر</h2>
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
                  إدارة تذاكر الدعم الفني وخدمة العملاء.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Ticket size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">الميزات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إضافة وتعديل وحذف التذاكر</li>
                  <li>• تتبع الحالة والأولوية</li>
                  <li>• إدارة المسؤولين والأقسام</li>
                  <li>• تتبع وقت الاستجابة ورضا العملاء</li>
                  <li>• تصدير تقارير التذاكر</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
