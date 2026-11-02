/**
 * «من مكانك» (Men Makanak) — مفتاح إطلاق تسويق التطبيق.
 *
 * لمّا ييجي الوقت المناسب لنشّر التطبيق للتجار، كل اللي محتاجينه نرفع
 * NEXT_PUBLIC_MEN_MAKANAK_LIVE=true في إعدادات النشر. لحد ما يحصل كده:
 *
 *   - في اللوكل (next dev / build عادي): كل حاجة شغالة وعرضها طبيعي.
 *   - في المنشور (production): تسويق التطبيق (صفحة /men-makanak وأقسام
 *     العرض) مخفي، ما عدا زر «من مكانك» في صفحة الهبوط — ده يفضل ظاهر
 *     لكن بشارة «قريبًا» ومش بيفتح حاجة.
 *
 * نفس اصطلاح باقي الميزات غير المنشورة في المشروع (moduleConfig / sidebar).
 *
 * ملاحظة: NEXT_PUBLIC_ لازم تكون prefix علشان توصل للكود client-side.
 */
const forced = process.env.NEXT_PUBLIC_MEN_MAKANAK_LIVE;

export const MEN_MAKANAK_LIVE =
  forced === 'true' ? true : forced === 'false' ? false : process.env.NODE_ENV !== 'production';
