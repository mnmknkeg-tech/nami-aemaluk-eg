'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/auth';

type InstalledApp = {
  id: string;
  shopId: string;
  status: 'INSTALLED' | 'UNINSTALLED';
  isActive: boolean;
  installedAt: string;
  /** Flat app fields returned by /apps/me (no nested app object). */
  appKey?: string;
  appName?: string;
  appVersion?: string;
  /** Legacy shape kept for compatibility. */
  appId?: string;
  app?: {
    id: string;
    key: string;
    name: string;
    description?: string;
    version?: string;
  };
};

const keyOf = (a: InstalledApp) => a.app?.key ?? a.appKey ?? a.appId ?? '';

export function useInstalledApps() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/apps/me');
      const list = Array.isArray(data) ? data : data?.apps || data?.data || [];
      setApps(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch installed apps');
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const isInstalled = useCallback(
    (appKey: string): boolean => {
      return apps.some((a) => keyOf(a) === appKey && a.status === 'INSTALLED' && a.isActive);
    },
    [apps]
  );

  const getApp = useCallback(
    (appKey: string): InstalledApp | null => {
      return apps.find((a) => keyOf(a) === appKey && a.status === 'INSTALLED') || null;
    },
    [apps]
  );

  return {
    apps,
    loading,
    error,
    isInstalled,
    getApp,
    refetch: fetchApps,
  };
}
