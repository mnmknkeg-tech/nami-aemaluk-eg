import type { ViewportBreakpoint } from './types';

/** CSS viewport widths used by the builder's real iframe preview. */
export const PREVIEW_VIEWPORT_WIDTHS: Record<ViewportBreakpoint, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1024,
};
