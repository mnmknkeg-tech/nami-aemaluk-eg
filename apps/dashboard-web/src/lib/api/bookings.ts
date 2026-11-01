import { apiRequest } from './client';

export async function addBookingViaBackend(booking: any) {
  const newBooking = {
    id: booking.id || `booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    itemId: booking.itemId,
    itemName: booking.itemName,
    itemImage: booking.itemImage,
    itemPrice: booking.itemPrice ?? 300,
    shopId: booking.shopId,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    customerEmail: booking.customerEmail || '',
    bookingDate: booking.bookingDate || new Date().toISOString().split('T')[0],
    bookingTime: booking.bookingTime || '10:00',
    status: booking.status || 'PENDING',
    createdAt: booking.createdAt || new Date().toISOString(),
    __recordType: 'booking',
    bookingActivityType: booking.bookingActivityType ?? booking.metadata?.bookingActivityType,
    bookingActivityRoute: booking.bookingActivityRoute ?? booking.metadata?.bookingActivityRoute,
    metadata: booking.metadata,
    addons: booking.addons,
    variantSelection: booking.variantSelection ?? booking.variant_selection,
  };

  return apiRequest<any>('/bookings', {
    method: 'POST',
    body: JSON.stringify(newBooking),
  });
}

export async function updateBookingStatusViaBackend(id: string, status: string) {
  return apiRequest<any>(`/bookings/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
