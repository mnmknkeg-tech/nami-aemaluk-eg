import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import HomeView from './view';

/** صفحة تبويب «الرئيسية» (كانت HomePageView داخل النافذة المنبثقة في Vite) */
export const metadata: Metadata = {
  title: NAMMY_PAGE_META.home.ar.title,
  description: NAMMY_PAGE_META.home.ar.badge,
};

export default function NammyTabPage() {
  return <HomeView />;
}
