import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import AiChatView from './view';

/**
 * «مساعد نمّي الذكي» — كانت شغّالة كنافذة فوق سطح المكتب في Vite،
 * وبتقرا السؤال من الـ query string: /ai-chat?q=...&s=<prompt-id>
 */
export const metadata: Metadata = {
  title: NAMMY_PAGE_META['ai-chat'].ar.title,
  description: NAMMY_PAGE_META['ai-chat'].ar.badge,
  robots: { index: false },
};

export default async function AiChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; s?: string }>;
}) {
  const { q, s } = await searchParams;
  return <AiChatView initialQuery={q} suggestionId={s} />;
}
