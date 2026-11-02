import type { Metadata, Viewport } from 'next';
import { NammyDesktop } from '@/components/nammy/NammyDesktop';
import ConsentBanner from '@ray-eg/shared/components/common/ConsentBanner';
import { MEN_MAKANAK_LIVE } from '@/nammy/menMakanak';

/**
 * صفحة الهبوط الجديدة — «نمّي أعمالك» (متصفح الأعمال الذكي).
 * بديلة صفحة الهبوط القديمة اللي اتنقلت لـ '/legacy'.
 * اللوجو والاسم هيتضافوا في DesktopHeader لما ملف اللوجو الجديد يوصل.
 */
export const metadata: Metadata = {
  title: 'نمّي أعمالك — متصفح الأعمال الذكي',
  description: MEN_MAKANAK_LIVE
    ? 'قول لنمّي عايز تعمل إيه في تجارتك: كاشير سحابي، مخزون، فواتير ضريبية، متجر إلكتروني، وتطبيق من مكانك — في منظومة واحدة.'
    : 'قول لنمّي عايز تعمل إيه في تجارتك: كاشير سحابي، مخزون، فواتير ضريبية، ومتجر إلكتروني — في منظومة واحدة.',
};

export const viewport: Viewport = {
  themeColor: '#F8F9FD',
};

export default function NammyHomePage() {
  return (
    <>
      <NammyDesktop />
      {/* بانر الكوكيز كان في الصفحة الرئيسية القديمة — احتفظنا بيه في الجديدة */}
      <ConsentBanner />
    </>
  );
}
