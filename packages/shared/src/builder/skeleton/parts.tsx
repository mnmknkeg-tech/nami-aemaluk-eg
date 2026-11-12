import React from 'react';
import type { StyleProperties } from '../types';

/** ألوان محايدة — ثيم التاجر ممكن يكون أي لون، والرمادي ما بيكسرش أي ثيم. */
export const SK = {
  base: '#e2e8f0',
  soft: '#f1f5f9',
  dark: '#334155',
  card: '#ffffff',
  line: '#e2e8f0',
} as const;

/** يحوّل حجم الخط في الـ Builder إلى px عشان الشريط يطلع بنفس ارتفاع النص. */
export function fontSizePx(styles: StyleProperties): number {
  const raw = styles.fontSize as unknown;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  return Number.isFinite(n) && n > 4 && n < 120 ? n : 16;
}

export function px(value: unknown, fallback?: string): string | undefined {
  if (value == null || value === '') return fallback;
  if (typeof value === 'number') return `${value}px`;
  return String(value);
}

/** لَبنة أساسية: شريط/مستطيل رمادي. */
export function Bar({
  w,
  h = 14,
  color = SK.base,
  radius,
  style,
}: {
  w?: string;
  h?: number | string;
  color?: string;
  radius?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="sk-bar"
      style={{
        display: 'block',
        width: w ?? '100%',
        height: h,
        backgroundColor: color,
        borderRadius: radius ?? Math.max(4, Math.round(Number(h) / 3 || 4)),
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export type Align = React.CSSProperties['textAlign'];
export const rightText = (a?: Align): React.CSSProperties =>
  ({ textAlign: a || 'right' }) as React.CSSProperties;
