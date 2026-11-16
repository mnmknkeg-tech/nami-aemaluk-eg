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
import { getLayoutBase, commitLayoutWrite } from '../layoutConfigDraft';
import { compressForUpload } from '@/lib/upload-image';
import { uploadMediaFile } from '@/lib/api/upload';

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
  const [receiptLogoFile, setReceiptLogoFile] = useState<File | null>(null);
  const [receiptFooterNote, setReceiptFooterNote] = useState('');
  const [receiptVatRatePercent, setReceiptVatRatePercent] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (receiptLogoDataUrl.startsWith('blob:')) URL.revokeObjectURL(receiptLogoDataUrl);
    };
  }, [receiptLogoDataUrl]);

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
    try {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'خطأ', description: 'يرجى اختيار ملف صورة صالح', variant: 'destructive' });
        return;
      }
      const compressed = await compressForUpload(file, 'logo');
      if (compressed.size > 2 * 1024 * 1024) {
        toast({
          title: 'خطأ',
          description: 'حجم الصورة كبير جداً (الحد الأقصى 2MB)',
          variant: 'destructive',
        });
        return;
      }
      setReceiptLogoFile(compressed);
      setReceiptLogoDataUrl(URL.createObjectURL(compressed));
      // Upload immediately to permanent object storage; blob/data previews are
      // never allowed to reach the saved receipt theme.
      const shopId = String(shop?.id || shop?.shopId || '');
      if (!shopId) throw new Error('تعذر تحديد المتجر لرفع شعار الإيصال.');
      const permanentUrl = await uploadMediaFile(compressed, shopId, 'receipt_logo');
      if (!/^https?:\/\//i.test(permanentUrl) || /^(data:|blob:)/i.test(permanentUrl)) {
        throw new Error('لم يرجع التخزين رابطًا دائمًا لشعار الإيصال.');
      }
      setReceiptLogoDataUrl(permanentUrl);
    } catch (error) {
      toast({
        title: 'تعذّر رفع الشعار',
        description: error instanceof Error ? error.message : 'حاول مرة أخرى.',
        variant: 'destructive',
      });
    }
  };

  // Silent when invoked by the settings shell save-all (one summary toast).
  const handleSaveReceiptTheme = async (opts?: { silent?: boolean }) => {
    setSaving(true);
    try {
      // The tab READS the theme from layoutConfig.receiptTheme, so it must
      // also SAVE there — the old top-level receiptTheme key was silently
      // dropped by the backend, so the theme never persisted.
      let permanentLogoUrl = receiptLogoDataUrl;
      // Migrate old receipts that stored the logo as a base64 data URL.
      if (/^data:image\//i.test(permanentLogoUrl)) {
        const shopId = String(shop?.id || shop?.shopId || '');
        if (!shopId) throw new Error('تعذر تحديد المتجر لترحيل شعار الإيصال القديم.');
        const response = await fetch(permanentLogoUrl);
        if (!response.ok) throw new Error('تعذر قراءة شعار الإيصال القديم.');
        const blob = await response.blob();
        const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1] || 'png';
        const legacyFile = new File([blob], `receipt-logo.${extension}`, {
          type: blob.type || 'image/png',
        });
        permanentLogoUrl = await uploadMediaFile(legacyFile, shopId, 'receipt_logo');
        setReceiptLogoDataUrl(permanentLogoUrl);
      }
      if (/^(data:|blob:)/i.test(permanentLogoUrl)) {
        throw new Error('يجب رفع شعار الإيصال إلى التخزين الدائم قبل الحفظ.');
      }
      const layout = getLayoutBase(shop);
      layout.receiptTheme = {
        shopName: receiptShopName,
        phone: receiptPhone,
        city: receiptCity,
        address: receiptAddress,
        logoDataUrl: permanentLogoUrl,
        footerNote: receiptFooterNote,
        vatRatePercent: Number(receiptVatRatePercent) || 0,
      };
      commitLayoutWrite(layout);
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({ layoutConfig: layout }),
      });
      setReceiptLogoDataUrl(permanentLogoUrl);
      setReceiptLogoFile(null);
      lastSavedRef.current = {
        shopName: receiptShopName,
        phone: receiptPhone,
        city: receiptCity,
        address: receiptAddress,
        logoDataUrl: permanentLogoUrl,
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
      if (!opts?.silent) toast({ title: 'تم الحفظ', description: 'تم حفظ ثيم الإيصال' });
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
                    onClick={() => {
                      if (receiptLogoDataUrl.startsWith('blob:'))
                        URL.revokeObjectURL(receiptLogoDataUrl);
                      setReceiptLogoDataUrl('');
                      setReceiptLogoFile(null);
                    }}
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
