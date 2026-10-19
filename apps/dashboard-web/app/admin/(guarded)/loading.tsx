export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      {/* هيكل تحميل فاتح يظهر بين التنقلات داخل الأدمن — تنقل فوري بدون وميض أسود */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-3 w-32 rounded bg-slate-100 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-3xl bg-white border border-slate-200 animate-pulse" />
        ))}
      </div>
      <div className="h-96 rounded-3xl bg-white border border-slate-200 animate-pulse" />
    </div>
  );
}
