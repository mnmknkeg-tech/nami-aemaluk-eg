'use client';

import React from 'react';
import type { ViewportBreakpoint, Website } from './types';
import { NodeSkeleton } from './skeleton/NodeSkeleton';
import { Bar, SK } from './skeleton/parts';

/**
 * هيكل تحميل (skeleton) **مولَّد من شجرة المكوّنات نفسها** اللي بيرندر الموقع.
 *
 * ليه مولّد من الشجرة مش هيكل ثابت؟
 * لأن كل تاجر يبني موقع مختلف — أي أقسام وأي ترتيب وأي ستايل. الهيكل
 * الثابت بيبان "برمج" وبيعمل layout shift. لما نرسم الشكل من نفس المصدر
 * اللي بيرندر الصفحة، الـ loading يطلع مطابق 1:1.
 *
 * لو مفيش شجرة (مفيش config بعد) بنعرض fallback محايد — مش بنخترع شكل.
 */

export interface SiteSkeletonProps {
  website?: Website | null;
  pageId?: string;
  viewport?: ViewportBreakpoint;
  backgroundColor?: string;
}

/** لمعة تمر أفقياً — نفس الإحساس المستخدم في باقي المنصة. */
function Shimmer() {
  return (
    <style>{`
@keyframes sk-site-sweep { 100% { transform: translateX(100%); } }
.sk-site { position: relative; overflow: hidden; }
.sk-site .sk-bar { position: relative; overflow: hidden; }
.sk-site .sk-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(90deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%);
  animation: sk-site-sweep 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) { .sk-site .sk-bar::after { animation: none; } }
`}</style>
  );
}

/** Fallback محايد — بيتعرض بس لما مفيش شجرة نرسم منها. */
function Fallback() {
  return (
    <div className="sk-site" style={{ background: '#fff', minHeight: '100vh' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '16px 24px',
        }}
      >
        <Bar w="140px" h={34} radius="10px" color={SK.base} />
        <div style={{ display: 'flex', gap: 22 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} w="62px" h={12} color={SK.soft} />
          ))}
        </div>
        <Bar w="120px" h={38} radius="999px" color={SK.base} />
      </div>
      <div
        style={{
          display: 'grid',
          gap: 32,
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'center',
          padding: '56px 24px',
        }}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <Bar w="140px" h={26} radius="999px" color={SK.base} />
          <Bar w="90%" h={38} color={SK.dark} radius="8px" />
          <Bar w="70%" h={38} color={SK.dark} radius="8px" />
          <Bar w="100%" h={13} color={SK.soft} />
          <Bar w="85%" h={13} color={SK.soft} />
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <Bar w="150px" h={46} radius="999px" color={SK.base} />
            <Bar w="120px" h={46} radius="999px" color={SK.soft} />
          </div>
        </div>
        <Bar h="280px" radius="18px" color={SK.soft} />
      </div>
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
          padding: '0 24px 56px',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gap: 10,
              padding: 16,
              borderRadius: 14,
              background: '#fff',
              border: `1px solid ${SK.line}`,
            }}
          >
            <Bar h="92px" radius="10px" color={SK.soft} />
            <Bar h={13} w="70%" color={SK.base} />
            <Bar h={11} w="45%" color={SK.soft} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SiteSkeleton({
  website,
  pageId,
  viewport = 'desktop',
  backgroundColor = '#ffffff',
}: SiteSkeletonProps) {
  const pages = website?.pages || [];
  const page =
    (pageId ? pages.find((p) => p.id === pageId) : undefined) ||
    pages.find((p) => p.metadata?.isHomePage) ||
    pages[0];

  const root = page ? website?.components?.[page.rootNodeId] : undefined;

  // مفيش شجرة → fallback محايد، مش شكل متخيّله.
  if (!website?.components || !page || !root) return <Fallback />;

  return (
    <div
      className="sk-site"
      style={{
        backgroundColor,
        minHeight: '100vh',
        fontFamily: website.theme?.typography?.fontBody || 'inherit',
      }}
      aria-hidden
    >
      <Shimmer />
      <NodeSkeleton node={root} website={website} viewport={viewport} />
    </div>
  );
}

export default SiteSkeleton;
