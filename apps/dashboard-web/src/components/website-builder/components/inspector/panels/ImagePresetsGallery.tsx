import React from 'react';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import type { InspectorPanelProps } from './types';

const AUTOMOTIVE_PRESET_IMAGES = [
  {
    category: 'سيارات فاخرة ورياضية',
    items: [
      {
        name: 'بورش 911 توربو S',
        url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1000&auto=format&fit=crop&q=80',
        thumb: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=200&auto=format&fit=crop&q=80',
      },
      {
        name: 'مرسيدس AMG GT كوبيه',
        url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1000&auto=format&fit=crop&q=80',
        thumb: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200&auto=format&fit=crop&q=80',
      },
      {
        name: 'رينج روفر فيلار أوتوبيوغرافي',
        url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1000&auto=format&fit=crop&q=80',
        thumb: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=200&auto=format&fit=crop&q=80',
      },
      {
        name: 'بي إم دبليو M8 غران كوبيه',
        url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1000&auto=format&fit=crop&q=80',
        thumb: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200&auto=format&fit=crop&q=80',
      },
      {
        name: 'أودي RS E-Tron كهربائية',
        url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1000&auto=format&fit=crop&q=80',
        thumb: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=200&auto=format&fit=crop&q=80',
      },
      {
        name: 'مازيراتي ليفانتي تروفيو',
        url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=1000&auto=format&fit=crop&q=80',
        thumb: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=200&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    category: 'خلفيات وصالات العرض',
    items: [
      {
        name: 'صالة عرض فاخرة بإضاءة هادئة',
        url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&auto=format&fit=crop&q=80',
        thumb: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200&auto=format&fit=crop&q=80',
      },
      {
        name: 'أستوديو سيارات سينمائي داكن',
        url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80',
        thumb: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&auto=format&fit=crop&q=80',
      },
      {
        name: 'طريق جبلي سريع وقت الغروب',
        url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&auto=format&fit=crop&q=80',
        thumb: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&auto=format&fit=crop&q=80',
      },
    ],
  },
];

interface ImagePresetsGalleryProps
  extends Pick<
    InspectorPanelProps,
    | 'node'
    | 'isHero'
    | 'heroImageNode'
    | 'activeGalleryTarget'
    | 'setShowPresetGallery'
    | 'handlePropChange'
    | 'handleStyleChange'
  > {}

export const ImagePresetsGallery: React.FC<ImagePresetsGalleryProps> = ({
  node,
  isHero,
  heroImageNode,
  activeGalleryTarget,
  setShowPresetGallery,
  handlePropChange,
  handleStyleChange,
}) => (
  <div className="p-3.5 bg-slate-900 text-white border-b border-slate-700 animate-in fade-in duration-200 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <ImageIcon className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-bold">معرض الصور الفاخرة المدمج (اختر بنقرة واحدة)</span>
      </div>
      <button
        onClick={() => setShowPresetGallery(false)}
        className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
      >
        إغلاق
      </button>
    </div>

    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {AUTOMOTIVE_PRESET_IMAGES.map((cat, idx) => (
        <div key={idx} className="space-y-1.5">
          <span className="text-[10px] font-bold text-blue-400">{cat.category}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {cat.items.map((item, itemIdx) => (
              <button
                key={itemIdx}
                onClick={() => {
                  if (isHero && heroImageNode) {
                    handlePropChange(heroImageNode.id, 'src', item.url);
                  } else if (node.type === 'image') {
                    handlePropChange(node.id, 'src', item.url);
                  } else if (node.props.image) {
                    handlePropChange(node.id, 'image', item.url);
                  } else {
                    handleStyleChange(activeGalleryTarget as any, 'backgroundImage', `url(${item.url})`);
                    handleStyleChange(activeGalleryTarget as any, 'backgroundSize', 'cover');
                    handleStyleChange(activeGalleryTarget as any, 'backgroundPosition', 'center');
                  }
                  setShowPresetGallery(false);
                }}
                className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-blue-400 transition-all text-right cursor-pointer"
              >
                <img src={item.thumb} alt={item.name} className="w-full h-14 object-cover group-hover:scale-105 transition-transform" />
                <div className="p-1 bg-slate-950/90 text-[9px] font-medium text-slate-300 truncate">
                  {item.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
