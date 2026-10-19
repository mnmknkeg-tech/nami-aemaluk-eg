'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Locate, Loader2, Check, AlertCircle } from 'lucide-react';

export interface ResolvedShopLocation {
  lat: number;
  lng: number;
  governorate: string;
  city: string;
  street: string;
}

interface ShopLocationPickerProps {
  onResolve: (location: ResolvedShopLocation) => void;
}

/**
 * Map picker for shop registration: the merchant taps his shop on the map
 * (or uses geolocation) and the selection is reverse-geocoded into the
 * manual governorate/city/street fields automatically.
 */
export function ShopLocationPicker({ onResolve }: ShopLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const resolveRef = useRef(onResolve);
  resolveRef.current = onResolve;

  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [selected, setSelected] = useState<ResolvedShopLocation | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await import('leaflet/dist/leaflet.css');
        const L = (await import('leaflet')).default;
        if (cancelled) return;
        leafletRef.current = L;

        // Bundled leaflet ships its marker images relative to the CSS, which
        // bundlers rewrite — pin them to the CDN copies instead.
        const defaultIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          shadowSize: [41, 41],
        });
        L.Marker.prototype.options.icon = defaultIcon;

        if (!mapRef.current && containerRef.current) {
          mapRef.current = L.map(containerRef.current, {
            zoomControl: true,
            attributionControl: false,
          }).setView([30.0444, 31.2357], 11); // Cairo

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(mapRef.current);

          mapRef.current.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            placeMarker(lat, lng);
          });
        }
      } catch (err) {
        console.error('Leaflet load error:', err);
        setError('فشل تحميل الخريطة — جرّب تكمّل البيانات يدوي');
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
     
  }, []);

  const placeMarker = (lat: number, lng: number) => {
    const L = leafletRef.current;
    if (!L || !mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
    }

    setGeocoding(true);
    setError('');
    // Nominatim reverse geocode — note the `lon` param (not `lng`).
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const addr = data?.address || {};
        const governorate = addr.state || addr.county || '';
        const city =
          addr.city || addr.town || addr.village || addr.municipality || addr.suburb || '';
        const street = [addr.road, addr.house_number].filter(Boolean).join(' ');
        const resolved: ResolvedShopLocation = { lat, lng, governorate, city, street };
        setSelected(resolved);
        resolveRef.current(resolved);
      })
      .catch(() => {
        const resolved: ResolvedShopLocation = { lat, lng, governorate: '', city: '', street: '' };
        setSelected(resolved);
        resolveRef.current(resolved);
        setError('تم تحديد الموقع بس تعبي المحافظة والمدينة يدوي');
      })
      .finally(() => setGeocoding(false));
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 16);
        placeMarker(latitude, longitude);
        setLocating(false);
      },
      () => {
        setError('فشل تحديد موقعك — اسمح بالوصول للموقع أو اضغط على الخريطة');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-black text-slate-600">
          <MapPin className="w-4 h-4 text-[#00E5FF]" />
          موقع المتجر على الخريطة
        </label>
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating || loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-black hover:bg-black transition-colors disabled:opacity-60"
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
        className="relative rounded-2xl overflow-hidden border-2 border-slate-100"
        style={{ height: '260px' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
            <Loader2 className="w-7 h-7 text-slate-300 animate-spin" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {geocoding && (
        <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          جاري تحويل الموقع لعنوان...
        </p>
      )}

      {!geocoding && selected && (
        <div className="flex items-start gap-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2.5">
          <Check className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={3} />
          <span>
            تم تحديد الموقع{selected.governorate ? ` — ${selected.governorate}` : ''}
            {selected.city ? `، ${selected.city}` : ''}
            {selected.street ? `، ${selected.street}` : ''} — واتملّت تلقائياً في الحقول تحت، عدّلها
            لو محتاج
          </span>
        </div>
      )}

      {!selected && !loading && (
        <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          اضغط على الخريطة عند مكان متجرك — والمحافظة والمدينة والعنوان هيتملوا لوحدهم
        </p>
      )}

      {error && (
        <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
