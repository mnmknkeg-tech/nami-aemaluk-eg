'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star,
  Trash2,
  Check,
  X,
  CheckCircle2,
  Download,
  ChevronUp,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InventoryPage,
  InvToolButton,
  InvPagination,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Review = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productId: string;
  productName: string;
  rating: number;
  title: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  type: 'review' | 'rating' | 'comment' | 'complaint';
  verified: boolean;
  helpfulCount: number;
  response: string;
  respondedAt: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد المراجعة', color: 'bg-amber-50 text-amber-600' },
  approved: { label: 'موافق عليه', color: 'bg-green-50 text-green-600' },
  rejected: { label: 'مرفوض', color: 'bg-red-50 text-red-600' },
  flagged: { label: 'مبلغ عنه', color: 'bg-purple-50 text-purple-600' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  review: { label: 'مراجعة', color: 'bg-blue-50 text-blue-600' },
  rating: { label: 'تقييم', color: 'bg-yellow-50 text-yellow-600' },
  comment: { label: 'تعليق', color: 'bg-emerald-50 text-emerald-600' },
  complaint: { label: 'شكوى', color: 'bg-red-50 text-red-600' },
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [responseModal, setResponseModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/feedback?shopId=${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setReviews(
        data.map((r: any) => ({
          id: String(r.id),
          customerName: r.userName || r.customerName || '---',
          customerEmail: r.userEmail || r.customerEmail || '---',
          customerPhone: r.phone || '---',
          productId: r.productId || '',
          productName: r.productName || '---',
          rating: Number(r.rating || 0),
          title: r.title || '',
          comment: r.comment || r.content || '',
          status: r.status || 'pending',
          type: r.type || 'review',
          verified: Boolean(r.verified),
          helpfulCount: Number(r.helpfulCount || 0),
          response: r.response || '',
          respondedAt: r.respondedAt || '',
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filtered = useMemo(() => {
    let result = reviews.filter(
      (r) =>
        r.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.productName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.comment.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    if (filterStatus !== 'all') result = result.filter((r) => r.status === filterStatus);
    if (filterType !== 'all') result = result.filter((r) => r.type === filterType);
    if (filterRating !== 'all') result = result.filter((r) => r.rating === Number(filterRating));

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'rating'
          ? a.rating
          : sortBy === 'helpfulCount'
            ? a.helpfulCount
            : new Date(a.createdAt).getTime();
      const bVal =
        sortBy === 'rating'
          ? b.rating
          : sortBy === 'helpfulCount'
            ? b.helpfulCount
            : new Date(b.createdAt).getTime();
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return result;
  }, [reviews, debouncedSearch, filterStatus, filterType, filterRating, sortBy, sortOrder]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedReviews.length && paginatedReviews.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedReviews.map((r) => r.id)));
    }
  }, [paginatedReviews, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const removeOne = useCallback(
    async (rid: string) => {
      if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
      try {
        await apiRequest(`/feedback/${rid}`, { method: 'DELETE' });
        loadReviews();
      } catch {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadReviews]
  );

  const removeMany = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm('هل أنت متأكد من حذف التقييمات المحددة؟')) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((rid) => apiRequest(`/feedback/${rid}`, { method: 'DELETE' }))
      );
      loadReviews();
      setSelectedIds(new Set());
    } catch {
      alert('حدث خطأ أثناء الحذف');
    }
  }, [selectedIds, loadReviews]);

  const bulkSetStatus = useCallback(
    async (st: string) => {
      if (selectedIds.size === 0) return;
      try {
        await Promise.all(
          Array.from(selectedIds).map((rid) =>
            apiRequest(`/feedback/${rid}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: st }),
            })
          )
        );
        loadReviews();
        setSelectedIds(new Set());
      } catch {
        alert('حدث خطأ أثناء التحديث');
      }
    },
    [selectedIds, loadReviews]
  );

  const setOneStatus = useCallback(
    async (rid: string, st: string) => {
      try {
        await apiRequest(`/feedback/${rid}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: st }),
        });
        loadReviews();
      } catch {
        alert('حدث خطأ أثناء تحديث الحالة');
      }
    },
    [loadReviews]
  );

  const exportCSV = useCallback(() => {
    const headers = ['Customer', 'Product', 'Rating', 'Type', 'Status', 'Comment', 'Created At'];
    const rows = filtered.map((r) => [
      r.customerName,
      r.productName,
      r.rating,
      r.type,
      r.status,
      r.comment,
      r.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'reviews.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'reviews.csv');
    });
  }, [filtered]);

  const handleResponse = useCallback(async () => {
    if (!selectedReview) return;
    try {
      await apiRequest(`/feedback/${selectedReview.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ response: responseText, status: 'approved' }),
      });
      setResponseModal(false);
      setSelectedReview(null);
      setResponseText('');
      loadReviews();
    } catch {
      alert('حدث خطأ أثناء إرسال الرد');
    }
  }, [selectedReview, responseText, loadReviews]);

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}
        />
      ))}
    </div>
  );

  const avgRatingVal =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const apprCount = reviews.filter((r) => r.status === 'approved').length;
  const apprRate = reviews.length > 0 ? Math.round((apprCount / reviews.length) * 100) : 0;

  const statusTabs = [
    { id: 'all', label: 'الكل', count: reviews.length },
    {
      id: 'pending',
      label: 'قيد المراجعة',
      count: reviews.filter((r) => r.status === 'pending').length,
    },
    {
      id: 'approved',
      label: 'موافق عليه',
      count: reviews.filter((r) => r.status === 'approved').length,
    },
    {
      id: 'rejected',
      label: 'مرفوض',
      count: reviews.filter((r) => r.status === 'rejected').length,
    },
    {
      id: 'flagged',
      label: 'مبلغ عنه',
      count: reviews.filter((r) => r.status === 'flagged').length,
    },
  ];

  return (
    <>
      <InventoryPage
        title="التقييمات والمراجعات"
        subtitle={`عرض وإدارة تقييمات العملاء — المتوسط ${avgRatingVal.toFixed(1)} / 5 • نسبة الموافقة ${apprRate}%`}
        onInfo={() => setGuideOpen(true)}
        actions={
          <InvToolButton onClick={exportCSV}>
            <Download size={14} /> تصدير CSV
          </InvToolButton>
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
        searchPlaceholder="بحث بالعميل أو المنتج أو التعليق…"
        filters={
          <>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
            >
              <option value="all">كل الأنواع</option>
              <option value="review">مراجعة</option>
              <option value="rating">تقييم</option>
              <option value="comment">تعليق</option>
              <option value="complaint">شكوى</option>
            </select>
            <select
              value={filterRating}
              onChange={(e) => {
                setFilterRating(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
            >
              <option value="all">كل التقييمات</option>
              <option value="5">5 نجوم</option>
              <option value="4">4 نجوم</option>
              <option value="3">3 نجوم</option>
              <option value="2">نجمتان</option>
              <option value="1">نجمة واحدة</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
            >
              <option value="rating">التقييم</option>
              <option value="helpfulCount">الأكثر فائدة</option>
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
        empty={<InvEmpty icon={Star} title="لا توجد تقييمات مطابقة" />}
        footer={
          <>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[12px] font-bold">
                <span>{selectedIds.size} تقييم محدد</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => bulkSetStatus('approved')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 transition-all"
                  >
                    <Check size={14} /> موافقة
                  </button>
                  <button
                    onClick={() => bulkSetStatus('rejected')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all"
                  >
                    <X size={14} /> رفض
                  </button>
                  <button
                    onClick={removeMany}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 size={14} /> حذف
                  </button>
                </div>
              </div>
            )}
            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={itemsPerPage}
              onPage={(p) => setCurrentPage(p)}
              label="تقييم"
            />
          </>
        }
      >
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 w-10">
                    <button onClick={toggleSelectAll} className="p-1">
                      {selectedIds.size === paginatedReviews.length &&
                      paginatedReviews.length > 0 ? (
                        <Check size={18} className="text-[#00E5FF]" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 text-xs font-semibold text-slate-500">العميل</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">المنتج</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">التقييم</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">التعليق</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">النوع</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">الحالة</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">التاريخ</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReviews.map((review) => {
                  const statusConfig = STATUS_CONFIG[review.status];
                  const typeConfig = TYPE_CONFIG[review.type];
                  return (
                    <tr key={review.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4">
                        <button onClick={() => toggleSelect(review.id)} className="p-1">
                          {selectedIds.has(review.id) ? (
                            <Check size={18} className="text-[#00E5FF]" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {review.customerName}
                        </div>
                        <div className="text-slate-500 text-xs">{review.customerEmail}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-600 text-sm">{review.productName}</div>
                        {review.verified && (
                          <div className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle2 size={10} /> شراء موثق
                          </div>
                        )}
                      </td>
                      <td className="p-4">{renderStars(review.rating)}</td>
                      <td className="p-4 max-w-[260px]">
                        {review.title && (
                          <div className="font-bold text-slate-800 text-xs mb-0.5">
                            {review.title}
                          </div>
                        )}
                        <div className="text-slate-500 text-xs line-clamp-2">{review.comment}</div>
                        {review.response && (
                          <div className="mt-1 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <MessageSquare size={10} /> تم الرد
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${typeConfig?.color || ''}`}
                        >
                          {typeConfig?.label || review.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statusConfig?.color || ''}`}
                        >
                          {statusConfig?.label || review.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-600 text-xs">
                          {new Date(review.createdAt).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedReview(review);
                              setResponseText(review.response || '');
                              setResponseModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all"
                            title="رد"
                          >
                            <MessageSquare size={14} />
                          </button>
                          {review.status !== 'approved' && (
                            <button
                              onClick={() => setOneStatus(review.id, 'approved')}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                              title="موافقة"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {review.status !== 'rejected' && (
                            <button
                              onClick={() => setOneStatus(review.id, 'rejected')}
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
                              title="رفض"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => removeOne(review.id)}
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
        </div>
      </InventoryPage>

      {/* Response Modal */}
      {responseModal && selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">رد على التقييم</h3>
              <button
                onClick={() => {
                  setResponseModal(false);
                  setSelectedReview(null);
                  setResponseText('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-700">{selectedReview.comment}</p>
            </div>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="اكتب ردك هنا..."
              rows={4}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleResponse}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
              >
                إرسال الرد
              </button>
              <button
                onClick={() => {
                  setResponseModal(false);
                  setSelectedReview(null);
                  setResponseText('');
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {guideOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">دليل صفحة التقييمات</h3>
              <button
                onClick={() => setGuideOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600 font-bold">
              <li>• التبويبات العلوية للفلترة حسب حالة المراجعة</li>
              <li>• حدد عدة تقييمات للموافقة أو الرفض أو الحذف الجماعي</li>
              <li>• زر الرد لإرسال رد المتجر على التقييم</li>
              <li>• التصدير CSV لتحميل كل التقييمات المطابقة للفلاتر</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
