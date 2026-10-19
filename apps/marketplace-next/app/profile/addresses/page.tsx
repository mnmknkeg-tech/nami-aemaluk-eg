'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Settings,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Home,
  Briefcase,
  Star,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api, clearStoredAuthToken, isSessionActive } from '@/lib/api';
import { ProfileShellSkeleton } from '@/components/Skeleton';
import { LocationPicker } from '@/components/LocationPicker';

interface Address {
  id: string;
  label: string;
  governorate: string;
  city: string;
  street?: string;
  building?: string;
  notes?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

const emptyForm = {
  label: 'المنزل',
  governorate: '',
  city: '',
  street: '',
  building: '',
  notes: '',
  phone: '',
  lat: undefined as number | undefined,
  lng: undefined as number | undefined,
};

export default function ProfileAddressesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');

  const [showModal, setShowModal] = useState(false);
  /** Index in `addresses` when editing; null when adding a new one. */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    if (!isSessionActive()) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        const userData = await api.get('/users/me');
        const u = (userData as any)?.data ?? (userData as any)?.user ?? userData;
        setUser(u);
        setAddresses(Array.isArray(u?.deliveryAddresses) ? u.deliveryAddresses : []);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = () => {
    clearStoredAuthToken();
    router.push('/');
  };

  /** Persist the given list server-side, then adopt the server response. */
  const persist = async (list: Address[]) => {
    setSaving(true);
    setPageError('');
    try {
      const res = await api.put('/users/me/addresses', {
        addresses: list.map((a) => ({
          id: a.id || '',
          label: a.label,
          governorate: a.governorate,
          city: a.city,
          street: a.street || '',
          building: a.building || '',
          notes: a.notes || '',
          phone: a.phone || '',
          lat: a.lat,
          lng: a.lng,
          isDefault: a.isDefault || false,
        })),
      });
      const saved = (res as any)?.data ?? res;
      setAddresses(Array.isArray(saved) ? saved : []);
      return true;
    } catch (err: any) {
      setPageError(err?.message || 'فشل حفظ العناوين');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditingIndex(null);
    setForm({ ...emptyForm });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (index: number) => {
    const a = addresses[index];
    setEditingIndex(index);
    setForm({
      label: a.label || 'المنزل',
      governorate: a.governorate || '',
      city: a.city || '',
      street: a.street || '',
      building: a.building || '',
      notes: a.notes || '',
      phone: a.phone || '',
      lat: a.lat,
      lng: a.lng,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.governorate.trim() || !form.city.trim()) {
      setFormError('المحافظة والمدينة مطلوبتان');
      return;
    }
    const item: Address = {
      id: editingIndex !== null ? addresses[editingIndex].id : '',
      ...form,
      isDefault: editingIndex !== null ? addresses[editingIndex].isDefault : addresses.length === 0,
    };
    const next = [...addresses];
    if (editingIndex !== null) next[editingIndex] = item;
    else next.push(item);
    if (await persist(next)) {
      setShowModal(false);
    }
  };

  const handleDeleteAddress = async (index: number) => {
    const next = addresses.filter((_, i) => i !== index);
    // Keep at least one default when possible
    if (next.length > 0 && !next.some((a) => a.isDefault))
      next[0] = { ...next[0], isDefault: true };
    await persist(next);
  };

  const handleMakeDefault = async (index: number) => {
    const next = addresses.map((a, i) => ({ ...a, isDefault: i === index }));
    await persist(next);
  };

  if (loading) {
    return <ProfileShellSkeleton rows={3} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 md:pb-12">
      {/* Header */}
      <div className="bg-brand-black text-white py-8 px-4 md:px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-brand-cyan/20 rounded-xl flex items-center justify-center">
              <User className="w-10 h-10 text-brand-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.name || 'مستخدم'}</h1>
              <p className="text-white/60 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <nav className="space-y-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>الملف الشخصي</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <Link
                  href="/profile/orders"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>طلباتي</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <Link
                  href="/profile/wishlist"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <Heart className="w-5 h-5" />
                  <span>المفضلة</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <Link
                  href="/profile/addresses"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-cyan/10 text-brand-cyan font-semibold"
                >
                  <MapPin className="w-5 h-5" />
                  <span>العناوين</span>
                </Link>
                <Link
                  href="/profile/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span>الإعدادات</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-semibold transition-colors mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span>تسجيل الخروج</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">عناوين التوصيل</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    تظهر كاخيار سريع عند إتمام أي طلب — محفوظة في حسابك
                  </p>
                </div>
                <button
                  onClick={openAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-cyan text-black font-bold text-xs hover:bg-brand-cyan/90 transition-colors"
                >
                  <Plus className="w-4 h-4" /> إضافة عنوان
                </button>
              </div>

              {pageError && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {pageError}
                </div>
              )}

              {addresses.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                  <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-sm text-slate-500 mb-1">مفيش عناوين محفوظة</p>
                  <p className="text-xs text-slate-400 mb-4">
                    ضيف عنوانك الأول وهيتمل تلقائياً في كل طلب
                  </p>
                  <button
                    onClick={openAdd}
                    className="px-5 py-2.5 rounded-xl bg-brand-cyan text-black font-bold text-xs"
                  >
                    إضافة عنوان الآن
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr, index) => (
                    <div
                      key={addr.id || index}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 relative bg-slate-50/50 dark:bg-slate-900/40"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 font-bold text-sm text-slate-800 dark:text-slate-200">
                          {addr.label === 'العمل' ? (
                            <Briefcase className="w-4 h-4" />
                          ) : (
                            <Home className="w-4 h-4" />
                          )}
                          {addr.label || 'عنوان'}
                        </span>
                        {addr.isDefault ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan">
                            افتراضي
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMakeDefault(index)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-cyan transition-colors inline-flex items-center gap-1"
                          >
                            <Star className="w-3 h-3" /> تعيين افتراضي
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                        {addr.governorate} - {addr.city}
                      </p>
                      {(addr.street || addr.building) && (
                        <p className="text-xs text-slate-500 mb-2">
                          {addr.street}
                          {addr.building && `، ${addr.building}`}
                        </p>
                      )}
                      {addr.phone && (
                        <p className="text-xs text-slate-400 font-mono mb-2" dir="ltr">
                          {addr.phone}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => openEdit(index)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-cyan hover:text-brand-cyan/80 transition-colors px-2 py-1 rounded-lg hover:bg-brand-cyan/10"
                        >
                          <Pencil className="w-3.5 h-3.5" /> تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(index)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add/Edit modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl my-8">
                  <h3 className="text-lg font-bold mb-1">
                    {editingIndex !== null ? 'تعديل العنوان' : 'إضافة عنوان توصيل'}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mb-4">
                    حدد موقعك على الخريطة وهيتمل تلقائياً، أو اكتبه يدوي
                  </p>
                  <form onSubmit={handleSaveAddress} className="space-y-3">
                    <LocationPicker
                      initialCoords={form.lat && form.lng ? { lat: form.lat, lng: form.lng } : null}
                      onLocationSelect={(lat, lng) => setForm((p) => ({ ...p, lat, lng }))}
                      onAddressResolved={(addr) => {
                        setForm((p) => ({
                          ...p,
                          city: p.city || addr.city || '',
                          street: p.street || addr.district || '',
                        }));
                      }}
                    />
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        النوع
                      </label>
                      <select
                        value={form.label}
                        onChange={(e) => setForm({ ...form, label: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      >
                        <option value="المنزل">المنزل</option>
                        <option value="العمل">العمل</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          المحافظة *
                        </label>
                        <input
                          type="text"
                          value={form.governorate}
                          onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                          placeholder="القاهرة"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          المدينة / الحي *
                        </label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                          placeholder="مثال: المعادي"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        الشارع
                      </label>
                      <input
                        type="text"
                        value={form.street}
                        onChange={(e) => setForm({ ...form, street: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        رقم المبنى والشقة
                      </label>
                      <input
                        type="text"
                        value={form.building}
                        onChange={(e) => setForm({ ...form, building: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        رقم الهاتف للتوصيل
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        dir="ltr"
                        placeholder="01xxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        ملاحظات للمندوب (اختياري)
                      </label>
                      <input
                        type="text"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        placeholder="مثال: أمام صيدلية العزبي"
                      />
                    </div>

                    {formError && <p className="text-xs font-bold text-red-500">{formError}</p>}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl bg-brand-cyan text-black font-bold text-xs inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        حفظ العنوان
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
