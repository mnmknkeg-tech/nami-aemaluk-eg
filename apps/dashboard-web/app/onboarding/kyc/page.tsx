'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  CreditCard,
  FileText,
  ChevronLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { compressForUpload } from '@/lib/upload-image';

interface KycData {
  taxNumber: string;
  commercialRegister: string;
  idImageUrl: string;
  bankName: string;
  bankAccountNumber: string;
  bankIban: string;
}

type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
type Step = 1 | 2 | 3;

const stepLabels: Record<Step, string> = {
  1: 'البيانات التجارية',
  2: 'بطاقة الهوية',
  3: 'الحساب البنكي',
};

const stepIcons: Record<Step, React.ElementType> = {
  1: Building2,
  2: FileText,
  3: CreditCard,
};

export default function KycPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [kycStatus, setKycStatus] = useState<KycStatus>('none');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<KycData>({
    taxNumber: '',
    commercialRegister: '',
    idImageUrl: '',
    bankName: '',
    bankAccountNumber: '',
    bankIban: '',
  });

  useEffect(() => {
    // Check current KYC status
    fetch('/api/v1/shops/me/kyc', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const status = data?.data?.status || data?.status || 'none';
        setKycStatus(status as KycStatus);
        if (data?.data?.rejectionReason || data?.rejectionReason) {
          setRejectionReason(data?.data?.rejectionReason || data?.rejectionReason);
        }
        // Pre-fill existing data
        if (data?.data) {
          setForm((prev) => ({
            ...prev,
            taxNumber: data.data.taxNumber || '',
            commercialRegister: data.data.commercialRegister || '',
            idImageUrl: data.data.idImageUrl || '',
            bankName: data.data.bankName || '',
            bankAccountNumber: data.data.bankAccountNumber || '',
            bankIban: data.data.bankIban || '',
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (kycStatus === 'verified') {
      router.replace('/dashboard');
    }
  }, [kycStatus, router]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const toUpload = await compressForUpload(file, 'document');
      // Get presigned URL
      const presignRes = await fetch('/api/v1/media/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contentType: toUpload.type, fileName: toUpload.name }),
      });
      const presignData = await presignRes.json();
      const { uploadUrl, fileUrl } = presignData?.data || presignData;

      // Upload to storage
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': toUpload.type },
        body: toUpload,
      });

      setForm((prev) => ({ ...prev, idImageUrl: fileUrl }));
    } catch {
      // handle upload error
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/v1/shops/me/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      setKycStatus('pending');
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"
        dir="rtl"
      >
        <div className="w-8 h-8 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Pending review state
  if (kycStatus === 'pending') {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4"
        dir="rtl"
      >
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">قيد المراجعة</h2>
          <p className="text-sm text-slate-500">
            تم إرسال بياناتك وهي قيد المراجعة. سيتم إخطارك بالنتيجة.
          </p>
        </div>
      </div>
    );
  }

  // Rejected state
  if (kycStatus === 'rejected') {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4"
        dir="rtl"
      >
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">تم رفض التوثيق</h2>
          {rejectionReason && (
            <p className="text-sm text-slate-500 mb-4">السبب: {rejectionReason}</p>
          )}
          <button
            type="button"
            onClick={() => setKycStatus('none')}
            className="px-6 py-3 bg-[#00E5FF] text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg"
          >
            إعادة الإرسال
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8" dir="rtl">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
          توثيق التاجر (KYC)
        </h1>

        {/* Step Indicators */}
        <div className="flex items-center gap-4 mb-8">
          {([1, 2, 3] as Step[]).map((s) => {
            const Icon = stepIcons[s];
            const isActive = step === s;
            const isDone = step > s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (isDone) setStep(s);
                }}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border transition-all
                  ${isActive ? 'bg-[#00E5FF]/10 border-[#00E5FF]/30 text-[#00E5FF]' : ''}
                  ${isDone ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-600' : ''}
                  ${!isActive && !isDone ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400' : ''}
                `}
              >
                {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                <span className="text-sm font-bold">{stepLabels[s]}</span>
              </button>
            );
          })}
        </div>

        {/* Step 1: Tax & Commercial */}
        {step === 1 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                الرقم الضريبي <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.taxNumber}
                onChange={(e) => setForm((p) => ({ ...p, taxNumber: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00E5FF]/50 outline-none"
                placeholder="مثال: 30012345600123"
                required
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                السجل التجاري
              </label>
              <input
                type="text"
                value={form.commercialRegister}
                onChange={(e) => setForm((p) => ({ ...p, commercialRegister: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00E5FF]/50 outline-none"
                placeholder="رقم السجل التجاري"
              />
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!form.taxNumber}
              className="w-full py-3 bg-[#00E5FF] text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        )}

        {/* Step 2: ID Upload */}
        {step === 2 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                صورة بطاقة الهوية
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center">
                {form.idImageUrl ? (
                  <div className="space-y-3">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                    <p className="text-sm font-bold text-green-600">تم رفع الصورة</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-3">اسحب الصورة هنا أو انقر للاختيار</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="mx-auto"
                    />
                  </>
                )}
                {uploading && (
                  <div className="mt-3">
                    <div className="w-6 h-6 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!form.idImageUrl}
                className="flex-1 py-3 bg-[#00E5FF] text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Bank Info */}
        {step === 3 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                اسم البنك
              </label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00E5FF]/50 outline-none"
                placeholder="مثال: البنك الأهلي المصري"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                رقم الحساب
              </label>
              <input
                type="text"
                value={form.bankAccountNumber}
                onChange={(e) => setForm((p) => ({ ...p, bankAccountNumber: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00E5FF]/50 outline-none"
                placeholder="رقم الحساب البنكي"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                IBAN
              </label>
              <input
                type="text"
                value={form.bankIban}
                onChange={(e) => setForm((p) => ({ ...p, bankIban: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00E5FF]/50 outline-none"
                placeholder="EGXX000000000000000000000000"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !form.bankName || !form.bankAccountNumber}
                className="flex-1 py-3 bg-[#00E5FF] text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                )}
                إرسال للمراجعة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
