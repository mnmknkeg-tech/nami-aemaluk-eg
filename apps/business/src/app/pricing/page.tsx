import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import PricingView from './view';

export const metadata: Metadata = {
  title: NAMMY_PAGE_META.pricing.ar.title,
  description: NAMMY_PAGE_META.pricing.ar.badge,
};

export default function PricingPage() {
  return <PricingView />;
}
