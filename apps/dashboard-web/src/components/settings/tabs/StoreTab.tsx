'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Label,
  Input,
  Button,
} from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import CommerceSettingsCard from './CommerceSettingsCard';

interface StoreTabProps {
  shop: any;
  onSaved: () => void;
}

export default function StoreTab({ shop, onSaved }: StoreTabProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(Boolean(shop?.isActive));
  const [togglingPublicDisabled, setTogglingPublicDisabled] = useState(false);
  const [publicDisabled, setPublicDisabled] = useState<boolean>(
    Boolean(shop?.publicDisabled ?? shop?.public_disabled)
  );
  const [togglingDeliveryDisabled, setTogglingDeliveryDisabled] = useState(false);
  const [deliveryDisabled, setDeliveryDisabled] = useState<boolean>(
    Boolean(shop?.deliveryDisabled ?? shop?.delivery_disabled)
  );

  useEffect(() => {
    setIsActive(Boolean(shop?.isActive));
  }, [shop?.isActive]);
  useEffect(() => {
    setPublicDisabled(Boolean(shop?.publicDisabled ?? shop?.public_disabled));
  }, [shop?.publicDisabled, shop?.public_disabled]);
  useEffect(() => {
    setDeliveryDisabled(Boolean(shop?.deliveryDisabled ?? shop?.delivery_disabled));
  }, [shop?.deliveryDisabled, shop?.delivery_disabled]);

  const initial = useMemo(
    () => ({
      whatsapp: String(shop?.layoutConfig?.whatsapp || ''),
      customDomain: String(shop?.layoutConfig?.customDomain || ''),
      openingHours: String(shop?.openingHours || shop?.opening_hours || ''),
      displayAddress: String(shop?.displayAddress || shop?.display_address || ''),
      mapLabel: String(shop?.mapLabel || shop?.map_label || ''),
    }),
    [shop]
  );

  const [form, setForm] = useState(initial);
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const [latitude, setLatitude] = useState<number | null>(
    typeof shop?.latitude === 'number'
      ? shop.latitude
      : typeof shop?.lat === 'number'
        ? shop.lat
        : null
  );
  const [longitude, setLongitude] = useState<number | null>(
    typeof shop?.longitude === 'number'
      ? shop.longitude
      : typeof shop?.lng === 'number'
        ? shop.lng
        : null
  );
  const [locatingShop, setLocatingShop] = useState(false);
  const [locationError, setLocationError] = useState('');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  // Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        await import('leaflet/dist/leaflet.css');
        const leaflet: any = await import('leaflet');
        if (cancelled) return;
        const L = leaflet?.default || leaflet;

        // Fix default icon
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const hasCoords = latitude != null && longitude != null;
        const centerLat = hasCoords ? latitude! : 30.0444;
        const centerLng = hasCoords ? longitude! : 31.2357;
        const defaultZoom = hasCoords ? 15 : 12;

        const ensureMarker = (lat: number, lng: number) => {
          if (!mapRef.current) return;
          if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
            markerRef.current.on('dragend', () => {
              const p = markerRef.current?.getLatLng();
              if (!p) return;
              setLatitude(p.lat);
              setLongitude(p.lng);
            });
          } else {
            markerRef.current.setLatLng([lat, lng]);
          }
        };

        if (!mapRef.current) {
          mapRef.current = L.map(mapContainerRef.current, {
            zoomControl: true,
            attributionControl: false,
          }).setView([centerLat, centerLng], defaultZoom);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(
            mapRef.current
          );
          mapRef.current.on('click', (e: any) => {
            const p = e?.latlng;
            if (!p) return;
            setLatitude(p.lat);
            setLongitude(p.lng);
            ensureMarker(p.lat, p.lng);
          });
          if (hasCoords) ensureMarker(latitude!, longitude!);
        } else {
          mapRef.current.setView([centerLat, centerLng], mapRef.current.getZoom() || defaultZoom);
          if (hasCoords) ensureMarker(latitude!, longitude!);
        }
        setTimeout(() => mapRef.current?.invalidateSize(), 0);
      } catch (e) {
        // Leaflet not installed — show fallback
        if (mapContainerRef.current && !mapRef.current) {
          mapContainerRef.current.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px;font-weight:bold;text-align:center;padding:1rem">الخريطة غير متاحة حالياً. شغّل: npm install leaflet</div>';
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Emit changes
  useEffect(() => {
    const base = initial;
    const count =
      (String(form.whatsapp || '') !== String(base.whatsapp || '') ? 1 : 0) +
      (String(form.customDomain || '') !== String(base.customDomain || '') ? 1 : 0) +
      (String(form.openingHours || '') !== String(base.openingHours || '') ? 1 : 0) +
      (String(form.displayAddress || '') !== String(base.displayAddress || '') ? 1 : 0) +
      (String(form.mapLabel || '') !== String(base.mapLabel || '') ? 1 : 0) +
      (Number(latitude ?? -999) !== Number(shop?.latitude ?? shop?.lat ?? -999) ? 1 : 0) +
      (Number(longitude ?? -999) !== Number(shop?.longitude ?? shop?.lng ?? -999) ? 1 : 0);
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'store', count },
        })
      );
    } catch {}
  }, [form, latitude, longitude, initial, shop]);

  const handleUseMyLocation = async () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setLocatingShop(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocatingShop(false);
      },
      () => {
        setLocatingShop(false);
        setLocationError('فشل في تحديد موقعك');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const onChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleToggleActive = async () => {
    setTogglingActive(true);
    const next = !isActive;
    try {
      await apiRequest('/shops/me', { method: 'PATCH', body: JSON.stringify({ isActive: next }) });
      setIsActive(next);
      toast({ title: 'تم التحديث', description: next ? 'تم فتح المتجر' : 'تم إغلاق المتجر' });
      onSaved();
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل تحديث حالة المتجر',
        variant: 'destructive',
      });
    } finally {
      setTogglingActive(false);
    }
  };

  const handleTogglePublicDisabled = async () => {
    setTogglingPublicDisabled(true);
    const next = !publicDisabled;
    try {
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({ publicDisabled: next }),
      });
      setPublicDisabled(next);
      toast({
        title: 'تم التحديث',
        description: next ? 'تم تعطيل الصفحة العامة' : 'تم تفعيل الصفحة العامة',
      });
      onSaved();
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل تحديث الصفحة العامة',
        variant: 'destructive',
      });
    } finally {
      setTogglingPublicDisabled(false);
    }
  };

  const handleToggleDeliveryDisabled = async () => {
    setTogglingDeliveryDisabled(true);
    const next = !deliveryDisabled;
    try {
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({ deliveryDisabled: next }),
      });
      setDeliveryDisabled(next);
      toast({ title: 'تم التحديث', description: next ? 'تم تعطيل التوصيل' : 'تم تفعيل التوصيل' });
      onSaved();
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل تحديث حالة التوصيل',
        variant: 'destructive',
      });
    } finally {
      setTogglingDeliveryDisabled(false);
    }
  };

  const saveStoreSettings = useCallback(async () => {
    setSaving(true);
    try {
      const currentForm = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          whatsapp: currentForm.whatsapp,
          customDomain: currentForm.customDomain,
          openingHours: currentForm.openingHours,
          displayAddress: currentForm.displayAddress || null,
          mapLabel: currentForm.mapLabel || null,
          latitude: latitude,
          longitude: longitude,
        }),
      });
      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات المتجر بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات المتجر',
        variant: 'destructive',
      });
      throw e;
    } finally {
      setSaving(false);
    }
  }, [shop?.id, latitude, longitude, onSaved, toast]);

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-register-save-handler', {
          detail: { sectionId: 'store', handler: saveStoreSettings },
        })
      );
    } catch {}
  }, [saveStoreSettings]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">إعدادات المتجر</h1>
        <p className="text-slate-500 text-sm mt-1">إدارة حالة المتجر والتواصل والموقع</p>
      </div>

      <CommerceSettingsCard shop={shop} onSaved={onSaved} />

      <Card>
        <CardHeader>
          <CardTitle>حالة المتجر</CardTitle>
          <CardDescription>
            {isActive ? 'المتجر مفتوح ويستقبل الطلبات' : 'المتجر مغلق مؤقتاً'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end">
          <Button
            type="button"
            onClick={handleToggleActive}
            disabled={togglingActive}
            variant={isActive ? 'destructive' : 'default'}
          >
            {togglingActive ? 'جاري التحديث...' : isActive ? 'إغلاق المتجر' : 'فتح المتجر'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الصفحة العامة</CardTitle>
          <CardDescription>
            {publicDisabled ? 'الصفحة العامة معطّلة' : 'الصفحة العامة مفعّلة'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end">
          <Button
            type="button"
            onClick={handleTogglePublicDisabled}
            disabled={togglingPublicDisabled}
            variant={publicDisabled ? 'default' : 'destructive'}
          >
            {togglingPublicDisabled
              ? 'جاري التحديث...'
              : publicDisabled
                ? 'تفعيل الصفحة'
                : 'تعطيل الصفحة'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>التوصيل</CardTitle>
          <CardDescription>
            {deliveryDisabled ? 'خدمة التوصيل معطّلة' : 'خدمة التوصيل مفعّلة'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end">
          <Button
            type="button"
            onClick={handleToggleDeliveryDisabled}
            disabled={togglingDeliveryDisabled}
            variant={deliveryDisabled ? 'default' : 'destructive'}
          >
            {togglingDeliveryDisabled
              ? 'جاري التحديث...'
              : deliveryDisabled
                ? 'تفعيل التوصيل'
                : 'تعطيل التوصيل'}
          </Button>
        </CardFooter>
      </Card>

      <form onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle>التواصل</CardTitle>
            <CardDescription>رقم واتساب ونطاق مخصص وساعات العمل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">واتساب</Label>
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={onChange('whatsapp')}
                  placeholder="+2010..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customDomain">نطاق مخصص</Label>
                <Input
                  id="customDomain"
                  value={form.customDomain}
                  onChange={onChange('customDomain')}
                  placeholder="shop.example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingHours">ساعات العمل</Label>
              <Input
                id="openingHours"
                value={form.openingHours}
                onChange={onChange('openingHours')}
                placeholder="10:00 - 22:00"
              />
            </div>
          </CardContent>
        </Card>

        <div className="h-4" />

        <Card>
          <CardHeader>
            <CardTitle>العنوان</CardTitle>
            <CardDescription>العنوان المعروض واسم الموقع على الخريطة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayAddress">عنوان مختصر</Label>
                <Input
                  id="displayAddress"
                  value={form.displayAddress}
                  onChange={onChange('displayAddress')}
                  placeholder="القاهرة، مصر"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mapLabel">اسم الموقع على الخريطة</Label>
                <Input
                  id="mapLabel"
                  value={form.mapLabel}
                  onChange={onChange('mapLabel')}
                  placeholder="اسم المتجر"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="h-4" />

        <Card>
          <CardHeader>
            <CardTitle>موقع المتجر على الخريطة</CardTitle>
            <CardDescription>اضغط على الخريطة لتحديد موقع متجرك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleUseMyLocation}
                disabled={locatingShop}
                variant="outline"
              >
                {locatingShop ? 'جاري تحديد موقعك...' : 'استخدم موقعي الحالي'}
              </Button>
            </div>
            {locationError && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
                {locationError}
              </div>
            )}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              <div ref={mapContainerRef} className="w-full h-72" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-right">
                <div className="text-xs text-slate-500">Latitude</div>
                <div className="font-bold text-slate-900">
                  {latitude == null ? '—' : latitude.toFixed(6)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-right">
                <div className="text-xs text-slate-500">Longitude</div>
                <div className="font-bold text-slate-900">
                  {longitude == null ? '—' : longitude.toFixed(6)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
