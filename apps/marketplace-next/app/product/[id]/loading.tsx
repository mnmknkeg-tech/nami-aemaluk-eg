export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-brand-black">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-4xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-2/3" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
