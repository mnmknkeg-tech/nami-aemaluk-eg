'use client';
import { clearToken, clearUserJSON } from '@/lib/session-keys';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, MapPin } from 'lucide-react';
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
import { apiRequest, useAuth } from '@/lib/auth';

interface AccountTabProps {
  shop: any;
  onSaved: () => void;
}

export default function AccountTab({ shop, onSaved }: AccountTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: shop?.name || '',
    governorate: shop?.governorate || '',
    city: shop?.city || '',
    email: shop?.email || user?.email || '',
    phone: shop?.phone || user?.phone || '',
    address: shop?.addressDetailed || shop?.address_detailed || shop?.address || '',
    description: shop?.description || '',
  });

  const formRef = useRef(formData);
  useEffect(() => {
    formRef.current = formData;
  }, [formData]);

  useEffect(() => {
    setFormData({
      name: shop?.name || '',
      governorate: shop?.governorate || '',
      city: shop?.city || '',
      email: shop?.email || user?.email || '',
      phone: shop?.phone || user?.phone || '',
      address: shop?.addressDetailed || shop?.address_detailed || shop?.address || '',
      description: shop?.description || '',
    });
  }, [
    shop?.name,
    shop?.governorate,
    shop?.city,
    shop?.email,
    shop?.phone,
    shop?.addressDetailed,
    shop?.address_detailed,
    shop?.address,
    shop?.description,
    user?.email,
    user?.phone,
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveAccount = useCallback(async () => {
    setIsSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: current.name,
          governorate: current.governorate,
          city: current.city,
          email: current.email,
          phone: current.phone,
          addressDetailed: current.address,
          description: current.description,
        }),
      });
      toast({ title: 'تم الحفظ', description: 'تم تحديث بيانات الحساب بنجاح' });
      onSaved();
      return true;
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error?.message || 'فشل حفظ التغييرات',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [onSaved, toast]);

  // Register save handler
  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-register-save-handler', {
          detail: { sectionId: 'account', handler: saveAccount },
        })
      );
    } catch {}
  }, [saveAccount]);

  // Emit changes
  useEffect(() => {
    const baseline = {
      name: shop?.name || '',
      governorate: shop?.governorate || '',
      city: shop?.city || '',
      email: shop?.email || '',
      phone: shop?.phone || '',
      address: shop?.addressDetailed || shop?.address_detailed || '',
      description: shop?.description || '',
    };
    const count =
      (String(formData.name) !== String(baseline.name) ? 1 : 0) +
      (String(formData.governorate) !== String(baseline.governorate) ? 1 : 0) +
      (String(formData.city) !== String(baseline.city) ? 1 : 0) +
      (String(formData.email) !== String(baseline.email) ? 1 : 0) +
      (String(formData.phone) !== String(baseline.phone) ? 1 : 0) +
      (String(formData.address) !== String(baseline.address) ? 1 : 0) +
      (String(formData.description) !== String(baseline.description) ? 1 : 0);
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'account', count },
        })
      );
    } catch {}
  }, [formData, shop]);

  const deactivateAccount = async () => {
    if (isDeleting) return;
    const expected = 'حذف';
    if (String(deleteConfirmText || '').trim() !== expected) {
      toast({
        title: 'تأكيد مطلوب',
        description: `اكتب "${expected}" للتأكيد`,
        variant: 'destructive',
      });
      return;
    }
    setIsDeleting(true);
    try {
      await apiRequest('/auth/deactivate', { method: 'POST' });
      clearUserJSON();
      clearToken();
      toast({ title: 'تم حذف الحساب', description: 'تم تعطيل حسابك بنجاح' });
      window.location.href = '/login';
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error?.message || 'فشل حذف الحساب',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الحساب</h1>
        <p className="text-slate-500 text-sm mt-1">إدارة بيانات حسابك ومتجرك</p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle>البيانات الأساسية</CardTitle>
            <CardDescription>الاسم، البريد الإلكتروني، الهاتف والعنوان</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المتجر / النشاط التجاري</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="pr-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pr-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="governorate">المحافظة</Label>
                <Input
                  id="governorate"
                  name="governorate"
                  value={formData.governorate}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">المدينة</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">الهاتف</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pr-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="pr-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="flex w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all resize-none"
                placeholder="وصف مختصر لمتجرك..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-red-600">حذف الحساب</CardTitle>
            <CardDescription>
              سيتم تعطيل حسابك وجميع بياناتك. هذا الإجراء لا يمكن التراجع عنه.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">اكتب "حذف" للتأكيد</Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={isDeleting}
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={deactivateAccount}
              disabled={isDeleting}
            >
              {isDeleting ? 'جاري الحذف...' : 'حذف الحساب'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
