'use client';

import React from 'react';
import { CheckCircle2, X, Target, BookOpen, Zap, Link2, ClipboardList } from 'lucide-react';

export interface SalesGuideDrawerProps {
  setGuideOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SalesGuideDrawer: React.FC<SalesGuideDrawerProps> = ({ setGuideOpen }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setGuideOpen(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 flex-row-reverse">
          <h2 className="text-xl font-black text-slate-900">دليل المبيعات</h2>
          <button onClick={() => setGuideOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg">
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
              إدارة ومتابعة جميع طلبات المتجر، من قيد الانتظار حتى التوصيل أو الإلغاء، مع إمكانية
              تحديث الحالات وطباعة الفواتير.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">متى تستخدمها</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              عند الحاجة لمراجعة الطلبات الجديدة، تحديث حالات الطلبات، طباعة الفواتير، أو متابعة
              تفاصيل كل طلب.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">ماذا ستجد داخلها</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>
                • 8 بطاقات إحصائية (إجمالي، إيرادات، متوسط، قيد الانتظار، قيد التجهيز، جاهز، تم
                التوصيل، ملغي/مرفوض)
              </li>
              <li>
                • 10 فلاتر حالة (الكل، ناجح، قيد الانتظار، مؤكد، قيد التجهيز، جاهز، سُلّم للمندوب،
                خرج للتوصيل، تم التوصيل، ملغي، مرفوض، مسترجع)
              </li>
              <li>• فلترة بالنطاق الزمني (اليوم/أسبوع/شهر) ونطاق المبلغ</li>
              <li>• ترتيب بالتاريخ/المبلغ/الحالة + ترقيم صفحات</li>
              <li>• تحديد متعدد + إجراءات جماعية (تأكيد/رفض الكل)</li>
              <li>• جدول بجميع الطلبات مع العميل والمبلغ والحالة والتوصيل</li>
              <li>
                • قائمة منسدلة لكل طلب لتحديث الحالة (قبول/تجهيز/جاهز/سُلّم للمندوب/تم التوصيل/رفض)
              </li>
              <li>• زر طباعة فاتورة لكل طلب</li>
              <li>• تفاصيل الطلب مع لوحة المرتجعات (إنشاء/عرض المرتجعات)</li>
              <li>• إنشاء طلب جديد يدوياً</li>
              <li>• تصدير CSV</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">كيفية العمل</h3>
            </div>
            <ol className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>1. راجع الإحصائيات الـ 8 لفهم حجم الطلبات</li>
              <li>2. استخدم الفلاتر للتركيز على حالة معينة</li>
              <li>3. اضغط على القائمة المنسدلة للطلب لتحديث الحالة</li>
              <li>4. اضغط على أيقونة العين لعرض تفاصيل الطلب والمرتجعات</li>
              <li>5. اضغط على أيقونة الطابعة لطباعة الفاتورة</li>
              <li>6. حدد عدة طلبات لإجراءات جماعية</li>
              <li>7. اضغط "طلب جديد" لإنشاء طلب يدوياً</li>
            </ol>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">أفضل الممارسات</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>• راجع الطلبات قيد الانتظار بانتظام لتسريع المعالجة</li>
              <li>• استخدم الفلترة للتركيز على الطلبات الناجحة أو المرفوضة</li>
              <li>• طباعة الفواتير للطلبات المكتملة</li>
              <li>• راجع تفاصيل الطلب قبل تحديث الحالة</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-amber-500" />
              <h3 className="font-bold text-slate-900">نصائح</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>• الطلبات قيد الانتظار تحتاج متابعة سريعة</li>
              <li>• استخدم الطباعة المباشرة للفاتورة لسرعة الإنجاز</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">روابط ذات صلة</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>• حالة الطلب</li>
              <li>• المدفوعات</li>
              <li>• المرتجعات</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesGuideDrawer;
