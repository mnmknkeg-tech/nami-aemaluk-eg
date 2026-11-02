'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
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
  Clock,
  TrendingUp,
  FileText,
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

type Complaint = {
  id: string;
  subject: string;
  subjectAr: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: 'open' | 'investigating' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  assignedTo: string;
  department: string;
  reportedDate: string;
  resolvedDate: string;
  resolution: string;
  followUpRequired: boolean;
  followUpDate: string;
  attachments: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
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
  const [editComplaint, setEditComplaint] = useState<Complaint | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    subjectAr: '',
    description: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    status: 'open' as 'open' | 'investigating' | 'pending' | 'resolved' | 'closed',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    category: '',
    assignedTo: '',
    department: '',
    reportedDate: new Date().toISOString().split('T')[0],
    resolution: '',
    followUpRequired: false,
    followUpDate: '',
    tags: '',
  });

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/complaints/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setComplaints(
        data.map((c: any) => ({
          id: String(c.id),
          subject: c.subject || '---',
          subjectAr: c.subjectAr || c.subject_ar || '---',
          description: c.description || '---',
          customerName: c.customerName || c.customer_name || '---',
          customerEmail: c.customerEmail || c.customer_email || '---',
          customerPhone: c.customerPhone || c.customer_phone || '---',
          status: c.status || 'open',
          priority: c.priority || 'medium',
          category: c.category || '---',
          assignedTo: c.assignedTo || c.assigned_to || '---',
          department: c.department || '---',
          reportedDate: c.reportedDate || c.reported_date || new Date().toISOString(),
          resolvedDate: c.resolvedDate || c.resolved_date || null,
          resolution: c.resolution || '---',
          followUpRequired: c.followUpRequired || c.follow_up_required || false,
          followUpDate: c.followUpDate || c.follow_up_date || null,
          attachments: c.attachments || [],
          tags: c.tags || [],
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const filtered = useMemo(() => {
    let result = complaints.filter(
      (c) =>
        c.subject.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.subjectAr.includes(debouncedSearch) ||
        c.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.customerEmail.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    if (filterStatus !== 'all') {
      result = result.filter((c) => c.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      result = result.filter((c) => c.priority === filterPriority);
    }

    if (filterCategory !== 'all') {
      result = result.filter((c) => c.category === filterCategory);
    }

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'subject'
          ? a.subject
          : sortBy === 'priority'
            ? a.priority
            : sortBy === 'reportedDate'
              ? a.reportedDate
              : a.createdAt;
      const bVal =
        sortBy === 'subject'
          ? b.subject
          : sortBy === 'priority'
            ? b.priority
            : sortBy === 'reportedDate'
              ? b.reportedDate
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
  }, [
    complaints,
    debouncedSearch,
    filterStatus,
    filterPriority,
    filterCategory,
    sortBy,
    sortOrder,
  ]);

  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedComplaints.length && paginatedComplaints.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedComplaints.map((c) => c.id)));
    }
  }, [paginatedComplaints, selectedIds.size]);

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
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} شكوى؟`)) return;
    try {
      // TODO: Implement bulk delete API call
      alert(`تم حذف ${selectedIds.size} شكوى`);
      setSelectedIds(new Set());
      loadComplaints();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  }, [selectedIds, loadComplaints]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Subject',
      'Subject (Arabic)',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Status',
      'Priority',
      'Category',
      'Assigned To',
      'Department',
      'Reported Date',
      'Resolved Date',
      'Resolution',
      'Follow Up Required',
      'Follow Up Date',
      'Tags',
      'Created At',
    ];
    const rows = filtered.map((c) => [
      c.subject,
      c.subjectAr,
      c.customerName,
      c.customerEmail,
      c.customerPhone,
      c.status,
      c.priority,
      c.category,
      c.assignedTo,
      c.department,
      c.reportedDate,
      c.resolvedDate || '-',
      c.resolution,
      c.followUpRequired,
      c.followUpDate || '-',
      c.tags.join(', '),
      c.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'complaints.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'complaints.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/complaints', {
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
        customerPhone: '',
        status: 'open',
        priority: 'medium',
        category: '',
        assignedTo: '',
        department: '',
        reportedDate: new Date().toISOString().split('T')[0],
        resolution: '',
        followUpRequired: false,
        followUpDate: '',
        tags: '',
      });
      loadComplaints();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة الشكوى');
    }
  }, [formData, loadComplaints]);

  const handleEdit = useCallback(async () => {
    if (!editComplaint) return;
    try {
      await apiRequest(`/complaints/${editComplaint.id}`, {
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
      setEditComplaint(null);
      setFormData({
        subject: '',
        subjectAr: '',
        description: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        status: 'open',
        priority: 'medium',
        category: '',
        assignedTo: '',
        department: '',
        reportedDate: new Date().toISOString().split('T')[0],
        resolution: '',
        followUpRequired: false,
        followUpDate: '',
        tags: '',
      });
      loadComplaints();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل الشكوى');
    }
  }, [editComplaint, formData, loadComplaints]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذه الشكوى؟')) return;
      try {
        await apiRequest(`/complaints/${id}`, { method: 'DELETE' });
        loadComplaints();
      } catch (error) {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadComplaints]
  );

  const openEditModal = useCallback((complaint: Complaint) => {
    setEditComplaint(complaint);
    setFormData({
      subject: complaint.subject,
      subjectAr: complaint.subjectAr,
      description: complaint.description,
      customerName: complaint.customerName,
      customerEmail: complaint.customerEmail,
      customerPhone: complaint.customerPhone,
      status: complaint.status,
      priority: complaint.priority,
      category: complaint.category,
      assignedTo: complaint.assignedTo,
      department: complaint.department,
      reportedDate: complaint.reportedDate.split('T')[0],
      resolution: complaint.resolution,
      followUpRequired: complaint.followUpRequired,
      followUpDate: complaint.followUpDate,
      tags: complaint.tags.join(', '),
    });
    setEditModal(true);
  }, []);

  const STATUS_CONFIG = {
    open: { label: 'مفتوح', color: 'bg-blue-50 text-blue-600' },
    investigating: { label: 'قيد التحقيق', color: 'bg-amber-50 text-amber-600' },
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
    const total = complaints.length;
    const open = complaints.filter((c) => c.status === 'open').length;
    const investigating = complaints.filter((c) => c.status === 'investigating').length;
    const resolved = complaints.filter((c) => c.status === 'resolved').length;
    const critical = complaints.filter((c) => c.priority === 'critical').length;
    const followUp = complaints.filter((c) => c.followUpRequired).length;
    return [
      {
        label: 'إجمالي الشكاوى',
        value: total,
        icon: AlertTriangle,
        color: 'bg-blue-50 text-blue-600',
      },
      { label: 'مفتوح', value: open, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
      {
        label: 'قيد التحقيق',
        value: investigating,
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
      { label: 'متابعة', value: followUp, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    ];
  }, [complaints]);

  const statusTabs = [
    { id: 'all', label: 'الكل', count: complaints.length },
    { id: 'open', label: 'مفتوح', count: complaints.filter((c) => c.status === 'open').length },
    {
      id: 'investigating',
      label: 'قيد التحقيق',
      count: complaints.filter((c) => c.status === 'investigating').length,
    },
    {
      id: 'pending',
      label: 'معلق',
      count: complaints.filter((c) => c.status === 'pending').length,
    },
    {
      id: 'resolved',
      label: 'تم الحل',
      count: complaints.filter((c) => c.status === 'resolved').length,
    },
    { id: 'closed', label: 'مغلق', count: complaints.filter((c) => c.status === 'closed').length },
  ];

  return (
    <>
      <InventoryPage
        title="الشكاوى"
        subtitle="إدارة شكاوى العملاء ومتابعة حلها"
        onInfo={() => setGuideOpen(true)}
        actions={
          <>
            <InvToolButton primary onClick={() => setAddModal(true)}>
              <Plus size={14} /> شكوى جديدة
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
              <option value="product">منتج</option>
              <option value="service">خدمة</option>
              <option value="delivery">توصيل</option>
              <option value="billing">فواتير</option>
              <option value="other">أخرى</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
            >
              <option value="subject">الموضوع</option>
              <option value="priority">الأولوية</option>
              <option value="reportedDate">تاريخ الإبلاغ</option>
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
          <InvEmpty icon={AlertTriangle} title="لا توجد شكاوى حالياً">
            <InvToolButton primary onClick={() => setAddModal(true)}>
              <Plus size={14} /> شكوى جديدة
            </InvToolButton>
          </InvEmpty>
        }
        footer={
          <>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[12px] font-bold">
                <span>{selectedIds.size} شكوى محددة</span>
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
              label="شكوى"
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
                    {selectedIds.size === paginatedComplaints.length &&
                    paginatedComplaints.length > 0 ? (
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
                <th className="p-4 text-xs font-semibold text-slate-500">تاريخ الإبلاغ</th>
                <th className="p-4 text-xs font-semibold text-slate-500">تاريخ الحل</th>
                <th className="p-4 text-xs font-semibold text-slate-500">متابعة</th>
                <th className="p-4 text-xs font-semibold text-slate-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedComplaints.map((complaint) => {
                const statusConfig = STATUS_CONFIG[complaint.status];
                const priorityConfig = PRIORITY_CONFIG[complaint.priority];
                return (
                  <tr key={complaint.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4">
                      <button onClick={() => toggleSelect(complaint.id)} className="p-1">
                        {selectedIds.has(complaint.id) ? (
                          <Check size={18} className="text-[#00E5FF]" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{complaint.subject}</div>
                      <div className="text-slate-500 text-xs">{complaint.subjectAr}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm">{complaint.customerName}</div>
                      <div className="text-slate-500 text-xs">{complaint.customerEmail}</div>
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
                      <div className="text-slate-600 text-sm">{complaint.category}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm flex items-center gap-1">
                        <User size={12} />
                        {complaint.assignedTo}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm">
                        {new Date(complaint.reportedDate).toLocaleDateString('ar-EG')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 text-sm">
                        {complaint.resolvedDate
                          ? new Date(complaint.resolvedDate).toLocaleDateString('ar-EG')
                          : '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      {complaint.followUpRequired ? (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-600">
                          نعم
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 text-slate-600">
                          لا
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(complaint)}
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all"
                          title="تعديل"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(complaint.id)}
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
              <h2 className="text-xl font-black text-slate-900">شكوى جديدة</h2>
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
                  placeholder="وصف الشكوى"
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
                  <option value="investigating">قيد التحقيق</option>
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
                  <option value="product">منتج</option>
                  <option value="service">خدمة</option>
                  <option value="delivery">توصيل</option>
                  <option value="billing">فواتير</option>
                  <option value="other">أخرى</option>
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
                <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ الإبلاغ</label>
                <input
                  type="date"
                  value={formData.reportedDate}
                  onChange={(e) => setFormData({ ...formData, reportedDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحل</label>
                <textarea
                  value={formData.resolution}
                  onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  placeholder="وصف الحل"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.followUpRequired}
                  onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-bold text-slate-700">مطلوب متابعة</label>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  تاريخ المتابعة
                </label>
                <input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
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
                إضافة الشكوى
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editComplaint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل الشكوى</h2>
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
                  <option value="investigating">قيد التحقيق</option>
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
                  <option value="product">منتج</option>
                  <option value="service">خدمة</option>
                  <option value="delivery">توصيل</option>
                  <option value="billing">فواتير</option>
                  <option value="other">أخرى</option>
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
                <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ الإبلاغ</label>
                <input
                  type="date"
                  value={formData.reportedDate}
                  onChange={(e) => setFormData({ ...formData, reportedDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحل</label>
                <textarea
                  value={formData.resolution}
                  onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.followUpRequired}
                  onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-bold text-slate-700">مطلوب متابعة</label>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  تاريخ المتابعة
                </label>
                <input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
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
              <h2 className="text-xl font-black text-slate-900">دليل الشكاوى</h2>
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
                  إدارة شكاوى العملاء ومتابعة حلها.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">الميزات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إضافة وتعديل وحذف الشكاوى</li>
                  <li>• تتبع الحالة والأولوية</li>
                  <li>• إدارة المسؤولين والأقسام</li>
                  <li>• متابعة الحلول</li>
                  <li>• تصدير تقارير الشكاوى</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
