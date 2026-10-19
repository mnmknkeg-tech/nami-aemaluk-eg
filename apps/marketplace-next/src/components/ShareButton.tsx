'use client';

import { Share2 } from 'lucide-react';
import { siteConfig } from '@/lib/config';

interface ShareButtonProps {
  path: string;
  title: string;
  className?: string;
  iconClassName?: string;
}

export default function ShareButton({ path, title, className, iconClassName }: ShareButtonProps) {
  const shareUrl = `${siteConfig.url}${path}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('تم نسخ الرابط');
      } catch {}
    }
  };

  return (
    <button
      onClick={handleShare}
      className={className}
      aria-label="مشاركة"
    >
      <Share2 className={iconClassName} />
    </button>
  );
}
