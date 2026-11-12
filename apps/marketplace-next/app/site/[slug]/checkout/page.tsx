import type { Metadata } from 'next';
import { api } from '@/lib/api';

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

export { default } from '../../../checkout/page';
