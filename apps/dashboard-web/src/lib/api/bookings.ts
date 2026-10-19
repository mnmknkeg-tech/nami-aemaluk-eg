import { apiRequest } from './client';

// Local fallback store so bookings created while the backend is unreachable
// survive a refresh. Same key the legacy shared service used.
const getLocalBookings = (): any[] => {
  try {
    const raw = localStorage.getItem('ray_local_bookings');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveLocalBookings = (list: any[]) => {
  try {
    localStorage.setItem('ray_local_bookings', JSON.stringify(list));
  } catch {}
};

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

  try {
    return await apiRequest<any>('/bookings', { method: 'POST', body: JSON.stringify(newBooking) });
  } catch {
    const current = getLocalBookings();
    current.push({ ...newBooking, __recordType: 'booking' });
    saveLocalBookings(current);
    return { ...newBooking, __recordType: 'booking' };
  }
}

export async function updateBookingStatusViaBackend(id: string, status: string) {
  const current = getLocalBookings();
  const idx = current.findIndex((b) => String(b.id) === String(id));
  if (idx !== -1) {
    current[idx].status = status.toUpperCase();
    saveLocalBookings(current);
  }

  try {
    return await apiRequest<any>(`/bookings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch {
    return { id, status };
  }
}
