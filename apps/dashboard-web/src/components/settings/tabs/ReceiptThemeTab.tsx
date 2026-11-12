'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Label,
  Input,
  Button,
} from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { compressForUpload } from '@/lib/upload-image';

interface ReceiptThemeTabProps {
  shop: any;
}

export default function ReceiptThemeTab({ shop }: ReceiptThemeTabProps) {
  const { toast } = useToast();
  const receiptLogoInputRef = useRef<HTMLInputElement>(null);
  const [receiptShopName, setReceiptShopName] = useState('');
  const [receiptPhone, setReceiptPhone] = useState('');
  const [receiptCity, setReceiptCity] = useState('');
  const [receiptAddress, setReceiptAddress] = useState('');
  const [receiptLogoDataUrl, setReceiptLogoDataUrl] = useState('');
  const [receiptFooterNote, setReceiptFooterNote] = useState('');
  const [receiptVatRatePercent, setReceiptVatRatePercent] = useState('0');
  const [saving, setSaving] = useState(false);

  const lastSavedRef = useRef({
    shopName: '',
    phone: '',
    city: '',
    address: '',
    logoDataUrl: '',
    footerNote: '',
    vatRatePercent: '0',
  });

  useEffect(() => {
    const layout =
      shop?.layoutConfig && typeof shop.layoutConfig === 'object' ? shop.layoutConfig : undefined;
    const theme =
      (layout as any)?.receiptTheme && typeof (layout as any).receiptTheme === 'object'
        ? (layout as any).receiptTheme
        : undefined;
    const resolvedTheme = theme || {};
    setReceiptShopName(String(resolvedTheme?.shopName || shop?.name || ''));
    setReceiptPhone(String(resolvedTheme?.phone || shop?.phone || ''));
    setReceiptCity(String(resolvedTheme?.city || shop?.city || ''));
    setReceiptAddress(
      String(resolvedTheme?.address || shop?.addressDetailed || shop?.address_detailed || '')
    );
    setReceiptLogoDataUrl(String(resolvedTheme?.logoDataUrl || ''));
    setReceiptFooterNote(String(resolvedTheme?.footerNote || ''));
    setReceiptVatRatePercent(String(resolvedTheme?.vatRatePercent ?? 0));
    lastSavedRef.current = {
      shopName: String(resolvedTheme?.shopName || shop?.name || ''),
      phone: String(resolvedTheme?.phone || shop?.phone || ''),
      city: String(resolvedTheme?.city || shop?.city || ''),
      address: String(
        resolvedTheme?.address || shop?.addressDetailed || shop?.address_detailed || ''
      ),
      logoDataUrl: String(resolvedTheme?.logoDataUrl || ''),
      footerNote: String(resolvedTheme?.footerNote || ''),
      vatRatePercent: String(resolvedTheme?.vatRatePercent ?? 0),
    };
  }, [
    shop?.id,
    shop?.name,
    shop?.phone,
    shop?.city,
    shop?.addressDetailed,
    shop?.address_detailed,
  ]);

  // Emit changes
  useEffect(() => {
    const baseline = lastSavedRef.current;
    const count =
      (String(receiptShopName) !== String(baseline.shopName) ? 1 : 0) +
      (String(receiptPhone) !== String(baseline.phone) ? 1 : 0) +
      (String(receiptCity) !== String(baseline.city) ? 1 : 0) +
      (String(receiptAddress) !== String(baseline.address) ? 1 : 0) +
      (String(receiptLogoDataUrl) !== String(baseline.logoDataUrl) ? 1 : 0) +
      (String(receiptFooterNote) !== String(baseline.footerNote) ? 1 : 0) +
      (String(receiptVatRatePercent) !== String(baseline.vatRatePercent) ? 1 : 0);
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'receipt_theme', count },
        })
      );
    } catch {}
  }, [
    receiptShopName,
    receiptPhone,
    receiptCity,
    receiptAddress,
    receiptLogoDataUrl,
    receiptFooterNote,
    receiptVatRatePercent,
  ]);

  const handlePickReceiptLogo = () => receiptLogoInputRef.current?.click();

  const handleReceiptLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressForUpload(file, 'logo');
    if (compressed.size > 2 * 1024 * 1024) {
      toast({
        title: 'خطأ',
        description: 'حجم الصورة كبير جداً (الحد الأقصى 2MB)',
        variant: 'destructive',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setReceiptLogoDataUrl(reader.result as string);
    reader.readAsDataURL(compressed);
  };

  const handleSaveReceiptTheme = async () => {
    setSaving(true);
    try {
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          receiptTheme: {
            shopName: receiptShopName,
            phone: receiptPhone,
            city: receiptCity,
            address: receiptAddress,
            logoDataUrl: receiptLogoDataUrl,
            footerNote: receiptFooterNote,
            vatRatePercent: Number(receiptVatRatePercent) || 0,
          },
        }),
      });
      lastSavedRef.current = {
        shopName: receiptShopName,
        phone: receiptPhone,
        city: receiptCity,
        address: receiptAddress,
        logoDataUrl: receiptLogoDataUrl,
        footerNote: receiptFooterNote,
        vatRatePercent: receiptVatRatePercent,
      };
      try {
        window.dispatchEvent(
          new CustomEvent('merchant-settings-section-changes', {
            detail: { sectionId: 'receipt_theme', count: 0 },
          })
        );
      } catch {}
      toast({ title: 'تم الحفظ', description: 'تم حفظ ثيم الإيصال' });
      return true;
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ ثيم الإيصال', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-register-save-handler', {
          detail: { sectionId: 'receipt_theme', handler: handleSaveReceiptTheme },
        })
      );
    } catch {}
  }, [
    receiptShopName,
    receiptPhone,
    receiptCity,
    receiptAddress,
    receiptLogoDataUrl,
    receiptFooterNote,
    receiptVatRatePercent,
  ]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <h3 className="text-2xl font-black">ثيم الإيصال</h3>
      <Card>
        <CardHeader>
          <CardTitle>ثيم الإيصال</CardTitle>
          <CardDescription>تخصيص شكل الإيصال المطبوع</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="receiptShopName">اسم المتجر على الإيصال</Label>
              <Input
                id="receiptShopName"
                value={receiptShopName}
                onChange={(e) => setReceiptShopName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptPhone">الهاتف</Label>
              <Input
                id="receiptPhone"
                value={receiptPhone}
                onChange={(e) => setReceiptPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptCity">المدينة</Label>
            <Input
              id="receiptCity"
              value={receiptCity}
              onChange={(e) => setReceiptCity(e.target.value)}
              placeholder="القاهرة"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptVatRatePercent">نسبة الضريبة (%)</Label>
            <Input
              id="receiptVatRatePercent"
              type="number"
              min={0}
              max={100}
              value={receiptVatRatePercent}
              onChange={(e) => setReceiptVatRatePercent(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptAddress">العنوان</Label>
            <Input
              id="receiptAddress"
              value={receiptAddress}
              onChange={(e) => setReceiptAddress(e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>لوجو الإيصال (اختياري)</Label>
              <div className="flex items-center gap-3">
                <div
                  onClick={handlePickReceiptLogo}
                  className="w-20 h-20 rounded-md overflow-hidden bg-slate-50 border border-slate-200 shrink-0 cursor-pointer flex items-center justify-center"
                >
                  {receiptLogoDataUrl ? (
                    <img
                      src={receiptLogoDataUrl}
                      className="w-full h-full object-cover"
                      alt="receipt-logo"
                    />
                  ) : (
                    <ImageIcon className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <Button type="button" onClick={handlePickReceiptLogo} variant="outline">
                    اختيار لوجو
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setReceiptLogoDataUrl('')}
                    variant="secondary"
                  >
                    حذف اللوجو
                  </Button>
                </div>
                <input
                  ref={receiptLogoInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleReceiptLogoChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptFooterNote">ملاحظة التذييل</Label>
              <Input
                id="receiptFooterNote"
                value={receiptFooterNote}
                onChange={(e) => setReceiptFooterNote(e.target.value)}
                placeholder="شكراً لزيارتكم!"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
