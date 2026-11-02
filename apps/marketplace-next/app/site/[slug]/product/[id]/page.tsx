import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle, MessageCircle, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { getProducts } from '@/lib/services';
import { ProductCard } from '@/components/ProductCard';
import { AddToCartButton } from '@/components/AddToCartButton';

export const revalidate = 120;

type Props = { params: Promise<{ slug: string; id: string }> };

async function getWebsite(slug: string) {
  try {
    const result = await api.get<any>(`/shops/${slug}/website`, { revalidate: 120, tags: [`site:${slug}`] });
    return result?.data?.shop ? result.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const site = await getWebsite(slug);
  const products = site ? await getProducts(site.shop.id, 100, 'site') : [];
  const product = products.find((item: any) => String(item.id) === String(id));
  if (!site || !product) return { title: 'المنتج غير موجود', robots: { index: false } };
  return {
    title: `${product.name} | ${site.shop.name}`,
    description: product.description || `تفاصيل ${product.name} من ${site.shop.name}`,
    alternates: { canonical: `/site/${site.shop.slug}/product/${product.id}` },
    openGraph: { title: product.name, description: product.description || site.shop.name, images: product.imageUrl ? [product.imageUrl] : [], locale: 'ar_EG' },
  };
}

export default async function MerchantProductPage({ params }: Props) {
  const { slug, id } = await params;
  const site = await getWebsite(slug);
  if (!site) notFound();
  const products = await getProducts(site.shop.id, 100, 'site');
  const product = products.find((item: any) => String(item.id) === String(id));
  if (!product) notFound();
  const config = site.config || {};
  const theme = config.website?.theme || config.theme || {};
  const colors = theme.colors || {};
  const radius = theme.radius || {};
  const shadow = theme.shadows?.card || '0 10px 30px rgba(15, 23, 42, 0.08)';
  const primary = colors.primary || '#ea580c';
  const related = products.filter((item: any) => String(item.id) !== String(product.id)).slice(0, 4);
  const phone = String(config.website?.contact?.whatsapp || site.shop.phone || '').replace(/\D/g, '');
  const whatsapp = phone ? `https://wa.me/${phone.startsWith('20') ? phone : `20${phone.replace(/^20/, '')}`}?text=${encodeURIComponent(`مرحبًا، أريد الاستفسار عن ${product.name}`)}` : null;
  const logo = site.shop.logoUrl;

  return (
    <main dir="rtl" className="min-h-screen" style={{ backgroundColor: colors.background || '#fff', color: colors.textPrimary || '#111827', fontFamily: theme.typography?.fontBody || 'Cairo, sans-serif',
        '--site-primary': primary,
        '--site-surface': colors.surface || '#f8fafc',
        '--site-radius': radius.lg || '24px',
        '--site-shadow': shadow }}>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <nav className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-500"><Link href={`/site/${site.shop.slug}`}>الرئيسية</Link><ArrowRight className="h-4 w-4" /><span>{product.name}</span></nav>
        <section className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="relative aspect-square overflow-hidden border bg-slate-50" style={{ borderColor: colors.border || '#e2e8f0', borderRadius: radius.lg || '24px', boxShadow: shadow }}>
            <Image src={product.imageUrl || '/placeholder-product.png'} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <Link href={`/site/${site.shop.slug}`} className="mb-5 flex items-center gap-3 font-black" style={{ color: primary }}>{logo ? <Image src={logo} alt={site.shop.name} width={44} height={44} className="h-11 w-11 rounded-xl object-cover" /> : <ShoppingBag className="h-6 w-6" />}{site.shop.name}</Link>
            <h1 className="mb-4 text-3xl font-black md:text-5xl">{product.name}</h1>
            {product.price != null && <p className="mb-6 text-3xl font-black" style={{ color: primary }}>{product.price} {product.currency || 'ج.م'}</p>}
            {product.description && <p className="mb-6 whitespace-pre-wrap text-base font-semibold leading-8 text-slate-600">{product.description}</p>}
            <div className="mb-7 flex items-center gap-2 text-sm font-bold text-emerald-600"><CheckCircle className="h-5 w-5" />{product.isAvailable === false ? 'غير متوفر حالياً' : 'متوفر الآن'}</div>
            <div className="flex flex-wrap gap-3">{product.isAvailable !== false && <AddToCartButton product={product} size="lg" variant="button" showQuantityStepper />}{whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-4 font-black text-white"><MessageCircle className="h-5 w-5" />اطلب عبر واتساب</a>}</div>
          </div>
        </section>
        {related.length > 0 && <section className="mt-16"><h2 className="mb-6 text-2xl font-black">منتجات أخرى من {site.shop.name}</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{related.map((item: any) => <ProductCard key={item.id} product={item} siteSlug={site.shop.slug} />)}</div></section>}
      </div>
    </main>
  );
}
