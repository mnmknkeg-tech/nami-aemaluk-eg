'use client';

import React from 'react';
import type { ComponentNode, StyleProperties, ViewportBreakpoint, Website } from '../types';
import { Bar, SK, fontSizePx, px, rightText, type Align } from './parts';
import { KnownBlock } from './KnownBlock';

function resolveStyles(node: ComponentNode, viewport: ViewportBreakpoint): StyleProperties {
  const d = node.styles?.desktop || {};
  const t = node.styles?.tablet || {};
  const m = node.styles?.mobile || {};
  if (viewport === 'tablet') return { ...d, ...t };
  if (viewport === 'mobile') return { ...d, ...t, ...m };
  return { ...d };
}

/** العنصر بدون أبناء: ارسم له placeholder حسب نوعه. */
function leafPlaceholder(node: ComponentNode, s: StyleProperties): React.ReactNode {
  const fs = fontSizePx(s);
  const align = s.textAlign;
  const text = rightText(align);

  switch (node.type) {
    case 'image':
      return <Bar h={px(s.height, '220px')} w={s.width} radius="12px" color={SK.base} />;

    case 'heading':
      return (
        <Bar
          w="65%"
          h={Math.round(fs * 1.25)}
          color={SK.dark}
          radius="8px"
          style={{ ...text, marginLeft: 'auto' }}
        />
      );

    case 'paragraph':
      return (
        <span style={{ display: 'grid', gap: 8, width: '100%' }}>
          <Bar h={fs} w="100%" color={SK.soft} style={text} />
          <Bar h={fs} w="92%" color={SK.soft} style={text} />
          <Bar h={fs} w="64%" color={SK.soft} style={text} />
        </span>
      );

    case 'button':
    case 'whatsapp_button':
      return <Bar w="150px" h={44} radius="999px" color={SK.base} />;

    case 'badge':
    case 'announcement_bar':
    case 'announcement-bar':
    case 'promo_banner':
    case 'promo-banner':
    case 'trust-badges':
    case 'trust_badges':
      return <Bar w="180px" h={28} radius="999px" color={SK.base} />;

    case 'input':
      return <Bar h={48} radius="10px" color={SK.soft} />;

    case 'icon':
      return <Bar w="24px" h={24} radius="6px" color={SK.base} />;

    case 'divider':
      return <Bar h="2px" color={SK.soft} />;

    case 'spacer':
      return <span style={{ display: 'block', height: px(s.height, '24px') }} />;

    default:
      return <KnownBlock type={node.type} styles={s} align={align as Align} />;
  }
}

/** عارض recursive: نفس ترتيب الشجرة ونفس الستايلات بتاع الصفحة الحقيقية. */
export function NodeSkeleton({
  node,
  website,
  viewport = 'desktop',
}: {
  node: ComponentNode;
  website: Website;
  viewport?: ViewportBreakpoint;
}) {
  const s = resolveStyles(node, viewport);
  const childIds = node.childrenIds || [];

  // الـ layout والـ spacing مأخوذة من ستايل التاجر نفسه — عشان الأبعاد
  // تطلع مطابقة للصفحة الحقيقية (من غير layout shift).
  const box: React.CSSProperties = {
    display: s.display ?? (childIds.length ? 'flex' : 'block'),
    flexDirection: s.flexDirection,
    justifyContent: s.justifyContent,
    alignItems: s.alignItems,
    flexWrap: s.flexWrap,
    gridTemplateColumns: s.display === 'grid' ? s.gridColumns : undefined,
    gap: s.gap,
    width: s.width,
    minWidth: s.minWidth,
    maxWidth: s.maxWidth,
    height: s.height,
    minHeight: s.minHeight,
    maxHeight: s.maxHeight,
    paddingTop: s.paddingTop,
    paddingRight: s.paddingRight,
    paddingBottom: s.paddingBottom,
    paddingLeft: s.paddingLeft,
    marginTop: s.marginTop,
    marginRight: s.marginRight,
    marginBottom: s.marginBottom,
    marginLeft: s.marginLeft,
    backgroundColor: s.backgroundColor,
    borderRadius: s.borderRadius,
    textAlign: s.textAlign,
  };

  if (childIds.length === 0) {
    return <div style={box}>{leafPlaceholder(node, s)}</div>;
  }

  return (
    <div style={box}>
      {childIds.map((id) => {
        const child = website.components?.[id];
        if (!child) return null;
        return <NodeSkeleton key={id} node={child} website={website} viewport={viewport} />;
      })}
    </div>
  );
}
