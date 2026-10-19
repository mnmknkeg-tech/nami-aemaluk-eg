'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

export interface SettingsModalState {
  open: boolean;
  tab: string;
  from: string;
}

interface SettingsModalContextValue {
  state: SettingsModalState;
  openModal: (tab: string, from?: string) => void;
  setTab: (tab: string) => void;
  closeModal: () => void;
  expandToPage: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);

export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<SettingsModalState>({
    open: false,
    tab: 'overview',
    from: '',
  });

  const openModal = useCallback((tab: string, from = '') => {
    setState({ open: true, tab, from });
  }, []);

  const setTab = useCallback((tab: string) => {
    setState((prev) => ({ ...prev, tab }));
  }, []);

  const closeModal = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const expandToPage = useCallback(() => {
    const { tab, from } = state;
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (from) params.set('from', from);
    setState((prev) => ({ ...prev, open: false }));
    router.push(`/dashboard/settings?${params.toString()}`);
  }, [state, router]);

  return (
    <SettingsModalContext.Provider value={{ state, openModal, setTab, closeModal, expandToPage }}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal(): SettingsModalContextValue {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) {
    throw new Error('useSettingsModal must be used within SettingsModalProvider');
  }
  return ctx;
}

/**
 * Parse a sectionSettingsHref URL like /dashboard/settings?tab=store&from=website
 * and return { tab, from } for opening the modal.
 */
export function parseSettingsHref(href: string): { tab: string; from: string } {
  try {
    const url = new URL(href, 'http://localhost');
    return {
      tab: url.searchParams.get('tab') || 'overview',
      from: url.searchParams.get('from') || '',
    };
  } catch {
    return { tab: 'overview', from: '' };
  }
}
