'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';

interface BreachNoticeProps {
  breachUrl?: string;
}

export default function BreachNotice({ breachUrl }: BreachNoticeProps) {
  const [active, setActive] = useState(false);
  const [url, setUrl] = useState(breachUrl || '');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check for X-Breach-Notice header via a lightweight meta tag or API call
    // Since headers are not accessible client-side, we use a meta tag approach
    // or a dedicated endpoint. Here we check a meta tag set by the server.
    const meta = document.querySelector('meta[name="x-breach-notice"]');
    if (meta) {
      const content = meta.getAttribute('content');
      if (content && content !== 'none' && content !== 'inactive') {
        setActive(true);
        setUrl(content);
      }
    }

    // Also check via API for runtime breach notices
    fetch('/api/v1/breach-status', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.active) {
          setActive(true);
          if (data.url) setUrl(data.url);
        }
      })
      .catch(() => {});
  }, []);

  if (!active || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-red-600 border-b border-red-700" dir="rtl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-white shrink-0" />
            <p className="text-white text-sm font-bold">
              تنبيه أمني: تم رصد اختراق محتمل لبياناتك الشخصية. يرجى الاطلاع على التفاصيل.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-4 py-1.5 bg-white text-red-600 font-bold rounded-lg text-sm hover:bg-red-50 transition-all"
              >
                التفاصيل
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1 text-white/70 hover:text-white transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
