/**
 * Route-segment fallback for /profile/* navigations.
 *
 * The shell (header + sidebar + shared user fetch) lives in layout.tsx and
 * stays mounted across tab switches, so this fallback only covers the
 * content column — a light skeleton, not a full-page shell replica.
 */
export default function Loading() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6" />
      <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}
