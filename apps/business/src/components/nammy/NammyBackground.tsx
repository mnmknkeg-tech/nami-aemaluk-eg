import Image from 'next/image';

/**
 * خلفية سطح المكتب ثلاثية الأبعاد — منسوخة من App.tsx الأصلي.
 * مسار الصورة كان "/src/assets/images/..." (طريقة Vite)،
 * وفي Next الصور تتقدّم من مجلد public: /nammy/<اسم الصورة>.jpg
 *
 * تغييرات التحويل (تحسين التحميل):
 * - <img> عادية بملف 717KB من غير preload ← <Image priority fill>: Next بيحط
 *   <link rel="preload"> في الـ head وبيقدّم نسخة مضغوطة بمقاس مناسب (sizes=100vw)،
 *   فالصورة دي تبقى LCP بدل ما تأخّر الصفحة.
 * - تدرّج خلف الصورة: لو لسه بتنزل، الشاشة تبان مقصودة مش وميض أبيض.
 */
export function NammyBackground() {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden bg-gradient-to-b from-sky-100 via-indigo-50 to-amber-50">
      <Image
        src="/nammy/nammy_official_background_1790718314782.jpg"
        alt="عالم نمّي التجاري ثلاثي الأبعاد"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center saturate-105"
      />
      {/* Soft atmospheric gradient light */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/30 pointer-events-none" />
    </div>
  );
}

