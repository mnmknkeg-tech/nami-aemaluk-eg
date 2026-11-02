/**
 * Shared Tailwind class strings for product layouts.
 *
 * They must stay static strings (never built at runtime) so Tailwind can see
 * them, and they live here so the rails, the grids and their skeletons can
 * never drift apart again.
 */

/** Responsive grid: 2 columns on phones → 4 on desktop. */
export const PRODUCT_GRID_CLASS =
  'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6';

/**
 * One card inside the horizontal rail:
 * ~2 cards + a peek on phones → exactly 5 cards per view on desktop.
 */
export const RAIL_ITEM_WIDTH =
  'w-[calc((100%-0.75rem)/2.15)] sm:w-[calc((100%-0.75rem)/2.6)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)] shrink-0 snap-start';

/** The horizontal scroller itself (swipe on touch, arrows on desktop). */
export const RAIL_SCROLLER_CLASS =
  'flex gap-3 md:gap-4 lg:gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-1 -mx-4 px-4 md:mx-0 md:px-1';
