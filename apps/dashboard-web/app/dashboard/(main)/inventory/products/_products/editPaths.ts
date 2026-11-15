import type { Product } from './types';

export function getProductEditPath(product: Product): string {
  const ex = (product as any).extraData || (product as any).extra_data || {};
  const unit = String(product.unit || '').toLowerCase();
  const cat =
    typeof product.category === 'string' ? product.category : product.category?.name || '';

  if (unit === 'service' || ex.isService || ex.orderFormFields?.length) {
    return `/dashboard/inventory/add-product/service?edit=${product.id}`;
  }
  if (unit === 'booking' || ex.isBooking || ex.bookingSettings) {
    return `/dashboard/inventory/add-product/bookings?edit=${product.id}`;
  }
  if (unit === 'bundle' || ex.isBundle || ex.bundleItems?.length || ex.customSections?.length) {
    return `/dashboard/inventory/add-product/bundle?edit=${product.id}`;
  }
  if (unit === 'giftcard' || ex.codeType || ex.digitalCodes?.length) {
    return `/dashboard/inventory/add-product/giftcard?edit=${product.id}`;
  }
  if (unit === 'digital' || ex.isDigital || ex.digitalFiles?.length) {
    return `/dashboard/inventory/add-product/digital?edit=${product.id}`;
  }
  if (unit === 'meal' || unit === 'restaurant' || /أكل|مأكولات|مشروبات|وجب|مطعم/i.test(cat)) {
    return `/dashboard/inventory/add-product/restaurant?edit=${product.id}`;
  }
  return `/dashboard/inventory/add-product/clothing?edit=${product.id}`;
}
