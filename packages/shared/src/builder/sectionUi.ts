// Shared section UI helpers — single source of truth for section headers
// and responsive grids in the editor canvas AND the published site.
import type * as React from 'react';
import type { DesignTokens } from './types';

export interface SectionHeaderProps {
  badge?: string;
  title?: string;
  subtitle?: string;
}

/** بادج القسم الموحدة — نفس الشكل في كل الأقسام. */
export function sectionBadgeStyle(theme: DesignTokens): React.CSSProperties {
  return {
    backgroundColor: `${theme.colors.primary}18`,
    color: theme.colors.primary,
  };
}

/** أحجام عناوين متجاوبة موحدة — موبايل أصغر تلقائياً. */
export const sectionTitleClass = 'text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight break-words';
export const sectionSubtitleClass = 'text-xs sm:text-sm leading-relaxed break-words';
export const sectionHeaderWrapClass = 'text-center mb-6 sm:mb-10 space-y-2 max-w-2xl mx-auto';
export const sectionShellClass = 'max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12';

/** شبكة متجاوبة موحدة — عمود واحد على الموبايل تلقائياً. */
export function responsiveGridClass(
  desktop: 1 | 2 | 3 | 4 = 3,
  tablet: 1 | 2 | 3 = 2,
  mobile: 1 | 2 = 1,
): string {
  const m = mobile === 2 ? 'grid-cols-2' : 'grid-cols-1';
  const t = tablet === 1 ? 'sm:grid-cols-1' : tablet === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  const d =
    desktop === 1
      ? 'lg:grid-cols-1'
      : desktop === 2
        ? 'lg:grid-cols-2'
        : desktop === 4
          ? 'lg:grid-cols-4'
          : 'lg:grid-cols-3';
  return `grid ${m} ${t} ${d}`;
}

/** بطاقة أساسية موحدة — حدود وظل ونصف قطر من الثيم. */
export function cardBaseStyle(theme: DesignTokens): React.CSSProperties {
  return {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
  };
}
