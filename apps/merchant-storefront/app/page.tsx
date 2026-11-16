export default function MerchantStorefrontIndex() {
  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center p-8 text-center">
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold mb-3">منصة مواقع التجار</h1>
        <p className="text-slate-600 leading-8">كل تاجر له رابط مستقل بالشكل التالي:</p>
        <code dir="ltr" className="inline-block my-3 rounded-lg bg-slate-100 px-3 py-2 text-sm">
          https://nami-aemaluk-eg-fib3.vercel.app/{'{slug}'}
        </code>
        <p className="text-slate-600 leading-8">
          افتح زر «الموقع الرسمي» من صفحة المتجر في من مكانك، أو استخدم الرابط الذي يظهر بعد النشر
          داخل لوحة Nami.
        </p>
      </div>
    </main>
  );
}
