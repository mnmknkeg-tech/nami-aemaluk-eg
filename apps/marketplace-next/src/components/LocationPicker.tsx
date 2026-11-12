'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Locate, Loader2, Check } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onAddressResolved?: (address: { city?: string; district?: string; fullAddress?: string }) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

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
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialCoords || null
  );
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
        setError('فشل تحميل الخريطة');
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
    setSelected({ lat, lng });
    onLocationSelect(lat, lng);

    // Reverse geocode using Nominatim (note: the param is `lon`, not `lng`)
    if (onAddressResolved) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.address) return;
          const addr = data.address;
          const city = addr.city || addr.town || addr.village || addr.state || addr.county || '';
          const district = addr.suburb || addr.neighbourhood || addr.district || addr.road || '';
          const fullAddress = data.display_name || '';
          onAddressResolved({ city, district, fullAddress });
        })
        .catch(() => {});
    }
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
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
        }
        placeMarker(latitude, longitude);
        setLocating(false);
      },
      (err) => {
        setError('فشل تحديد موقعك. تأكد من السماح بالوصول للموقع');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
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
      </div>

      {error && <p className="text-xs font-bold text-red-500">{error}</p>}

      {selected && (
        <div className="flex items-center gap-2 text-xs font-bold text-green-500">
          <Check className="w-4 h-4" />
          تم تحديد الموقع: {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
        </div>
      )}

      {!selected && !loading && (
        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          اضغط على الخريطة لتحديد موقع التوصيل
        </p>
      )}
    </div>
  );
}
