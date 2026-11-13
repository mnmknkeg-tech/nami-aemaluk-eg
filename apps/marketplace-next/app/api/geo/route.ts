import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * موقع تقريبي من عنوان الـ IP باستخدام الترويسات الجغرافية اللي Vercel
 * بيضيفها لكل طلب (x-vercel-ip-latitude / longitude / city) — من نفس النطاق
 * بدون أي خدمة خارجية. مهم كـ fallback لأن كتير من خدمات الـ IP الخارجية
 * محجوبة أو بطيئة في مصر، وده بيمنع أي رسالة خطأ إضافية.
 * محليًا (خارج Vercel) الترويسات مش موجودة → بنرجّع ok:false بأمان.
 */
export async function GET(request: Request) {
  const h = request.headers;

  const parseCoord = (name: string): number | null => {
    const raw = h.get(name);
    if (!raw) return null;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  };

  const lat = parseCoord('x-vercel-ip-latitude');
  const lng = parseCoord('x-vercel-ip-longitude');
  const city = h.get('x-vercel-ip-city') || '';
  const region = h.get('x-vercel-ip-country-region') || '';
  const country = h.get('x-vercel-ip-country') || '';

  if (lat === null || lng === null) {
    return NextResponse.json({ ok: false }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(
    { ok: true, lat, lng, city, region, country, source: 'ip' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
