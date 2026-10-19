import React from 'react';
import { Layers, Image as ImageIcon, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import type { InspectorPanelProps } from './types';

type SubItemsSectionProps = Pick<
  InspectorPanelProps,
  | 'website'
  | 'isHero'
  | 'isVehicles'
  | 'isBento'
  | 'heroStatsNode'
  | 'vehicleCards'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handlePropChange'
  | 'selectNode'
  | 'setActiveGalleryTarget'
  | 'setShowPresetGallery'
>;

export const SubItemsSection: React.FC<SubItemsSectionProps> = ({
  website,
  isHero,
  isVehicles,
  isBento,
  heroStatsNode,
  vehicleCards,
  expandedSections,
  toggleAccordion,
  handlePropChange,
  selectNode,
  setActiveGalleryTarget,
  setShowPresetGallery,
}) => {
  if (!isVehicles && !isBento && !isHero) return null;

  return (
    <div className="p-3">
      <button
        onClick={() => toggleAccordion('subitems')}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>
            {isVehicles
              ? 'أسطول المركبات والسيارات'
              : isHero
              ? 'أرقام وإحصائيات الهيرو'
              : 'بطاقات ومزايا القسم'}
          </span>
        </div>
        {expandedSections.subitems ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {expandedSections.subitems && (
        <div className="space-y-3 pt-2.5">
          {/* VEHICLES CARDS LIST */}
          {isVehicles && vehicleCards.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 block">قائمة السيارات المتاحة بالمعرض:</span>
              {vehicleCards.map((vCard, vIdx) => {
                const isCardHidden = Boolean(vCard.isHidden || vCard.props?.hidden);

                return (
                  <div
                    key={vCard.id}
                    className={`p-2.5 border rounded-xl space-y-2 transition-all ${
                      isCardHidden
                        ? 'bg-amber-50/50 border-amber-200 opacity-75'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={vCard.props.image} alt="" className="w-10 h-7 rounded object-cover border border-slate-200 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">{vCard.props.title || `سيارة #${vIdx + 1}`}</span>
                        {isCardHidden && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                            مخفية
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePropChange(vCard.id, 'hidden', !isCardHidden)}
                          title={isCardHidden ? 'إظهار السيارة' : 'إخفاء السيارة'}
                          className={`p-1 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                            isCardHidden
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isCardHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => selectNode(vCard.id)}
                          className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          تعديل مباشر
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={vCard.props.title || ''}
                        onChange={(e) => handlePropChange(vCard.id, 'title', e.target.value)}
                        placeholder="اسم السيارة"
                        className="bg-white border border-slate-200 rounded p-1 text-[11px] font-semibold"
                      />
                      <input
                        type="text"
                        value={vCard.props.price || ''}
                        onChange={(e) => handlePropChange(vCard.id, 'price', e.target.value)}
                        placeholder="السعر"
                        className="bg-white border border-slate-200 rounded p-1 text-[11px] font-bold text-blue-700"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          setActiveGalleryTarget(vCard.id);
                          setShowPresetGallery(true);
                        }}
                        className="flex-1 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ImageIcon className="w-3 h-3 text-blue-600" />
                        <span>تغيير صورة السيارة</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* HERO STATS ITEMS */}
          {isHero && heroStatsNode && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 block">إحصائيات الثقة بالهيرو:</span>
              {heroStatsNode.childrenIds?.map((statId) => {
                const statNode = website.components[statId];
                if (!statNode) return null;
                const isStatHidden = Boolean(statNode.isHidden || statNode.props?.hidden);

                return (
                  <div
                    key={statId}
                    className={`p-2 border rounded-lg space-y-1.5 transition-all ${
                      isStatHidden
                        ? 'bg-amber-50/50 border-amber-200 opacity-75'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-0.5">
                      <span className="text-[10px] font-bold text-slate-700">
                        عنصر إحصائية {isStatHidden && <span className="text-amber-700">(مخفي)</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePropChange(statNode.id, 'hidden', !isStatHidden)}
                        title={isStatHidden ? 'إظهار الإحصائية' : 'إخفاء الإحصائية'}
                        className={`p-1 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                          isStatHidden
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isStatHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{isStatHidden ? 'مخفي' : 'ظاهر'}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 block">الرقم / النسبة</label>
                        <input
                          type="text"
                          value={statNode.props.value || '+500'}
                          onChange={(e) => handlePropChange(statNode.id, 'value', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-xs font-black font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block">الوصف</label>
                        <input
                          type="text"
                          value={statNode.props.label || 'سيارة فاخرة'}
                          onChange={(e) => handlePropChange(statNode.id, 'label', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-xs font-semibold text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
