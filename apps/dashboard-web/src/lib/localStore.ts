'use client';

import { useEffect, useState } from 'react';

/**
 * Tiny localStorage-backed collection store used by pages whose backend
 * modules are not wired yet (branches, team, pricing tiers...).
 * Data lives per-browser until the module gets a real API.
 */
export function useLocalCollection<T extends { id: string }>(key: string) {
  const storageKey = `nami-local-${key}`;
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setItems(raw ? (JSON.parse(raw) as T[]) : []);
    } catch {
      setItems([]);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = (next: T[]) => {
    setItems(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage full / private mode — keep in-memory only */
    }
  };

  return {
    items,
    ready,
    add: (item: Omit<T, 'id'>) => {
      const created = { ...item, id: crypto.randomUUID() } as T;
      persist([...items, created]);
      return created;
    },
    update: (id: string, patch: Partial<T>) => {
      persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },
    remove: (id: string) => {
      persist(items.filter((it) => it.id !== id));
    },
  };
}

export function readLocalRecord<T>(key: string): Partial<T> {
  try {
    const raw = window.localStorage.getItem(`nami-local-${key}`);
    return raw ? (JSON.parse(raw) as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function writeLocalRecord<T>(key: string, value: Partial<T>) {
  try {
    window.localStorage.setItem(`nami-local-${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
