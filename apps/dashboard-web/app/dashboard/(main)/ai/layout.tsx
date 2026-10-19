import { notFound } from 'next/navigation';

/**
 * AI feature is deferred until the platform is ready.
 * All routes under /dashboard/ai redirect to a clean 404 page.
 * To enable: set NEXT_PUBLIC_AI_ENABLED=true in .env
 */
export default function AILayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== 'true') {
    notFound();
  }
  return <>{children}</>;
}

