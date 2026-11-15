import type { Metadata } from 'next';
import { api } from '@/lib/api';
import SiteCheckout from '@/merchant-site/checkout/SiteCheckout';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const response = await api.get<any>(`/shops/${slug}/website`, { revalidate: 0 });
    const shop = response?.data?.shop;
    if (shop) {
      const title = shop.name || 'إتمام الطلب';
      return {
        title: { absolute: title },
        description: `إتمام طلبك من ${title}`,
        icons: shop.logoUrl
          ? { icon: shop.logoUrl, shortcut: shop.logoUrl, apple: shop.logoUrl }
          : undefined,
      };
    }
  } catch {}
  return { title: { absolute: 'إتمام الطلب' } };
}

/**
 * The merchant site's OWN checkout — a dedicated component, NOT a re-export
 * of the marketplace /checkout page. Guest checkout is allowed, the cart
 * source is the per-merchant site cart, and no marketplace chrome or state
 * participates. See src/merchant-site/checkout/SiteCheckout.tsx for the
 * scope rules.
 */
export default function MerchantSiteCheckoutPage() {
  return <SiteCheckout />;
}
