export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-44 bg-slate-200/70 rounded-lg animate-pulse" />
          <div className="h-3.5 w-64 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-slate-200/70 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="h-3.5 w-20 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-7 w-28 bg-slate-200/70 rounded-lg animate-pulse" />
            <div className="h-3 w-16 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    </div>
  );
}
