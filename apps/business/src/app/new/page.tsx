import type { Metadata } from 'next';
import { GrowthPage } from './GrowthPage';
import { HIDE_UNPUBLISHED } from '@/lib/moduleConfig';
import './growth.css';

export const metadata: Metadata = {
  title: 'نمي أعمالك | كل ما تحتاجه في مكان واحد',
  // Market-launch switch: the AI assistant is local-only, so the pitch never
  // mentions it in production builds.
  description: HIDE_UNPUBLISHED
    ? 'منصة متكاملة لإدارة وتنمية أعمالك بسهولة، من المتجر والدفع إلى الشحن والتوصيل.'
    : 'منصة متكاملة لإدارة وتنمية أعمالك بسهولة، من المتجر والدفع إلى الشحن والذكاء الاصطناعي.',
};

export default function NewPage() {
  return <GrowthPage />;
}