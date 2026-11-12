import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock, Clock, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { SiteBookingFlow, type PublicBookingService } from '@/components/SiteBookingFlow';
import { readShopBookingConfig } from '@ray-eg/shared/booking';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * /site/[slug]/book — صفحة الحجز العامة للموقع المنشور.
 *
 * بتجيب الخدمات القابلة للحجز والمواعيد المتاحة فعلاً من الباك إند
 * (GET /bookings/public/services) بتوقيت القاهرة — أول مسار حجز حقيقي
 * للزائر على الموقع، بدون مودال وبدون نص حر.
 */

type PublicWebsite = {
  published: boolean;
  shop: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    phone?: string;
    address?: string;
  };
  config: Record<string, any>;
};

interface PublicServicesPayload {
  shopId: string;
  shopName: string;
  services: PublicBookingService[];
  settings: {
    workStart: string;
    workEnd: string;
    slotDuration: number;
    advanceDays: number;
  };
}

async function getWebsite(slug: string): Promise<PublicWebsite | null> {
  try {
    const data = await api.get<any>(`/shops/${slug}/website`, { revalidate: 0 });
    if (data?.data?.shop) return data.data;
  } catch {
    // API offline or unknown slug — render an honest 404, never a fake shop.
  }
  return null;
}

async function getPublicServices(slug: string): Promise<PublicServicesPayload | null> {
  try {
    const data = await api.get<any>(`/bookings/public/services?slug=${encodeURIComponent(slug)}`, {
      revalidate: 0,
      tags: [`booking-services:${slug}`],
    });
    if (data?.data?.shopId) return data.data;
  } catch {
    // No published bookable services yet — the page still renders with an
    // honest empty state and a WhatsApp fallback.
  }
  return null;
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [site, services] = await Promise.all([getWebsite(slug), getPublicServices(slug)]);
  const name = site?.shop.name || services?.shopName;
  if (!name) return { title: 'صفحة الحجز', robots: { index: false } };
  return {
    title: `احجز موعدك — ${name}`,
    description: `احجز موعدك في ${name} مباشرة من المواعيد المتاحة.`,
    alternates: { canonical: `/site/${slug}/book` },
  };
}

export default async function SiteBookingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { service } = await searchParams;
  const site = await getWebsite(slug);
  if (!site) notFound();

  const services = await getPublicServices(slug);
  // إعدادات الحجز بالانتظار + الأطباء من layoutConfig المتجر
  const queueCfg = readShopBookingConfig(site.shop);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
        <Link
          href={`/site/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          رجوع إلى {site.shop.name}
        </Link>

        <header className="mt-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-brand-cyan/10 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5 text-brand-cyan" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">احجز موعدك</h1>
              <p className="text-sm font-semibold text-slate-500">{site.shop.name}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
            {services?.settings?.workStart && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                استقبال المواعيد {services.settings.workStart}–{services.settings.workEnd}
              </span>
            )}
            {site.shop.address && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {site.shop.address}
              </span>
            )}
          </div>
        </header>

        <SiteBookingFlow
          slug={slug}
          shopId={services?.shopId ?? site.shop.id}
          shopName={site.shop.name}
          shopPhone={site.shop.phone}
          services={services?.services ?? []}
          settings={
            services?.settings ?? {
              workStart: '09:00',
              workEnd: '21:00',
              slotDuration: 30,
              advanceDays: 14,
            }
          }
          initialServiceId={service}
          queueConfig={
            queueCfg.queueEnabled
              ? {
                  queueEnabled: true,
                  queueNotifyMinutes: queueCfg.queueNotifyMinutes,
                  avgServiceMinutes: queueCfg.avgServiceMinutes,
                  doctors: queueCfg.doctors,
                }
              : undefined
          }
        />
      </main>
    </div>
  );
}
