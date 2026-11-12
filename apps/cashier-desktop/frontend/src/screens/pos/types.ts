export type CartItem = { productId: string; name: string; price: number; quantity: number };
export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'credit';

export const money = (n: number) => (Number.isFinite(n) ? Number(n).toFixed(2) : '0.00');
