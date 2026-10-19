import React, { useState } from 'react';
import {
  Tag,
  LayoutGrid,
  DollarSign,
  MousePointerClick,
  Package,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import type { InspectorPanelProps } from './types';
import type { ProductCardShape, BuyButtonMode } from '@ray-eg/shared/builder';

type ProductCardSectionProps = Pick<
  InspectorPanelProps,
  | 'node'
  | 'isProductOrCard'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handlePropChange'
  | 'setActiveGalleryTarget'
  | 'setShowPresetGallery'
>;

type TabId = 'shape' | 'price' | 'buttons' | 'stock' | 'grid';

const TABS: Array<{ id: TabId; label: string; Icon: any }> = [
  { id: 'shape', label: 'الشكل', Icon: LayoutGrid },
  { id: 'price', label: 'السعر', Icon: DollarSign },
  { id: 'buttons', label: 'الأزرار', Icon: MousePointerClick },
  { id: 'stock', label: 'المخزون والمقاسات', Icon: Package },
  { id: 'grid', label: 'الشبكة', Icon: Tag },
];

const SHAPES: Array<{ id: ProductCardShape; label: string; desc: string }> = [
  { id: 'classic', label: 'كلاسيك', desc: 'صورة أعلى + بيانات أسفل' },
  { id: 'minimal', label: 'بسيط', desc: 'بدون حدود — نظيف' },
  { id: 'overlay', label: 'متراكب', desc: 'البيانات فوق الصورة' },
  { id: 'horizontal', label: 'أفقي', desc: 'صورة جانبية + محتوى' },
  { id: 'compact', label: 'مدمج', desc: 'بطاقات صغيرة للعروض' },
];

const BUY_MODES: Array<{ id: BuyButtonMode; label: string; desc: string }> = [
  { id: 'full', label: 'زر كامل', desc: 'نص + أيقونة' },
  { id: 'icon', label: 'أيقونة فقط +', desc: 'زر دائري يطلب فوراً' },
  { id: 'hidden', label: 'بدون زر شراء', desc: 'عرض فقط' },
];

function EyeToggle({
  visible,
  onToggle,
  showLabel = 'ظاهر',
  hideLabel = 'مخفي',
}: {
  visible: boolean;
  onToggle: () => void;
  showLabel?: string;
  hideLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer ${
        visible
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
      }`}
    >
      {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      <span>{visible ? showLabel : hideLabel}</span>
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-200">
      <span className="text-[11px] font-bold text-slate-700">{label}</span>
      {children}
    </div>
  );
}

export const ProductCardSection: React.FC<ProductCardSectionProps> = ({
  node,
  isProductOrCard,
  expandedSections,
  toggleAccordion,
  handlePropChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('shape');

  if (!isProductOrCard) return null;

  const p = node.props || {};
  const isExpanded = expandedSections?.productCard ?? true;

  const currentShape = (p.shape as ProductCardShape) || 'classic';
  const currentBuyMode = (p.buyButtonMode as BuyButtonMode) || 'full';
  const showPrice = p.showPrice !== false;
  const showOriginalPrice = Boolean(p.showOriginalPrice);
  const showDiscountBadge = p.showDiscountBadge !== false;
  const showRating = p.showRating !== false;
  const showStock = p.showStockStatus !== false;
  const showBadges = p.showBadges !== false;

  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        onClick={() => toggleAccordion('productCard')}
        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-right cursor-pointer transition-colors"
      >
        <span className="text-xs font-black text-slate-800 flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          <span>تخصيص بطاقات المنتجات والشبكة</span>
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3.5 space-y-3 bg-white">
          {/* Tabs header */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {TABS.map((t) => {
              const TabIcon = t.Icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TabIcon className="w-3 h-3" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: SHAPE */}
          {activeTab === 'shape' && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 block">نمط وتصميم البطاقة</span>
              <div className="grid grid-cols-1 gap-1.5">
                {SHAPES.map((s) => {
                  const isSelected = currentShape === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handlePropChange(node.id, 'shape', s.id)}
                      className={`w-full p-2.5 rounded-xl border text-right cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{s.label}</div>
                        <div className="text-[10px] text-slate-500">{s.desc}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>

              <Row label="شريط الشارات والخصم">
                <EyeToggle
                  visible={showBadges}
                  onToggle={() => handlePropChange(node.id, 'showBadges', !showBadges)}
                />
              </Row>
            </div>
          )}

          {/* TAB 2: PRICE */}
          {activeTab === 'price' && (
            <div className="space-y-2">
              <Row label="عرض السعر الأساسي">
                <EyeToggle
                  visible={showPrice}
                  onToggle={() => handlePropChange(node.id, 'showPrice', !showPrice)}
                />
              </Row>
              <Row label="عرض السعر قبل الخصم (مشطوب)">
                <EyeToggle
                  visible={showOriginalPrice}
                  onToggle={() => handlePropChange(node.id, 'showOriginalPrice', !showOriginalPrice)}
                />
              </Row>
              <Row label="شارة نسبة التوفير / الخصم %">
                <EyeToggle
                  visible={showDiscountBadge}
                  onToggle={() => handlePropChange(node.id, 'showDiscountBadge', !showDiscountBadge)}
                />
              </Row>
            </div>
          )}

          {/* TAB 3: BUTTONS */}
          {activeTab === 'buttons' && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 block">وضع زر الطلب / الإضافة للسلة</span>
              <div className="space-y-1.5">
                {BUY_MODES.map((m) => {
                  const isSelected = currentBuyMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handlePropChange(node.id, 'buyButtonMode', m.id)}
                      className={`w-full p-2 rounded-xl border text-right cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{m.label}</div>
                        <div className="text-[10px] text-slate-500">{m.desc}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  نص زر الطلب المخصص:
                </label>
                <input
                  type="text"
                  value={(p.ctaText as string) || ''}
                  onChange={(e) => handlePropChange(node.id, 'ctaText', e.target.value)}
                  placeholder="أضف للسلة / اطلب الآن"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>
          )}

          {/* TAB 4: STOCK & RATINGS */}
          {activeTab === 'stock' && (
            <div className="space-y-2">
              <Row label="تقييم النجوم (Reviews Rating)">
                <EyeToggle
                  visible={showRating}
                  onToggle={() => handlePropChange(node.id, 'showRating', !showRating)}
                />
              </Row>
              <Row label="حالة التوفر بالمخزون">
                <EyeToggle
                  visible={showStock}
                  onToggle={() => handlePropChange(node.id, 'showStockStatus', !showStock)}
                />
              </Row>
            </div>
          )}

          {/* TAB 5: GRID */}
          {activeTab === 'grid' && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 block">تقسيم الأعمدة</span>
              <Row label="الأعمدة على الشاشات الكبيرة (Desktop)">
                <select
                  value={(p.columnsDesktop as number) || 3}
                  onChange={(e) => handlePropChange(node.id, 'columnsDesktop', Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                >
                  <option value={2}>عمودين (2)</option>
                  <option value={3}>3 أعمدة (افتراضي)</option>
                  <option value={4}>4 أعمدة</option>
                </select>
              </Row>

              <Row label="الأعمدة على الجوال (Mobile)">
                <select
                  value={(p.columnsMobile as number) || 1}
                  onChange={(e) => handlePropChange(node.id, 'columnsMobile', Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                >
                  <option value={1}>عمود واحد (1)</option>
                  <option value={2}>عمودين (2)</option>
                </select>
              </Row>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
