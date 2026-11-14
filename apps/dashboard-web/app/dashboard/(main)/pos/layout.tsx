'use client';

import { useModuleGuard } from '@/hooks/useModuleGuard';

/**
 * POS module guard — mirrors the bookings pattern: while the shop config is
 * loading show a spinner; when the merchant disabled the POS module on the
 * settings board, don't render the register (nav already hides the section).
 * Never redirects and never 404s — POS is a published, board-controlled module.
 */
export default function PosLayout({ children }: { children: React.ReactNode }) {
  const { allowed } = useModuleGuard('pos');

  if (allowed === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-lime-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (allowed === false) {
    return null;
  }

  return <>{children}</>;
}
