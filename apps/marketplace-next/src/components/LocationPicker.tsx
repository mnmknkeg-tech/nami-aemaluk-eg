'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Locate, Loader2, Check, AlertCircle } from 'lucide-react';
import { guessGovernorate } from '@/lib/eg-geo';
import { requestDeviceLocation, saveLastLocation, geoErrorMessage } from '@/lib/geo';

interface ResolvedAddress {
  city?: string;
  district?: string;
  governorate?: string;
  fullAddress?: string;
  /** من أين جه الاسم — للتلميح في الواجهة */
  source: 'nominatim' | 'offline';
}

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onAddressResolved?: (address: ResolvedAddress) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

/** Nominatim reverse geocode — بمهلة قصيرة عشان متعلّقش الواجهة. */
async function reverseGeocode(lat: number, lng: number): Promise<ResolvedAddress | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar&addressdetails=1`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.address) return null;
    const addr = data.address;
    const city = addr.city || addr.town || addr.village || addr.state || addr.county || '';
    const district = addr.suburb || addr.neighbourhood || addr.district || addr.road || '';
    return {
      city,
      district,
      governorate: addr.state || addr.region || '',
      fullAddress: data.display_name || '',
      source: 'nominatim',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * تحديد موقع على الخريطة — باليد (ضغطة على الخريطة) أو تلقائي (GPS).
 *
 * العنوان بيتحل دايمًا: أولاً Nominatim، ولو فشل بتخمين المحافظة من
 * الإحداثيات محليًا — فمفيش حالة بتعطل الحفظ بخطأ "المحافظة والمدينة مطلوبتان".
 */
export function LocationPicker({
  onLocationSelect,
  onAddressResolved,
  initialCoords,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialCoords || null
  );
  const [error, setError] = useState('');
  const [resolveHint, setResolveHint] = useState('');

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await import('leaflet/dist/leaflet.css');
        const L = (await import('leaflet')).default;
        if (cancelled) return;
        leafletRef.current = L;

        const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
        const markerIcon2x = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
        const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

        const defaultIcon = L.icon({
          iconUrl: markerIcon,
          iconRetinaUrl: markerIcon2x,
          shadowUrl: markerShadow,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          shadowSize: [41, 41],
        });
        L.Marker.prototype.options.icon = defaultIcon;

        if (!mapRef.current && containerRef.current) {
          const startLat = initialCoords?.lat || 30.0444;
          const startLng = initialCoords?.lng || 31.2357;
          mapRef.current = L.map(containerRef.current, {
            zoomControl: true,
            attributionControl: false,
          }).setView([startLat, startLng], 14);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(mapRef.current);

          if (initialCoords) {
            markerRef.current = L.marker([startLat, startLng]).addTo(mapRef.current);
          }

          mapRef.current.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            placeMarker(lat, lng);
          });
        }
      } catch (err) {
        console.error('Leaflet load error:', err);
        setError('فشل تحميل الخريطة — جرّب تحديث الصفحة أو اكتب العنوان يدويًا');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** يحل العنوان من الإحداثيات مع fallback محلي مضمون. */
  const resolveAddress = async (lat: number, lng: number) => {
    if (!onAddressResolved) return;
    setResolving(true);
    setResolveHint('');
    // 1) تخمين محلي فوري (يعمل دايمًا) — المحافظة على الأقل تتعبأ من أول لحظة
    const offline = guessGovernorate(lat, lng);
    if (offline) {
      onAddressResolved({
        city: offline.city,
        governorate: offline.governorate,
        source: 'offline',
      });
    }
    // 2) محاولة تحسين الاسم من Nominatim (شارع/حي/مدينة أدق)
    const resolved = await reverseGeocode(lat, lng);
    setResolving(false);
    if (resolved) {
      onAddressResolved(resolved);
      setResolveHint(
        resolved.district || resolved.city ? 'تم تعبئة العنوان تلقائيًا من الموقع ✅' : ''
      );
    } else if (offline) {
      setResolveHint('تم تعبئة المحافظة من الموقع — أكمل اسم المدينة/الشارع يدويًا');
    } else {
      setResolveHint('اكتب المحافظة والمدينة يدويًا لإنهاء العنوان');
    }
  };

  const placeMarker = (lat: number, lng: number) => {
    const L = leafletRef.current;
    if (!L || !mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
    }
    setSelected({ lat, lng });
    setError('');
    onLocationSelect(lat, lng);
    resolveAddress(lat, lng);
  };

  // ── التحديد التلقائي: سلّم متدرج (GPS دقيق → موقع شبكي) من lib/geo ──
  // النسخة القديمة كانت محاولة واحدة enableHighAccuracy + maximumAge:0 +
  // مهلة 10 ثواني — ودي أشهر سبب لفشل التحديد رغم إذن مفتوح، خصوصًا داخل
  // المباني. الضغط على الخريطة اليدوي موجود كـ fallback دائم.
  const handleLocate = async () => {
    setLocating(true);
    setError('');
    try {
      const result = await requestDeviceLocation();
      if (result.ok) {
        const { lat, lng } = result.coords;
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 16);
        }
        placeMarker(lat, lng);
        saveLastLocation(result.coords);
        return;
      }
      setError(geoErrorMessage(result.code || 'unknown'));
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-500">موقعك على الخريطة (اختياري)</label>
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating || loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-cyan/10 text-brand-cyan text-xs font-bold hover:bg-brand-cyan/20 transition-colors disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Locate className="w-3.5 h-3.5" />
          )}
          {locating ? 'جاري التحديد...' : 'حدد موقعي تلقائياً'}
        </button>
      </div>

      <div
        className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
        style={{ height: '280px' }}
      >
        {loading && (
          <div
            className="absolute inset-0 z-10 bg-slate-100 dark:bg-slate-800 animate-pulse"
            aria-hidden
          />
        )}
        <div ref={containerRef} className="w-full h-full" />
        {/* تلميح ثابت فوق الخريطة */}
        {!selected && !loading && (
          <div className="absolute top-2 inset-x-2 z-[500] pointer-events-none">
            <p className="mx-auto w-fit px-3 py-1.5 rounded-full bg-white/95 shadow text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-cyan" />
              اضغط على الخريطة في مكان موقعك — أو استخدم زر التحديد التلقائي
            </p>
          </div>
        )}
        {resolving && (
          <div className="absolute bottom-2 inset-x-2 z-[500] pointer-events-none">
            <p className="mx-auto w-fit px-3 py-1.5 rounded-full bg-white/95 shadow text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-cyan" />
              جاري تعبئة العنوان تلقائيًا...
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      {selected && (
        <div className="flex items-center gap-2 text-xs font-bold text-green-600 flex-wrap">
          <Check className="w-4 h-4" />
          تم تحديد الموقع:{' '}
          <span dir="ltr">
            {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
          </span>
          {resolveHint && <span className="text-slate-400 font-semibold">— {resolveHint}</span>}
        </div>
      )}
    </div>
  );
}
