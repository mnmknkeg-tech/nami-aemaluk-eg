/** Pure types shared across the POS page and its extracted sub-components. */

/** Full order payload queued while offline. */
export interface PendingOrder {
  id: string;
  createdAt: number;
  payload: any;
  requestKey: string;
  requestStorageKey?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  addons?: any;
  variantSelection?: any;
  /** Manual price override (per-line). */
  priceOverride?: number | null;
}
