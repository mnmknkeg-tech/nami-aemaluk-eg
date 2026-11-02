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
  Save,
  Lock,
  ChevronRight,
  Check,
  Phone,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { api, clearStoredAuthToken, isSessionActive } from '@/lib/api';
import { ProfileShellSkeleton } from '@/components/Skeleton';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
  });
  /** Extra contact numbers beyond the primary one (max 3). */
  const [extraPhones, setExtraPhones] = useState<string[]>([]);
  const [newExtraPhone, setNewExtraPhone] = useState('');

  useEffect(() => {
    if (!isSessionActive()) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        // /users/me returns the full profile (name, phone, extraPhones)
        // and — unlike /auth/me — is the same object PATCH /users/me accepts.
        const userData = await api.get('/users/me');
        const u = (userData as any)?.data ?? (userData as any)?.user ?? userData;
        setUser(u);
        setForm({
          name: u?.name || '',
          email: u?.email || '',
          phone: u?.phone || '',
          currentPassword: '',
          newPassword: '',
        });
        setExtraPhones(Array.isArray(u?.extraPhones) ? u.extraPhones : []);
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // The backend exposes profile updates on PATCH /users/me (PUT /auth/me
      // does not exist) — it accepts name, primary phone and extra phones.
      await api.patch('/users/me', {
        name: form.name,
        phone: form.phone,
        extraPhones,
      });

      // Update password if provided
      if (form.newPassword) {
        await api.post('/auth/change-password', {
          current_password: form.currentPassword,
          new_password: form.newPassword,
        });
      }

      setSuccessMsg('تم حفظ البيانات بنجاح');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  const addExtraPhone = () => {
    const value = newExtraPhone.trim();
    if (!value) return;
    if (value === form.phone.trim()) {
      setErrorMsg('الرقم الإضافي مكرر مع الرقم الأساسي');
      return;
    }
    if (extraPhones.includes(value)) {
      setErrorMsg('الرقم مضاف بالفعل');
      return;
    }
    if (extraPhones.length >= 3) {
      setErrorMsg('الحد الأقصى 3 أرقام إضافية');
      return;
    }
    setErrorMsg('');
    setExtraPhones((prev) => [...prev, value]);
    setNewExtraPhone('');
  };

  const removeExtraPhone = (value: string) => {
    setExtraPhones((prev) => prev.filter((p) => p !== value));
  };

  // ── Account deletion ────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      // Backend schedules the deletion (soft-deactivate now, purge after 30
      // days). Logging back in before that date cancels it automatically.
      await api.post('/auth/deactivate', {});
      clearStoredAuthToken();
      router.push('/?deleted=1');
    } catch (err: any) {
      setDeleteError(err?.message || 'فشل حذف الحساب، حاول تاني');
      setDeleting(false);
    }
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  <span>العناوين</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <Link
                  href="/profile/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-cyan/10 text-brand-cyan font-semibold"
                >
                  <Settings className="w-5 h-5" />
                  <span>الإعدادات</span>
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
              <h2 className="text-xl font-bold mb-2">إعدادات الحساب</h2>
              <p className="text-sm text-slate-500 mb-6">تحديث بياناتك الشخصية وكلمة المرور</p>

              {successMsg && (
                <div className="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" /> {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    الاسم بالكامل
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      disabled
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      dir="ltr"
                      placeholder="010xxxxxxxx"
                    />
                  </div>
                </div>

                {/* Extra phone numbers */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                    <Phone className="w-3.5 h-3.5 text-brand-cyan" />
                    أرقام إضافية (حتى 3 أرقام)
                  </label>
                  {extraPhones.length > 0 && (
                    <ul className="space-y-2 mb-3">
                      {extraPhones.map((p) => (
                        <li
                          key={p}
                          className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2"
                        >
                          <span className="text-xs font-bold" dir="ltr">
                            {p}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeExtraPhone(p)}
                            aria-label={`حذف الرقم ${p}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {extraPhones.length < 3 && (
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={newExtraPhone}
                        onChange={(e) => setNewExtraPhone(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addExtraPhone();
                          }
                        }}
                        className="flex-1 text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        dir="ltr"
                        placeholder="01xxxxxxxxx"
                      />
                      <button
                        type="button"
                        onClick={addExtraPhone}
                        className="px-4 rounded-xl bg-brand-cyan/10 text-brand-cyan font-bold text-xs inline-flex items-center gap-1.5 hover:bg-brand-cyan/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة رقم
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-semibold mt-2">
                    الأرقام الإضافية تظهر كخيار سريع عند إتمام الطلب بدون إعادة كتابتها
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-brand-cyan" /> تغيير كلمة المرور (اختياري)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        كلمة المرور الحالية
                      </label>
                      <input
                        type="password"
                        value={form.currentPassword}
                        onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        كلمة المرور الجديدة
                      </label>
                      <input
                        type="password"
                        value={form.newPassword}
                        onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-brand-cyan text-black font-bold text-xs inline-flex items-center gap-2 hover:bg-brand-cyan/90 transition-colors mt-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </form>
            </div>

            {/* Danger zone — account deletion */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-red-200 dark:border-red-900/50 p-6">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" /> منطقة الخطر
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-4">
                حذف الحساب يعطل حسابك فوراً ويتم مسح بياناتك نهائياً بعد 30 يوم. لو دخلت حسابك تاني
                قبل كده، الحذف بيتلغى تلقائياً.
              </p>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteConfirmText('');
                    setDeleteError('');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs inline-flex items-center gap-2 hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف حسابي
                </button>
              ) : (
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">
                    متأكد؟ اكتب كلمة <span className="text-red-500 font-black">حذف</span> لتأكيد
                    الحذف النهائي:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 mb-3"
                    placeholder="اكتب: حذف"
                  />
                  {deleteError && (
                    <p className="text-xs font-bold text-red-500 mb-3">{deleteError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteConfirmText.trim() !== 'حذف'}
                      className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs inline-flex items-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                      نعم، احذف حسابي نهائياً
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
                    >
                      رجوع
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
