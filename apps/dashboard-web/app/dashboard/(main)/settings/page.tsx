'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { apiRequest } from '@/lib/auth';
import { ToastProvider } from '@/components/settings/ToastProvider';
import SettingsShell from '@/components/settings/SettingsShell';

function SettingsPageInner() {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchShop = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/shops/me');
      setShop(data);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  const handleSaved = useCallback(() => {
    fetchShop();
  }, [fetchShop]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold text-right">
          {error}
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="p-6">
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-bold text-right">
          لم يتم العثور على بيانات المتجر
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <SettingsShell shop={shop} onSaved={handleSaved} />
    </ToastProvider>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
        </div>
      }
    >
      <SettingsPageInner />
    </Suspense>
  );
}
