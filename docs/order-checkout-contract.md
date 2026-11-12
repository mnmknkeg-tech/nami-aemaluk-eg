# Order checkout contract

## Entry points

- `POST /api/v1/orders/public` creates a guest order and does not require an account.
  The handler requires a phone number and a delivery address or a complete coordinate pair.
- `POST /api/v1/orders` is authenticated. The dashboard/POS compatibility route
  `POST /api/v1/shops/:shopId/orders` remains authenticated and continues to serve POS.
- The marketplace checkout uses the public route for guests and the authenticated route
  for signed-in customers. Published website carts use their own per-shop cart and
  `/site/:slug/checkout`; they are not merged with the marketplace cart.
- The Builder's `CartDrawer` is a preview only. It must not create real orders, charge
  customers, or change stock.

## Server-side order rules

- Item identity, shop ownership, channel visibility, availability, and current price
  come from the backend product record. Client totals are not used for guest, customer,
  or website orders.
- Tracked stock is decremented within the order transaction. A concurrent stock update
  that cannot decrement exactly one product row aborts the transaction.
- Coupon validity is checked by the server; usage is reserved in the same transaction
  as the order and stock change.
- Guest orders have no user account. Migration `000087_guest_orders_idempotency` makes
  `orders.user_id` nullable without changing existing order ownership.

## Retry safety

Order creation accepts the optional `X-Idempotency-Key` header. Keys are scoped to a shop
and bound to a SHA-256 fingerprint of the effective request. Repeating the same request
returns the original order; reusing the key for different data returns a conflict.
Marketplace checkout persists keys for the current browser session. POS persists keys
for direct retries and its offline queue; the cashier syncer uses the local order ID.

The key is optional for older clients. Therefore duplicate prevention is guaranteed only
for clients that send a stable key. The unique database index and request hash are added
by migration `000087_guest_orders_idempotency`.
