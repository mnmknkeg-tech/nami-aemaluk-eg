'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Loader2,
  Pencil,
  Trash2,
  MessageCircle,
  Phone,
  Mail,
  Copy,
  Check,
  ShoppingBag,
  CheckCircle2,
  CreditCard,
  Wallet,
  Trophy,
  Gift,
  Star,
  Search,
  MoreVertical,
  Plus,
  Share2,
  Tag,
  ShieldCheck,
  RotateCcw,
  Package,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';

/* ============================================================
 * صفحة تفاصيل العميل الكاملة — مطابقة لتصميم لوحة التاجر (الصورة 2)
 * ============================================================ */

type ShopCustomer = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  customerType: string;
  companyName: string;
  taxNumber: string;
  status: string;
  address: string;
  city: string;
  country: string;
  branch: string;
  source: string;
  segmentId: string;
  tags: string[];
  notes: string;
  shippingAddresses: { label: string; address: string; city: string; phone: string }[];
  archived: boolean;
  loyaltyBalance: number;
  balanceDue: number;
  totalOrders: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
  createdAt: string;
};

type ActivityRow = {
  id: string;
  status?: string;
  total: number;
  method?: string;
  source?: string;
  createdAt: string;
  itemsCount?: number;
  shippingMethod?: string;
  paymentStatus?: string;
};

const SOURCE_LABELS: Record<string, string> = {
  pos: 'الكاشير',
  website: 'المتجر الإلكتروني',
  bookings: 'الحجوزات',
  services: 'الخدمات',
  manual: 'إضافة يدوية',
  import: 'استيراد',
  app: 'تطبيق العميل',
  customer: 'المتجر الإلكتروني',
};

