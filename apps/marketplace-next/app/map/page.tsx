'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Store, Briefcase, Hand } from 'lucide-react';
import { apiPath } from '@/lib/api';
import { buildShopMarkerHtml, buildListingMarkerHtml, escapeHtml } from '@/lib/mapUtils';
import {
  requestDeviceLocation,
  requestApproxLocation,
  saveLastLocation,
  loadLastLocation,
  geoErrorMessage,
  isInAppBrowser,
} from '@/lib/geo';

interface MapPinItem {
  id?: string;
  slug?: string;
  type: string;
  title?: string;
  addressLabel?: string;
  city?: string;
  latitude: number;
  longitude: number;
}

interface Coords {
  lat: number;
  lng: number;
}

// ثيم صفحة الخريطة مطابق للوحة التحكم: أبيض/سليت مع لمسة السماوي #00e5ff
const DASHBOARD_CYAN = '#00e5ff';
const DASHBOARD_DARK = '#0f172a';

export default function MapPage() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [pins, setPins] = useState<MapPinItem[]>([]);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  // ملاحظة إرشادية (مش خطأ): موقع تقريبي / آخر موقع محفوظ
  const [locationNote, setLocationNote] = useState('');
  // وضع التحديد اليدوي: المستخدم بيضغط على الخريطة يحط موقعه بنفسه —
  // بيشتغل دايمًا حتى لو الـ GPS فشل تمامًا.
  const [manualMode, setManualMode] = useState(false);
  const manualModeRef = useRef(false);
  // منع التحريك الطائر لما الموقع جاي من ضغطة المستخدم نفسه على الخريطة.
  const skipFlyRef = useRef(false);
  // مستخدم داخل متصفح مدمج (واتساب/فيسبوك...) — لازم نحسبها بعد التحميل
  // عشان ما يحصلش تعارض hydration.
  const [inApp, setInApp] = useState(false);
  // Leaflet is imported asynchronously. The pins effect bails out when the map
  // is not ready yet, and `pins` never changes again — so without this flag the
  // markers would silently never be drawn. Bump it once the map is live.
  const [mapReady, setMapReady] = useState(false);

  // الخريطة تعرض جميع المواقع الموجودة فعليًا — بدون أي تصفية نطاق/مسافة.
  const loadPins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiPath('/map/pins'));
      if (res.ok) {
        const data = await res.json();
        setPins(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
      } else {
        setPins([]);
      }
    } catch {
      setPins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // آخر موقع معروف + بيئة التصفح — بعد التحميل على العميل فقط.
  useEffect(() => {
    setInApp(isInAppBrowser());
    const saved = loadLastLocation();
    if (saved) {
      setCoords({ lat: saved.lat, lng: saved.lng });
      setLocationNote('يُعرض آخر موقع معروف لك — اضغط «حدد موقعي» للتحديث');
    }
  }, []);

  useEffect(() => {
    loadPins();
    // تحديث دوري خفيف — كل الداتا بتنزل مرة واحدة مش ضمن نطاق
    const timer = setInterval(() => {
      if (!document.hidden) loadPins();
    }, 60000);
    const onVisible = () => {
      if (!document.hidden) loadPins();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadPins]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await import('leaflet/dist/leaflet.css');
        const L = (await import('leaflet')).default;
        if (cancelled) return;
        leafletRef.current = L;

        const mapEl = mapContainerRef.current;
        if (!mapEl) return;

        if (!mapRef.current) {
          mapRef.current = L.map(mapEl, {
            zoomControl: true,
            attributionControl: true,
          }).setView([30.0444, 31.2357], 7);

          // بلاطات OpenStreetMap القياسية: مجانية وبتعرض أسماء المواقع
          // بالعربي (labels) من غير ما تحتاج API key.
          // ملاحظة: روابط CARTO (basemaps.cartocdn.com) بقت بترجع بلاطة
          // "API KEY REQUIRED" مدمجة، فبقت الخريطة مش مفهومة.
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapRef.current);

          markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

          // التحديد اليدوي: لما الوضع شغال، أي ضغطة على الخريطة بتحدد موقع
          // المستخدم (بتستخدم ref عشان الهاندلر ميمسكش نسخة قديمة من الحالة).
          mapRef.current.on('click', (e: any) => {
            if (!manualModeRef.current) return;
            manualModeRef.current = false;
            setManualMode(false);
            const { lat, lng } = e.latlng;
            saveLastLocation({ lat, lng, source: 'manual', at: Date.now() });
            skipFlyRef.current = true;
            setCoords({ lat, lng });
            setLocationError('');
            setLocationNote('تم تحديد موقعك يدويًا');
          });
        }
        // Let the pins effect know the map now exists, even if the pins
        // already arrived while Leaflet was still loading.
        setMapReady(true);
        // The container may have been measured before layout settled.
        setTimeout(() => mapRef.current?.invalidateSize?.(), 0);
      } catch (err) {
        console.error('Leaflet load error:', err);
      }
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    markersLayerRef.current.clearLayers();

    for (const p of pins) {
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') continue;

      const isShop = p.type === 'shop';
      const label = String(p.title ?? '').trim();
      const city = String(p.addressLabel ?? p.city ?? '').trim();

      const html = isShop
        ? buildShopMarkerHtml(escapeHtml(label), escapeHtml(city))
        : buildListingMarkerHtml(escapeHtml(label), escapeHtml(city));

      const marker = L.marker([p.latitude, p.longitude], {
        icon: L.divIcon({
          className: '',
          iconSize: isShop ? [250, 62] : [250, 56],
          iconAnchor: isShop ? [125, 62] : [125, 56],
          html,
        }),
      });

      marker.on('click', () => {
        if (isShop && p.slug) {
          // من الخريطة الموقع يفتح بشكلِه الأصلي (ثيم موقع التاجر) — جوّه
          // التطبيق المتاجر بتظهر بالثيم الموحد عبر /shop/[slug] العادي.
          router.push(`/shop/${p.slug}?view=site`);
        } else if (!isShop && p.id) {
          router.push(`/map/listing/${p.id}`);
        }
      });

      marker.addTo(markersLayerRef.current);
    }
  }, [pins, router, mapReady]);

  // لما الوضع اليدوي بيتفعّل بنخلي الخريطة جاهزة للضغط — وده بنعمله
  // بمزامنة الـ ref مع الحالة بعد كل رندر (نمط latest-ref القياسي).
  useEffect(() => {
    manualModeRef.current = manualMode;
  }, [manualMode]);

  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !coords) return;
    const L = leafletRef.current;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([coords.lat, coords.lng], {
        icon: L.divIcon({
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html: `<div style="width:18px;height:18px;border-radius:999px;background:${DASHBOARD_CYAN};border:3px solid ${DASHBOARD_DARK};box-shadow:0 0 0 4px rgba(0,229,255,0.25);"></div>`,
        }),
      });
      userMarkerRef.current.addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng([coords.lat, coords.lng]);
    }

    try {
      if (skipFlyRef.current) {
        skipFlyRef.current = false;
      } else {
        const zoom = Math.max(14, Number(mapRef.current?.getZoom?.() ?? 0));
        mapRef.current?.flyTo?.([coords.lat, coords.lng], zoom, { animate: true, duration: 0.7 });
      }
      setTimeout(() => {
        mapRef.current?.invalidateSize?.();
      }, 0);
    } catch {}
  }, [coords]);

  const handleLocateMe = async () => {
    setLocationError('');
    setLocationNote('');
    setManualMode(false);
    manualModeRef.current = false;
    setLocating(true);
    try {
      // 1) الجهاز: GPS دقيق → موقع شبكي (المحاولة الثانية جوه requestDeviceLocation)
      const result = await requestDeviceLocation();
      if (result.ok) {
        setCoords({ lat: result.coords.lat, lng: result.coords.lng });
        saveLastLocation(result.coords);
        setLocationNote(result.coords.source === 'network' ? 'تم التحديد بموقع شبكي تقريبي' : '');
        return;
      }

      // 2) الإذن مرفوض — محاولة تانية هتفشل فورًا، منجربش الـ IP ونقول السبب على طول
      if (result.code === 'denied') {
        setLocationError(geoErrorMessage('denied'));
        return;
      }

      // 3) الجهاز فشل بغير الإذن — موقع تقريبي من الـ IP (نفس النطاق) بدل رسالة خطأ
      const approx = await requestApproxLocation();
      if (approx.ok) {
        setCoords({ lat: approx.coords.lat, lng: approx.coords.lng });
        setLocationNote(
          'موقع تقريبي حسب شبكة الإنترنت (على مستوى المدينة) — للدقة استخدم «تحديد يدوي»'
        );
        return;
      }

      // 4) ولا طريقة اشتغلت — رسالة سبب حقيقية + إرشاد للتحديد اليدوي
      setLocationError(geoErrorMessage(result.code || 'unknown'));
    } finally {
      setLocating(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-white"
      dir="rtl"
      style={{ color: DASHBOARD_DARK, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* شريط علوي بنفس هيكل الهيدر في اللوحة */}
      <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-[2500]">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center">
            <MapPin size={16} style={{ color: DASHBOARD_CYAN }} />
          </span>
          <h1 className="text-sm font-black text-slate-900">الخريطة — جميع المواقع</h1>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-200 transition-all"
        >
          العودة
        </button>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <div className="w-full h-[70vh] md:h-[74vh]">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          <div className="absolute top-4 right-4 left-4 md:left-auto md:w-[360px] z-[1000] pointer-events-auto">
            <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5 space-y-3 pointer-events-auto relative shadow-sm">
              {locationError && (
                <p className="text-red-500 text-xs font-bold text-center leading-relaxed">
                  {locationError}
                </p>
              )}
              {locationNote && (
                <p className="text-amber-600 text-[11px] font-bold text-center leading-relaxed">
                  {locationNote}
                </p>
              )}

              <button
                onClick={handleLocateMe}
                disabled={locating}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-slate-800 transition-all"
                style={{ touchAction: 'manipulation' }}
              >
                {locating ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" /> جاري تحديد موقعك…
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" style={{ color: DASHBOARD_CYAN }} /> حدد موقعي
                  </>
                )}
              </button>

              {/* التحديد اليدوي — بيشتغل دايمًا حتى لو الـ GPS فشل تمامًا */}
              <button
                onClick={() => {
                  setLocationError('');
                  setManualMode((v) => !v);
                }}
                disabled={locating}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all disabled:opacity-50 ${
                  manualMode
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <Hand
                  className="w-4 h-4"
                  style={!manualMode ? { color: DASHBOARD_CYAN } : undefined}
                />
                {manualMode ? 'اضغط على الخريطة لتحديد موقعك…' : 'تحديد يدوي على الخريطة'}
              </button>

              {/* المتصفح المدمج في تطبيقات التواصل بيبوّظ تحديد الموقع رغم الإذن */}
              {inApp && (
                <p className="text-[11px] font-bold text-amber-600 text-center leading-relaxed">
                  بتفتح الموقع من داخل تطبيق آخر — لو «حدد موقعي» مش شغال، افتح الرابط في متصفح
                  الهاتف (Chrome / Safari)
                </p>
              )}

              {/* مفتاح الخريطة */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <span
                    className="w-3 h-3 rounded-full inline-flex items-center justify-center"
                    style={{ background: DASHBOARD_DARK }}
                  >
                    <Store size={8} color={DASHBOARD_CYAN} />
                  </span>
                  متجر
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <span
                    className="w-3 h-3 rounded-full inline-flex items-center justify-center border"
                    style={{ background: '#ffffff', borderColor: DASHBOARD_CYAN }}
                  >
                    <Briefcase size={8} color={DASHBOARD_DARK} />
                  </span>
                  نشاط
                </span>
                <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                  {loading ? (
                    <span className="inline-block w-16 h-3 rounded bg-slate-100 animate-pulse" />
                  ) : (
                    `${pins.length} موقع`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
