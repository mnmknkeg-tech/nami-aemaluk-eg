import { SiteCartProvider } from '@/lib/site-cart';

export default async function MerchantStorefrontLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SiteCartProvider slug={slug}>{children}</SiteCartProvider>;
}