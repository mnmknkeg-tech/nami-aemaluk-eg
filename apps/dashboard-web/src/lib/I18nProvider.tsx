'use client';

import { useEffect } from 'react';
import '@ray-eg/shared/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // i18n initialized via import above
  }, []);
  return <>{children}</>;
}
