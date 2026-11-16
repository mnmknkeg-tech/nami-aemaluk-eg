'use client';

import React, { useEffect, useState } from 'react';
import {
  BuilderProvider,
  type BuilderPreviewSnapshot,
} from '@/components/website-builder/context/BuilderContext';
import { StandalonePreview } from '@/components/website-builder/components/preview/StandalonePreview';

const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

export default function PreviewPage() {
  const [snapshot, setSnapshot] = useState<BuilderPreviewSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [snapshotError, setSnapshotError] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('snapshot');
    if (!token) {
      setReady(true);
      return;
    }

    if (!/^[a-zA-Z0-9-]{16,100}$/.test(token)) {
      setSnapshotError(true);
      setReady(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(`ray_builder_preview_snapshot_${token}`);
      if (!raw) throw new Error('Preview snapshot not found');
      const parsed = JSON.parse(raw) as Partial<BuilderPreviewSnapshot>;
      const valid =
        parsed.version === 1 &&
        typeof parsed.createdAt === 'number' &&
        Date.now() - parsed.createdAt >= 0 &&
        Date.now() - parsed.createdAt <= SNAPSHOT_TTL_MS &&
        typeof parsed.shopId === 'string' &&
        parsed.shopId.length > 0 &&
        parsed.website &&
        Array.isArray(parsed.website.pages) &&
        parsed.website.pages.length > 0 &&
        parsed.website.components &&
        typeof parsed.website.components === 'object' &&
        typeof parsed.activePageId === 'string' &&
        typeof parsed.isRtl === 'boolean';

      if (!valid) throw new Error('Preview snapshot is invalid or expired');
      setSnapshot(parsed as BuilderPreviewSnapshot);
    } catch (error) {
      console.warn('[builder-preview] snapshot could not be loaded', error);
      setSnapshotError(true);
    } finally {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 text-sm text-slate-600">
        جاري تجهيز المعاينة...
      </main>
    );
  }

  if (snapshotError) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">تعذّر فتح المعاينة</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            رابط المعاينة غير صالح أو انتهت صلاحيته. ارجع إلى محرر الموقع وافتح معاينة جديدة.
          </p>
        </div>
      </main>
    );
  }

  return (
    <BuilderProvider initialPreviewSnapshot={snapshot} readOnlyPreview>
      <StandalonePreview />
    </BuilderProvider>
  );
}