const ORDER_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'new', label: 'جديد' },
  { id: 'processing', label: 'جاري التجهيز' },
  { id: 'ready', label: 'جاهز' },
  { id: 'delivering', label: 'جاري التوصيل' },
  { id: 'completed', label: 'مكتمل' },
  { id: 'cancelled', label: 'ملغي' },
  { id: 'refunding', label: 'قيد الاسترجاع' },
  { id: 'partial_refund', label: 'مسترجع جزئياً' },
];

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { shop } = useShop();
  const shopId = shop?.id || '';
  const customerId = String(params?.id || '');

  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Settings & Toggles
  const [codEnabled, setCodEnabled] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(true);

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Tags adding
  const [newTagInput, setNewTagInput] = useState('');
  const [tagSaving, setTagSaving] = useState(false);

  // Orders tab filter & search
  const [orderTab, setOrderTab] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');

  // Accordion states
  const [openAccordion, setOpenAccordion] = useState<string | null>('addresses');

  // Loyalty modal
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);

  const loadCustomer = useCallback(async () => {
    if (!shopId || !customerId) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/shops/${shopId}/customers/${customerId}`);
      const data = res?.data ?? res;
      if (!data?.id) {
        setNotFound(true);
        return;
      }
      setCustomer(data);
      setNotesValue(data.notes || '');
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [shopId, customerId]);

  const loadOrders = useCallback(async () => {
    if (!shopId || !customerId) return;
    setActivityLoading(true);
    try {
      const rows = await apiRequest(`/shops/${shopId}/customers/${customerId}/activity?type=orders`);
      setActivity(Array.isArray(rows) ? rows : []);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, [shopId, customerId]);

  useEffect(() => {
    loadCustomer();
    loadOrders();
  }, [loadCustomer, loadOrders]);

  // السوق المستهدف مصر — العملة جنيه مصري دائمًا.
  const currency = useMemo(() => 'ج.م', []);

  const toggleArchive = async () => {
    if (!customer) return;
    if (!confirm(customer.archived ? 'هل أنت متأكد من استعادة هذا العميل؟' : 'هل أنت متأكد من حذف/أرشفة هذا العميل؟')) return;
    setArchiving(true);
    try {
      await apiRequest(
        `/shops/${shopId}/customers/${customer.id}/${customer.archived ? 'restore' : 'archive'}`,
        { method: 'POST' }
      );
      router.push('/dashboard/customers');
    } catch {
      alert('حدث خطأ أثناء تنفيذ الإجراء');
    } finally {
      setArchiving(false);
    }
  };

  const saveNotes = async () => {
    if (!customer) return;
    setNotesSaving(true);
    try {
      await apiRequest(`/shops/${shopId}/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: notesValue.trim() }),
      });
      setCustomer((prev) => (prev ? { ...prev, notes: notesValue.trim() } : null));
      setEditingNotes(false);
    } catch {
      alert('فشل حفظ الملاحظات');
    } finally {
      setNotesSaving(false);
    }
  };

  const addTag = async () => {
    if (!newTagInput.trim() || !customer) return;
    const tagToAdd = newTagInput.trim();
    const currentTags = customer.tags || [];
    if (currentTags.includes(tagToAdd)) {
      setNewTagInput('');
      return;
    }
    const updatedTags = [...currentTags, tagToAdd];
    setTagSaving(true);
    try {
      await apiRequest(`/shops/${shopId}/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ tags: updatedTags }),
      });
      setCustomer((prev) => (prev ? { ...prev, tags: updatedTags } : null));
      setNewTagInput('');
    } catch {
      alert('فشل إضافة الوسم');
    } finally {
      setTagSaving(false);
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!customer) return;
    const updatedTags = (customer.tags || []).filter((t) => t !== tagToRemove);
    try {
      await apiRequest(`/shops/${shopId}/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ tags: updatedTags }),
      });
      setCustomer((prev) => (prev ? { ...prev, tags: updatedTags } : null));
    } catch {
      alert('فشل حذف الوسم');
    }
  };

  const adjustLoyalty = async () => {
    if (!adjustDelta || !adjustReason.trim()) return;
    setAdjustSaving(true);
    try {
      await apiRequest(`/shops/${shopId}/loyalty/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          delta: adjustDelta,
          reason: adjustReason.trim(),
          staffName: 'الإدارة',
        }),
      });
      setAdjustOpen(false);
      setAdjustDelta(0);
      setAdjustReason('');
      await loadCustomer();
    } catch {
      alert('فشل تعديل النقاط');
    } finally {
      setAdjustSaving(false);
    }
  };

  const copyCustomerInfo = () => {
    if (!customer) return;
    const text = `${customer.name} - ${customer.phone} - ${customer.email || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = useMemo(() => {
    if (!customer?.name) return 'ع';
    const parts = customer.name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return customer.name.slice(0, 2);
  }, [customer?.name]);

  const filteredOrders = useMemo(() => {
    let list = [...activity];
    if (orderTab !== 'all') {
      list = list.filter((o) => {
        const s = String(o.status || '').toLowerCase();
        if (orderTab === 'new') return s === 'new' || s === 'جديد' || s === 'pending';
        if (orderTab === 'processing') return s === 'processing' || s === 'جاري التجهيز';
        if (orderTab === 'ready') return s === 'ready' || s === 'جاهز';
        if (orderTab === 'delivering') return s === 'delivering' || s === 'جاري التوصيل' || s === 'shipped';
        if (orderTab === 'completed') return s === 'completed' || s === 'مكتمل' || s === 'delivered';
        if (orderTab === 'cancelled') return s === 'cancelled' || s === 'ملغي';
        if (orderTab === 'refunding') return s === 'refunding' || s === 'قيد الاسترجاع';
        if (orderTab === 'partial_refund') return s === 'partial_refund' || s === 'مسترجع جزئياً';
        return true;
      });
    }
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      list = list.filter((o) => String(o.id).toLowerCase().includes(q));
    }
    return list;
  }, [activity, orderTab, orderSearch]);

  const completedOrdersCount = useMemo(() => {
    return activity.filter(
      (o) => o.status === 'COMPLETED' || o.status === 'DELIVERED' || o.status === 'مكتمل'
    ).length;
  }, [activity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-6 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md w-full shadow-sm">
          <AlertTriangle size={36} className="mx-auto mb-3 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900 mb-1">العميل غير موجود</h2>
          <p className="text-xs text-slate-400 mb-4">قد يكون تم حذفه أو أن الرابط غير صحيح</p>
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#492770] text-white text-xs font-bold hover:bg-[#3d1f5e] transition-all"
          >
            <ArrowRight size={14} />
            الرجوع لقائمة العملاء
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900 pb-12"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر الصفحة — سهم الرجوع لقائمة العملاء كالصورة 2 + أزرار التعديل والحذف */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-4 sm:px-6 py-4 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          {/* الجانب الأيمن: سهم الرجوع الدائري + عنوان تفاصيل العميل */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/customers"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-all shadow-sm"
              title="الرجوع لقائمة العملاء"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                تفاصيل العميل
              </h1>
            </div>
          </div>

          {/* الجانب الأيسر: زر تعديل التفاصيل بنفسجي + زر حذف + زر خيارات ... كالصورة 2 */}
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/customers/${customer.id}/edit`}
              className="h-9 px-4 sm:px-5 rounded-full bg-[#492770] hover:bg-[#3d1f5e] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Pencil size={13} />
              تعديل التفاصيل
            </Link>

            <button
              onClick={toggleArchive}
              disabled={archiving}
              className="h-9 px-3.5 sm:px-4 rounded-full border border-slate-200 bg-white text-slate-700 hover:text-red-700 hover:border-red-200 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {archiving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              {customer.archived ? 'استعادة' : 'حذف'}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all"
                title="خيارات إضافية"
              >
                <MoreVertical size={15} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 top-11 w-48 bg-white border border-slate-200 rounded-2xl shadow-lg p-1.5 z-30 space-y-0.5 text-right">
                    {customer.phone && (
                      <a
                        href={`https://wa.me/2${(customer.phone || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl"
                        onClick={() => setMenuOpen(false)}
                      >
                        <MessageCircle size={14} />
                        مراسلة عبر واتساب
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        copyCustomerInfo();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                    >
                      <Copy size={14} />
                      نسخ بيانات العميل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setAdjustOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                    >
                      <Trophy size={14} />
                      تعديل نقاط الولاء
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* تخطيط الصفحة: عمود جانبي يمين (كارت البروفايل) + المحتوى الأيسر (الإحصائيات وسجل الطلبات) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ============================================================
           * العمود الأيمن (Sidebar) كالصورة 2: بروفايل، دعوة، وسوم، إعدادات، ملاحظات
           * ============================================================ */}
          <div className="lg:col-span-4 space-y-4">
            {/* كارت بروفايل العميل الرئيسي كالصورة 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-13 h-13 rounded-2xl bg-purple-100/80 text-[#492770] font-black text-lg flex items-center justify-center shadow-inner">
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">
                      {customer.name}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      عميل منذ {new Date(customer.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>
              </div>

              {/* أزرار الاتصال والمراسلة السريعة كالصورة 2 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 px-2 text-slate-500">
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    title="اتصال هاتفي"
                  >
                    <Phone size={15} />
                  </a>
                )}
                {customer.phone && (
                  <a
                    href={`https://wa.me/2${(customer.phone || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    title="واتساب"
                  >
                    <MessageCircle size={15} />
                  </a>
                )}
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    title="إرسال بريد"
                  >
                    <Mail size={15} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={copyCustomerInfo}
                  className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors relative"
                  title="نسخ البيانات"
                >
                  {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                </button>
                <button
                  type="button"
                  onClick={toggleArchive}
                  className="p-2 rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="حذف العميل"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* تفاصيل العميل كالصورة 2: الدولة، نوع العميل، الجنس، تاريخ الميلاد، قناة الوصول، آخر تسجيل دخول */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">الدولة</span>
                  <span className="font-bold text-slate-800">
                    {[customer.country, customer.city].filter(Boolean).join('، ') || 'مصر'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">نوع العميل</span>
                  <span className="font-bold text-slate-800">
                    {customer.customerType === 'company' ? (customer.companyName || 'شركة') : 'فرد'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">الجنس</span>
                  <span className="font-bold text-slate-800">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">تاريخ الميلاد</span>
                  <span className="font-bold text-slate-800">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">قناة وصول العميل</span>
                  <span className="font-bold text-slate-800">
                    {SOURCE_LABELS[customer.source] || customer.source || 'المتجر الإلكتروني'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">آخر تسجيل دخول</span>
                  <span className="font-bold text-slate-800">
                    {customer.lastPurchaseAt
                      ? new Date(customer.lastPurchaseAt).toLocaleDateString('ar-EG')
                      : 'لا توجد بيانات سابقة'}
                  </span>
                </div>
              </div>
            </div>

            {/* كارت رابط الدعوة كالصورة 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
              <div className="flex items-center justify-between mb-3 text-right">
                <h3 className="text-xs font-bold text-slate-900">رابط الدعوة</h3>
              </div>
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                <Share2 size={20} />
              </div>
              <h4 className="text-xs font-bold text-slate-800 mb-1">برنامج أمنيات شركائك</h4>
              <p className="text-[11px] text-slate-400 font-semibold mb-3">
                شارك رابط العطاء لأصدقائهم ويكسب المكافآت.
              </p>
              <button
                type="button"
                onClick={() => alert('ميزة برنامج الدعوات قيد التفعيل لهذا العميل')}
                className="w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                تفاصيل
              </button>
            </div>

            {/* كارت الوسوم كالصورة 2 مع إمكانية إضافة وسم سريع */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 mb-2">الوسوم</h3>
              <div className="relative mb-2.5">
                <input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="اكتب للبحث أو اضغط Enter لإنشاء وسم جديد..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(customer.tags || []).length === 0 ? (
                  <span className="text-[11px] text-slate-400 font-semibold">لا توجد وسوم مخصصة</span>
                ) : (
                  customer.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="text-slate-400 hover:text-red-600 mr-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* كارت الإعدادات مع مفاتيح التبديل (Toggles) كالصورة 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold text-slate-900 mb-1">الإعدادات</h3>

              {/* سويتش الدفع عند الاستلام */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800">الدفع عند الاستلام</div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">
                    على خيار التاجر عند استلام كود العميل وإمكانية الطلب بالدفع عند الاستلام
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCodEnabled((v) => !v)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                    codEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      codEnabled ? 'translate-x-0' : '-translate-x-5'
                    }`}
                  />
                </button>
              </div>

              {/* سويتش استقبال الرسائل التسويقية */}
              <div className="flex items-start justify-between gap-3 pt-2.5 border-t border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-800">استقبال الرسائل التسويقية</div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">
                    يستقبل العميل رسائل العروض والمسابقات الدورية
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMarketingOptIn((v) => !v)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                    marketingOptIn ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      marketingOptIn ? 'translate-x-0' : '-translate-x-5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* كارت ملاحظات العميل كالصورة 2 مع إمكانية التعديل */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold text-slate-900">ملاحظات العميل</h3>
                {!editingNotes && (
                  <button
                    type="button"
                    onClick={() => setEditingNotes(true)}
                    className="text-xs font-bold text-[#492770] hover:underline"
                  >
                    تعديل
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mb-2">
                ملاحظات داخلية عن العميل، يطلع عليها فريق العمل فقط.
              </p>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={3}
                    placeholder="اكتب ملاحظة داخلية عن العميل..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingNotes(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={saveNotes}
                      disabled={notesSaving}
                      className="px-3 py-1.5 rounded-lg bg-[#492770] text-white text-xs font-bold hover:bg-[#3d1f5e] flex items-center gap-1"
                    >
                      {notesSaving && <Loader2 size={12} className="animate-spin" />}
                      حفظ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  {customer.notes || 'لا توجد ملاحظات مسجلة بعد.'}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================
           * العمود الأيسر (Main Content) كالصورة 2:
           * 6 كروت إحصائية + السلات المتروكة + سجل الطلبات + الأكورديونات
           * ============================================================ */}
          <div className="lg:col-span-8 space-y-4">
            {/* شبكة البطاقات الست كالصورة 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* 1. جميع الطلبات */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">جميع الطلبات</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-[#492770] flex items-center justify-center">
                    <ShoppingBag size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
                  {customer.totalOrders ?? 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                  <span>طلب واحد قيد التنفيذ</span>
                  <button
                    type="button"
                    onClick={() => setOrderTab('all')}
                    className="text-[#492770] font-bold hover:underline"
                  >
                    عرض الكل
                  </button>
                </div>
              </div>

              {/* 2. الطلبات المكتملة */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">الطلبات المكتملة</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
                  {completedOrdersCount || Math.min(customer.totalOrders || 0, 0)}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                  آخر طلب مكتمل مؤخراً
                </div>
              </div>

              {/* 3. إجمالي المصروفات */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">إجمالي المصروفات</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center">
                    <CreditCard size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
                  {customer.totalSpent.toLocaleString()} {currency}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                  دفع نقداً أو ببطاقة الائتمان
                </div>
              </div>

              {/* 4. رصيد المحفظة */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">رصيد المحفظة</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
                  {customer.balanceDue < 0 ? Math.abs(customer.balanceDue).toLocaleString() : 0} {currency}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                  <span>0% من التكلفة العامة</span>
                  <button
                    type="button"
                    onClick={() => setOpenAccordion('wallet')}
                    className="text-[#492770] font-bold hover:underline"
                  >
                    سجل
                  </button>
                </div>
              </div>

              {/* 5. نقاط الولاء */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">نقاط الولاء</span>
                  <div className="w-8 h-8 rounded-xl bg-yellow-100/70 text-yellow-700 flex items-center justify-center">
                    <Trophy size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
                  {customer.loyaltyBalance ?? 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                  <span>0 نقطة معلقة</span>
                  <button
                    type="button"
                    onClick={() => setAdjustOpen(true)}
                    className="text-[#492770] font-bold hover:underline"
                  >
                    سجل
                  </button>
                </div>
              </div>

              {/* 6. مكافآت التقييمات */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">مكافآت التقييمات</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-100/70 text-rose-700 flex items-center justify-center">
                    <Star size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
                  —
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                  <span>مكافأة لكل تقييم موثق</span>
                  <button
                    type="button"
                    onClick={() => alert('مكافآت التقييمات مفعلة تلقائياً')}
                    className="text-[#492770] font-bold hover:underline"
                  >
                    سجل
                  </button>
                </div>
              </div>
            </div>

            {/* كارت السلات المتروكة كالصورة 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 mb-2">السلات المتروكة</h3>
              <p className="text-xs text-slate-400 font-semibold py-1">لم يترك أي سلة</p>
            </div>

            {/* قسم سجل الطلبات كالصورة 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">سجل الطلبات</h3>
              </div>

              {/* تابات الحالات كالصورة 2 */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100">
                {ORDER_TABS.map((t) => {
                  const active = orderTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setOrderTab(t.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        active
                          ? 'bg-[#492770] text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* شريط البحث في الطلبات */}
              <div className="relative">
                <Search
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="بحث برقم الطلب..."
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-full py-2 pr-9 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              {/* جدول الطلبات كالصورة 2 */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold">
                      <th className="px-3 py-2.5">رقم الطلب / السعر</th>
                      <th className="px-3 py-2.5">تاريخ الإنشاء / نوع السجل</th>
                      <th className="px-3 py-2.5">الحالة</th>
                      <th className="px-3 py-2.5">الشحن</th>
                      <th className="px-3 py-2.5">الدفع / حالة الدفع</th>
                      <th className="px-3 py-2.5">المجموع / السلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          <Loader2 size={20} className="animate-spin mx-auto text-purple-600" />
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-bold">
                          لا توجد طلبات مطابقة في هذا التصنيف
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-xs"
                        >
                          <td className="px-3 py-3 font-bold text-slate-900 tabular-nums">
                            #{String(o.id).slice(0, 8)}
                          </td>
                          <td className="px-3 py-3 text-slate-500 font-semibold">
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : '—'}
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {o.status || 'جديد'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600 font-semibold">
                            مندوب
                          </td>
                          <td className="px-3 py-3 text-slate-700 font-semibold">
                            {o.paymentStatus || 'الدفع عند الاستلام'}
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-900 tabular-nums">
                            {Number(o.total || 0).toLocaleString()} {currency}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* أزرار أسفل سجل الطلبات كالصورة 2 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderTab('all')}
                    className="h-8 px-4 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    عرض الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/orders/new?customerId=${customer.id}`)}
                    className="h-8 px-4 rounded-full bg-[#492770] text-white text-xs font-bold hover:bg-[#3d1f5e]"
                  >
                    إنشاء طلب للعميل
                  </button>
                </div>
                <div className="text-xs text-slate-400 font-bold">
                  إجمالي النتائج: {filteredOrders.length}
                </div>
              </div>
            </div>

            {/* الأكورديونات السفلية القابلة للفتح والطي كالصورة 2 */}
            <div className="space-y-2">
              {/* 1. العناوين */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'addresses' ? null : 'addresses'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">العناوين</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'addresses' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'addresses' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs space-y-3">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 mb-1">العنوان الأساسي:</div>
                      <div className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {[customer.address, customer.city, customer.country].filter(Boolean).join('، ') || 'لم يتم تسجيل عنوان أساسي'}
                      </div>
                    </div>
                    {customer.shippingAddresses && customer.shippingAddresses.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">عناوين الشحن الإضافية:</div>
                        <div className="space-y-1.5">
                          {customer.shippingAddresses.map((sa, idx) => (
                            <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                              <span className="font-bold text-slate-800">{sa.label || `عنوان ${idx + 1}`}: {sa.address} - {sa.city}</span>
                              <span className="text-slate-400 tabular-nums">{sa.phone}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. المحفظة */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'wallet' ? null : 'wallet'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">المحفظة</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'wallet' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'wallet' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs">
                    <p className="text-slate-500 font-semibold py-2">
                      الرصيد المتاح في المحفظة:{' '}
                      <span className="font-bold text-slate-900">
                        {customer.balanceDue < 0 ? Math.abs(customer.balanceDue).toLocaleString() : 0} {currency}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* 3. نقاط الولاء */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'loyalty' ? null : 'loyalty'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">نقاط الولاء</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'loyalty' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'loyalty' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs flex items-center justify-between">
                    <span className="text-slate-600 font-semibold">
                      إجمالي رصيد النقاط: <strong className="text-slate-900 tabular-nums">{customer.loyaltyBalance}</strong> نقطة
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdjustOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-[#492770] text-white text-[11px] font-bold hover:bg-[#3d1f5e]"
                    >
                      تعديل الرصيد
                    </button>
                  </div>
                )}
              </div>

              {/* 4. برنامج الدعوات */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'referral' ? null : 'referral'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">برنامج الدعوات</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'referral' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'referral' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs text-slate-500 font-semibold py-2">
                    العميل مؤهل لدعوة أصدقائه والحصول على مكافآت الشراء المشتركة.
                  </div>
                )}
              </div>

              {/* 5. قائمة الأمنيات */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'wishlist' ? null : 'wishlist'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">قائمة الأمنيات</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'wishlist' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'wishlist' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs text-slate-500 font-semibold py-2">
                    لم يقم العميل بإضافة منتجات إلى قائمة الأمنيات بعد.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة تعديل نقاط الولاء */}
      {adjustOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">تعديل نقاط الولاء للعميل</h3>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                النقاط (موجب للإضافة، سالب للخصم)
              </label>
              <input
                type="number"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">السبب</label>
              <input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="مثلاً: هدية تسجيل أو تعويض"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={adjustLoyalty}
                disabled={adjustSaving || !adjustDelta || !adjustReason.trim()}
                className="px-4 py-2 rounded-xl bg-[#492770] text-white text-xs font-bold hover:bg-[#3d1f5e] flex items-center gap-1.5 disabled:opacity-50"
              >
                {adjustSaving && <Loader2 size={13} className="animate-spin" />}
                تأكيد التعديل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
