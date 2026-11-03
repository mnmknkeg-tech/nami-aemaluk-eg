export type ResponsiveViewport = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveStyleMap<T extends object> {
  desktop?: T;
  tablet?: Partial<T>;
  mobile?: Partial<T>;
}

/** Merge a component's desktop styles with its active responsive overrides. */
export function mergeResponsiveStyles<T extends object>(
  styles: ResponsiveStyleMap<T> | undefined,
  viewport: ResponsiveViewport
): T {
  const desktop = styles?.desktop || ({} as T);
  const tablet = viewport === 'tablet' || viewport === 'mobile' ? styles?.tablet || {} : {};
  const mobile = viewport === 'mobile' ? styles?.mobile || {} : {};
  return { ...desktop, ...tablet, ...mobile } as T;
}
