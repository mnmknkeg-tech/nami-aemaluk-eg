import React from 'react';
import { Bar, SK, rightText, type Align } from './parts';
import type { StyleProperties } from '../types';

/** عدد الكروت لكل قسم متكرر — يحدد شكل الشبكة. */
const CARD_GRID: Record<string, number> = {
  products: 8,
  product_filter_tabs: 8,
  features: 3,
  services: 3,
  'services-grid': 4,
  pricing: 3,
  testimonials: 3,
  team: 4,
  gallery: 6,
  bento: 3,
  'bento-grid': 3,
};

function CardGrid({ count }: { count: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: `repeat(${Math.min(count, 4)}, minmax(0,1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gap: 10,
            padding: 16,
            borderRadius: 14,
            background: SK.card,
            border: `1px solid ${SK.line}`,
          }}
        >
          <Bar h="92px" radius="10px" color={SK.soft} />
          <Bar h={13} w="70%" color={SK.base} />
          <Bar h={11} w="45%" color={SK.soft} />
        </div>
      ))}
    </div>
  );
}

const SectionWrap = ({
  children,
  align,
  width,
}: {
  children: React.ReactNode;
  align?: Align;
  width?: string;
}) => (
  <div
    style={{
      display: 'grid',
      gap: 16,
      width: width || '100%',
      justifyItems: align === 'center' ? 'center' : 'stretch',
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ w = '45%', align }: { w?: string; align?: Align }) => (
  <Bar w={w} h={26} color={SK.dark} style={{ ...rightText(align), marginLeft: 'auto' }} />
);

/** بطاقات إحصائية — قسم الأرقام. */
const StatsBlock = () => (
  <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        style={{
          display: 'grid',
          gap: 10,
          padding: 20,
          borderRadius: 16,
          background: SK.card,
          border: `1px solid ${SK.line}`,
        }}
      >
        <Bar h={30} w="60%" color={SK.base} />
        <Bar h={11} w="80%" color={SK.soft} />
      </div>
    ))}
  </div>
);

/** الهيرو — نص + أزرار، وصورة لو القسم مقسوم نصين. */
const HeroBlock = ({ styles, align }: { styles: StyleProperties; align?: Align }) => {
  const text = rightText(align);
  const split = String(styles.gridColumns || '')
    .trim()
    .includes(' ');
  return (
    <div
      style={{
        display: 'grid',
        gap: 32,
        gridTemplateColumns: split ? '1fr 1fr' : '1fr',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <Bar w="140px" h={26} radius="999px" color={SK.base} />
        <Bar w="90%" h={38} color={SK.dark} radius="8px" style={text} />
        <Bar w="70%" h={38} color={SK.dark} radius="8px" style={text} />
        <Bar w="100%" h={13} color={SK.soft} style={text} />
        <Bar w="85%" h={13} color={SK.soft} style={text} />
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <Bar w="150px" h={46} radius="999px" color={SK.base} />
          <Bar w="120px" h={46} radius="999px" color={SK.soft} />
        </div>
      </div>
      {split && <Bar h="280px" radius="18px" color={SK.soft} />}
    </div>
  );
};

/** شريط التنقل — شعار + روابط + زر. */
const NavBlock = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
    <Bar w="140px" h={34} radius="10px" color={SK.base} />
    <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Bar key={i} w="62px" h={12} color={SK.soft} />
      ))}
    </div>
    <Bar w="120px" h={38} radius="999px" color={SK.base} />
  </div>
);

/** الفوتر — 4 أعمدة روابط. */
const FooterBlock = () => (
  <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} style={{ display: 'grid', gap: 10 }}>
        <Bar w="110px" h={16} color={SK.base} />
        <Bar w="100%" h={11} color={SK.soft} />
        <Bar w="85%" h={11} color={SK.soft} />
        <Bar w="70%" h={11} color={SK.soft} />
      </div>
    ))}
  </div>
);

/** دعوة لاتخاذ إجراء — عنوان + نص + زر في كارت. */
const CtaBlock = ({ align }: { align?: Align }) => {
  const text = rightText(align);
  return (
    <div
      style={{
        display: 'grid',
        gap: 14,
        justifyItems: 'center',
        padding: '48px 24px',
        borderRadius: 20,
        background: SK.card,
        border: `1px solid ${SK.line}`,
      }}
    >
      <Bar w="55%" h={28} color={SK.dark} style={text} />
      <Bar w="70%" h={13} color={SK.soft} style={text} />
      <Bar w="160px" h={46} radius="999px" color={SK.base} style={{ marginTop: 8 }} />
    </div>
  );
};

/** قسم التواصل — بيانات + فورم. */
const ContactBlock = ({ align }: { align?: Align }) => {
  const text = rightText(align);
  return (
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <Bar w="60%" h={22} color={SK.dark} style={text} />
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} w="100%" h={46} radius="10px" color={SK.soft} />
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gap: 12,
          padding: 20,
          borderRadius: 16,
          background: SK.card,
          border: `1px solid ${SK.line}`,
        }}
      >
        <Bar w="70%" h={16} color={SK.base} />
        <Bar w="100%" h={46} radius="10px" color={SK.soft} />
        <Bar w="100%" h={46} radius="10px" color={SK.soft} />
        <Bar w="100%" h={120} radius="10px" color={SK.soft} />
      </div>
    </div>
  );
};

/**
 * الهيكل المميّز لكل قسم معروف — بيخلي الـ loading مقروء بدل ما يكون
 * مستطيلات عشوائية. القسم بيتعرف عليه من نوعه في شجرة الـ builder.
 */
export function KnownBlock({
  type,
  styles,
  align,
}: {
  type: string;
  styles: StyleProperties;
  align?: Align;
}) {
  const text = rightText(align);
  const cards = CARD_GRID[type];

  if (cards) {
    return (
      <SectionWrap align={align} width={styles.width}>
        <SectionTitle w="220px" align={align} />
        <CardGrid count={cards} />
      </SectionWrap>
    );
  }

  switch (type) {
    case 'stats':
      return <StatsBlock />;
    case 'faq':
      return <FaqBlock align={align} />;
    case 'hero':
      return <HeroBlock styles={styles} align={align} />;
    case 'header':
    case 'navigation':
      return <NavBlock />;
    case 'footer':
    case 'mobile_footer':
      return <FooterBlock />;
    case 'cta':
      return <CtaBlock align={align} />;
    case 'contact':
    case 'contact-section':
      return <ContactBlock align={align} />;
    default:
      return (
        <SectionWrap align={align} width={styles.width}>
          <SectionTitle align={align} />
          <Bar w="100%" h={13} color={SK.soft} style={text} />
          <Bar w="80%" h={13} color={SK.soft} style={text} />
        </SectionWrap>
      );
  }
}

/** الأسئلة الشائعة — عنوان + أسطر قابلة للطي. */
const FaqBlock = ({ align }: { align?: Align }) => (
  <div style={{ display: 'grid', gap: 14, maxWidth: 820, margin: '0 auto' }}>
    <SectionTitle w="200px" align={align} />
    {Array.from({ length: 5 }).map((_, i) => (
      <Bar key={i} h={54} radius="12px" color={SK.soft} />
    ))}
  </div>
);
