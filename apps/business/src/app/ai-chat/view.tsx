'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { AiResponseWorkspace } from '@/components/nammy/AiResponseWorkspace';
import { PROMPT_SUGGESTIONS } from '@/nammy/landingData';

/**
 * نفس AiResponseWorkspace الأصلي بالضبط (نفس الردود الجاهزة من landingData).
 * ملاحظة: الردود في المصدَر كانت محاكاة (setTimeout) — احتفظنا بنفس السلوك،
 * وربطها الفعلية بـ gobackend خطوة مستقلة لو طلبتها.
 */
export default function AiChatView({
  initialQuery,
  suggestionId,
}: {
  initialQuery?: string;
  suggestionId?: string;
}) {
  const suggestion = suggestionId ? PROMPT_SUGGESTIONS.find((s) => s.id === suggestionId) ?? null : null;

  return (
    <NammyPageClient>
      {({ lang, openSignup }) => (
        <AiResponseWorkspace
          initialQuery={initialQuery?.trim() || 'حلل مبيعاتي'}
          initialSuggestion={suggestion}
          lang={lang}
          onOpenDemo={openSignup}
        />
      )}
    </NammyPageClient>
  );
}
