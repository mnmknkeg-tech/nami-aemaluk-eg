import { TrackBookingClient } from '@/components/TrackBookingClient';
import { getPublishedSitePath } from '@ray-eg/shared/merchant/siteUrls';

export default async function MerchantBookingTrackingPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TrackBookingClient homeHref={getPublishedSitePath(slug)} homeLabel="العودة للمتجر" />;
}
