'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { writeToken, writeUserJSON } from '@/lib/session-keys';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const userRaw = params.get('user');

      if (token) {
        writeToken(token);
      }

      if (userRaw) {
        try {
          const user = JSON.parse(userRaw);
          writeUserJSON(JSON.stringify(user));
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    // Redirect to dashboard
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
        <p className="text-slate-500 font-bold text-sm">جاري تسجيل دخولك...</p>
      </div>
    </div>
  );
}
