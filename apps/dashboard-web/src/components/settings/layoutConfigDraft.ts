/**
 * Shared draft of the latest layoutConfig within ONE save-all batch.
 *
 * Every settings section that writes layoutConfig (store contact info,
 * social links, notifications, receipt theme, modules) rebuilds the object
 * from its `shop` prop. During a save-all the shell PATCHes sections
 * sequentially while the shop prop is still the pre-save snapshot, so the
 * LAST writer would silently wipe the keys of earlier writers
 * (whatsapp/customDomain/socialLinks/notifications/receiptTheme...).
 *
 * The shell calls beginLayoutDraft() before the loop and clearLayoutDraft()
 * after it; each writer reads the freshest base via getLayoutBase() and
 * publishes its result via commitLayoutWrite().
 */

let draft: Record<string, any> | null = null;

/** Reset the draft — call at the start of a save-all batch. */
export function beginLayoutDraft(): void {
  draft = null;
}

/** Drop the draft — call when the batch finishes (success or failure). */
export function clearLayoutDraft(): void {
  draft = null;
}

/** Freshest known layoutConfig: the draft if a batch is running, else the shop prop. */
export function getLayoutBase(shop: any): Record<string, any> {
  if (draft && typeof draft === 'object') return { ...draft };
  const layout = shop?.layoutConfig;
  return layout && typeof layout === 'object' && !Array.isArray(layout) ? { ...layout } : {};
}

/** Publish a layoutConfig write so later writers in the same batch build on it. */
export function commitLayoutWrite(next: Record<string, any>): void {
  draft = { ...(next || {}) };
}
