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
  // القائمة الموحدة للحجوزات بتمسك bookings + reservations معاً.
  // reservations بتاخد بادئة int- — مسارها الصحيح /reservations/:id/status،
  // لا /bookings/:id/status (كان بيودي لـ NotFound صامت لكل تحديث حالة لحجز داخلي).
  if (id.startsWith('int-')) {
    const reservationId = id.slice(4);
    return apiRequest<any>(`/reservations/${encodeURIComponent(reservationId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
  // web- prefix أو id خام → مسار bookings (نشيل web- لو موجود)
  const bookingId = id.startsWith('web-') ? id.slice(4) : id;
  return apiRequest<any>(`/bookings/${encodeURIComponent(bookingId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
