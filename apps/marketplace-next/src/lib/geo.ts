// ── تحديد الموقع: سلسلة محاولات متدرجة ──────────────────────────────────────
//
// المشكلة القديمة: كنا بينادي getCurrentPosition مرة واحدة بإعدادات صارمة:
//   enableHighAccuracy: true + maximumAge: 0 + timeout: 10s
// على أجهزة كتير (خصوصًا داخل المباني في مصر) الإصلاح الدقيق للـ GPS بيفشل،
// والمتصفح بيرجّع POSITION_UNAVAILABLE / TIMEOUT حتى لو الإذن مسموح.
// كمان تصنيف الخطأ كان بالنص الإنجليزي في رسالة الخطأ — وعلى أجهزة تانية
// الرسالة فاضية أو مترجمة، فكان الكود بيقع في الرسالة العامة «تعذر تحديد موقعك».
//
// الحل هنا: تصنيف حسب err.code الرسمي + محاولة GPS دقيقة (بسماح بموضع مخزّن)
// → محاولة بالموقع الشبكي (أقل دقة لكن أنجح بكثير) — والباقي على المستدعي:
// fallback بالـ IP عبر /api/geo أو التحديد اليدوي على الخريطة.

export interface GeoCoords {
  lat: number;
  lng: number;
  /** دقة الموقع بالمتر (لو متاحة) */
  accuracy?: number;
  source: 'gps' | 'network' | 'ip' | 'saved' | 'manual';
  at?: number;
}

export type GeoFailureCode =
  'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout' | 'unknown';

export interface GeoSuccess {
  ok: true;
  coords: GeoCoords;
}

export interface GeoFailure {
  ok: false;
  code: GeoFailureCode;
}

export type GeoResult = GeoSuccess | GeoFailure;

const GEO_STORAGE_KEY = 'nami_geo_last';

/** تصنيف سبب الفشل من err.code الرسمي (الأدق)، مع الرسالة كاحتياط فقط. */
function classifyError(err: unknown): GeoFailureCode {
  const e = err as { code?: number; message?: string } | null | undefined;
  if (e && typeof e.code === 'number') {
    // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
    if (e.code === 1) return 'denied';
    if (e.code === 2) return 'unavailable';
    if (e.code === 3) return 'timeout';
  }
  const msg = String(e?.message || '').toLowerCase();
  if (msg.includes('denied') || msg.includes('permission')) return 'denied';
  if (msg.includes('unavailable') || msg.includes('not available')) return 'unavailable';
  if (msg.includes('timeout')) return 'timeout';
  return 'unknown';
}

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function toCoords(pos: GeolocationPosition, source: 'gps' | 'network'): GeoCoords {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    source,
    at: pos.timestamp || Date.now(),
  };
}

/**
 * تحديد موقع الجهاز بمحاولتين متدرجتين:
 *  1) دقة عالية (GPS) — بيسمح بموضع مخزّن عمره حتى 30 ثانية بدل ما كان
 *     maximumAge: 0 بيجبر إصلاحًا جديدًا كل مرة (أشهر سبب للفشل).
 *  2) لو فشلت بغير «الإذن مرفوض»: محاولة بالموقع الشبكي — أقل دقة لكن
 *     شغالة جوه المباني ومن غير GPS.
 * الإذن المرفوض بنرجعه فورًا لأن إعادة المحاولة هتفشل من غير ما يظهر سؤال.
 */
export async function requestDeviceLocation(): Promise<GeoResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { ok: false, code: 'unsupported' };
  }
  if (
    typeof window !== 'undefined' &&
    !(window as unknown as { isSecureContext?: boolean }).isSecureContext
  ) {
    return { ok: false, code: 'insecure' };
  }

  try {
    const pos = await getPosition({
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 30_000,
    });
    return { ok: true, coords: toCoords(pos, 'gps') };
  } catch (err) {
    const code = classifyError(err);
    if (code === 'denied') return { ok: false, code };

    try {
      const pos = await getPosition({
        enableHighAccuracy: false,
        timeout: 15_000,
        maximumAge: 300_000,
      });
      return { ok: true, coords: toCoords(pos, 'network') };
    } catch (err2) {
      return { ok: false, code: classifyError(err2) };
    }
  }
}

/**
 * موقع تقريبي من عنوان الـ IP عبر /api/geo على نفس النطاق (ترويسات Vercel
 * الجغرافية) — بدون أي خدمة خارجية، لأن خدمات تحديد الـ IP الخارجية كتير
 * منها محجوبة أو بطيئة في مصر. الدقة على مستوى المدينة فقط.
 */
export async function requestApproxLocation(): Promise<GeoResult> {
  try {
    const res = await fetch('/api/geo', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, code: 'unavailable' };
    const data = (await res.json()) as { ok?: boolean; lat?: number; lng?: number };
    if (data?.ok && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
      return {
        ok: true,
        coords: {
          lat: data.lat as number,
          lng: data.lng as number,
          source: 'ip',
          at: Date.now(),
        },
      };
    }
    return { ok: false, code: 'unavailable' };
  } catch {
    return { ok: false, code: 'unavailable' };
  }
}

/** حفظ آخر موقع ناجح — بيسترجع لما المستخدم يرجع تاني، وبيغذي توصيات «القريب مني». */
export function saveLastLocation(coords: GeoCoords): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      GEO_STORAGE_KEY,
      JSON.stringify({ ...coords, at: coords.at || Date.now() })
    );
  } catch {
    /* التخزين ممكن يكون ممتلئ أو محجوب — مش سبب لتعطل الصفحة */
  }
}

export function loadLastLocation(): GeoCoords | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GEO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoCoords;
    if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
      return { ...parsed, source: 'saved' };
    }
    return null;
  } catch {
    return null;
  }
}

/** رسائل خطأ عربية واضحة + إرشاد عملي حسب نوع الفشل الحقيقي. */
export function geoErrorMessage(code: GeoFailureCode): string {
  switch (code) {
    case 'denied':
      return 'إذن الموقع مرفوض — افتح إعدادات الموقع من القفل 🔒 جنب الرابط واسمح بالوصول، أو حدّد موقعك يدويًا';
    case 'unavailable':
      return 'خدمة الموقع غير متاحة على الجهاز — تأكد أن «الموقع/GPS» مفتوح في إعدادات الهاتف، أو حدّد موقعك يدويًا';
    case 'timeout':
      return 'انتهت مهلة تحديد الموقع — حاول مرة أخرى أو حدّد موقعك يدويًا';
    case 'insecure':
      return 'تحديد الموقع يتطلب اتصالًا آمنًا (HTTPS)';
    case 'unsupported':
      return 'المتصفح لا يدعم تحديد الموقع — حدّد موقعك يدويًا على الخريطة';
    default:
      return 'تعذّر تحديد موقعك تلقائيًا — حدّد موقعك يدويًا على الخريطة';
  }
}

/**
 * بيكتشف إن الصفحة مفتوحة جوه متصفح مدمج في تطبيق تواصل (واتساب/فيسبوك/
 * انستجرام...) — أشهر سبب لفشل تحديد الموقع «رغم إعطاء الإذن» لأن دول
 * بيشيلوا دعم Geolocation أو بيمنعوا سؤال الإذن أصلًا.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /whatsapp/i.test(ua) ||
    /fban|fbav|fbios|fb4a/i.test(ua) ||
    /instagram/i.test(ua) ||
    /messenger/i.test(ua) ||
    /snapchat/i.test(ua) ||
    /tiktok/i.test(ua) ||
    /twitter/i.test(ua) ||
    /line\//i.test(ua)
  );
}
