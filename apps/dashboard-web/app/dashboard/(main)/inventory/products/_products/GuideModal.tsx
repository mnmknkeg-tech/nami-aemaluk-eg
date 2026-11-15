'use client';

import { X, Target, BookOpen, ClipboardList, CheckCircle2, Zap, Link2 } from 'lucide-react';

type Props = {
  onClose: () => void;
  isRestaurant: boolean;
  isRetail: boolean;
};

export default function InventoryGuideModal({ onClose, isRestaurant, isRetail }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 flex-row-reverse">
          <h2 className="text-xl font-black text-slate-900">دليل المخزون</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="space-y-6 text-right">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">وظيفة الصفحة</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              إدارة المنتجات والمخزون، إضافة وتعديل وحذف المنتجات، مع إمكانية الاستيراد والتصدير
              بالجملة.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">متى تستخدمها</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              عند الحاجة لإضافة منتجات جديدة، تعديل الأسعار أو المخزون، أو تصدير قائمة المنتجات.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">ماذا ستجد داخلها</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>• إحصائيات المخزون (إجمالي المنتجات، النشطة، منخفضة المخزون، القيمة)</li>
              <li>• جدول بجميع المنتجات مع الصور والأسعار والمخزون</li>
              <li>• بحث وفلترة حسب الفئة والترتيب</li>
              <li>• إجراءات سريعة (إضافة، تعديل، حذف، تفعيل/تعطيل)</li>
              <li>• استيراد وتصدير CSV</li>
              <li>• ترقيم الصفحات</li>
              {isRestaurant && <li>• إدارة الإضافات (للمطاعم)</li>}
              {isRetail && <li>• محرر خريطة الصور (تطبيق اختياري — ثبّته من صفحة التطبيقات)</li>}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">كيفية العمل</h3>
            </div>
            <ol className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>1. راجع إحصائيات المخزون لفهم الوضع الحالي</li>
              <li>2. استخدم البحث للعثور على منتج محدد</li>
              <li>3. استخدم الفلاتر لتضييق النتائج حسب الفئة</li>
              <li>4. اضغط "إضافة منتج" لإضافة منتج جديد</li>
              <li>5. استخدم أزرار الإجراءات لتعديل أو حذف المنتجات</li>
              <li>6. استخدم الاستيراد/التصدير لإدارة المنتجات بالجملة</li>
              {isRestaurant && <li>7. استخدم "إدارة الإضافات" لإضافة خيارات إضافية للمنتجات</li>}
              {isRetail && (
                <li>7. ثبّت تطبيق "محرر الصور التفاعلي" من صفحة التطبيقات لتفعيل خريطة الصور</li>
              )}
            </ol>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">أفضل الممارسات</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>• حافظ على تحديث المخزون بانتظام</li>
              <li>• استخدم الفئات لتنظيم المنتجات بشكل أفضل</li>
              <li>• راجع المنتجات منخفضة المخزون لإعادة التعبئة</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-amber-500" />
              <h3 className="font-bold text-slate-900">نصائح</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>• استخدم الاستيراد بالجملة لإضافة العديد من المنتجات دفعة واحدة</li>
              <li>• راجع الصور للتأكد من جودة العرض</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">روابط ذات صلة</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>• الفئات</li>
              <li>• المبيعات</li>
              <li>• المخزون المنخفض</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
