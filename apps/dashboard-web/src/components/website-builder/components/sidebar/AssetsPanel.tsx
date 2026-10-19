import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Search,
  Check,
  Copy,
  Trash2,
  Filter,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';

export const AssetsPanel: React.FC = () => {
  const { assets, uploadMockAsset, selectedNodeId, updateNodeProps } = useBuilder();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const stockPresets = [
    {
      id: 'stock_car_1',
      fileName: 'mercedes_amg_gt.jpg',
      url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
      category: 'automotive',
      tags: ['سيارات', 'مرسيدس', 'فخامة'],
      sizeBytes: 420000,
      usageCount: 4,
      altText: 'مرسيدس AMG GT فاخرة',
    },
    {
      id: 'stock_car_2',
      fileName: 'porsche_911_dark.jpg',
      url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
      category: 'automotive',
      tags: ['سيارات', 'بورش', 'رياضية'],
      sizeBytes: 512000,
      usageCount: 2,
      altText: 'بورش 911 رياضية فارهة',
    },
    {
      id: 'stock_realestate_1',
      fileName: 'luxury_villa_facade.jpg',
      url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      category: 'real_estate',
      tags: ['عقارات', 'فيلا', 'معمار'],
      sizeBytes: 680000,
      usageCount: 3,
      altText: 'فيلا سكنية فاخرة بتصميم عصري',
    },
    {
      id: 'stock_tech_1',
      fileName: 'modern_office_tech.jpg',
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      category: 'tech',
      tags: ['تقنية', 'مكتب', 'أعمال'],
      sizeBytes: 390000,
      usageCount: 1,
      altText: 'بيئة عمل تقنية وعصرية',
    },
  ];

  const allAssets = [...assets, ...stockPresets];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMockAsset(file);
    }
  };

  const applyToSelectedNode = (url: string, alt: string) => {
    if (selectedNodeId) {
      updateNodeProps(selectedNodeId, { src: url, image: url, alt });
      setSelectedAsset(url);
    }
  };

  const copyUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredAssets = allAssets.filter((a) => {
    const matchesSearch =
      a.fileName.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t) => t.includes(search)) ||
      a.altText?.includes(search);
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'automotive' && (a.tags.includes('سيارات') || a.tags.includes('automotive'))) ||
      (selectedCategory === 'real_estate' && (a.tags.includes('عقارات') || a.tags.includes('real_estate'))) ||
      (selectedCategory === 'tech' && (a.tags.includes('تقنية') || a.tags.includes('tech')));
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-3 space-y-3.5">
      {/* Title & Upload Button */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">مكتبة الوسائط والملفات</span>
        </div>
        <label className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
          <Upload className="w-3.5 h-3.5" />
          <span>رفع وسائط</span>
          <input type="file" onChange={handleFileUpload} accept="image/*" className="hidden" />
        </label>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="بحث في الصور والوسائط..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs outline-hidden focus:border-blue-500"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-semibold text-slate-600 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer ${
            selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200'
          }`}
        >
          الكل ({allAssets.length})
        </button>
        <button
          onClick={() => setSelectedCategory('automotive')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer ${
            selectedCategory === 'automotive' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200'
          }`}
        >
          سيارات
        </button>
        <button
          onClick={() => setSelectedCategory('real_estate')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer ${
            selectedCategory === 'real_estate' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200'
          }`}
        >
          عقارات
        </button>
        <button
          onClick={() => setSelectedCategory('tech')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer ${
            selectedCategory === 'tech' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200'
          }`}
        >
          أعمال وتقنية
        </button>
      </div>

      {/* Helper notice */}
      {selectedNodeId ? (
        <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg text-[11px] text-blue-800 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>انقر على أي صورة لتطبيقها مباشرة على العنصر المحدد.</span>
        </div>
      ) : (
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
          حدد عنصراً في مساحة العمل لربط الصور به بنقرة واحدة.
        </div>
      )}

      {/* Assets Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-310px)] overflow-y-auto pr-0.5">
        {filteredAssets.map((asset) => (
          <div
            key={asset.id}
            onClick={() => applyToSelectedNode(asset.url, asset.altText)}
            className="group relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-xs transition-all flex flex-col"
          >
            <div className="h-24 w-full overflow-hidden bg-slate-200 relative">
              <img
                src={asset.url}
                alt={asset.altText}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Overlay button on hover */}
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  onClick={(e) => copyUrl(asset.url, e)}
                  title="نسخ رابط الصورة"
                  className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white transition-colors cursor-pointer"
                >
                  {copiedUrl === asset.url ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="p-2 text-right">
              <span className="text-[11px] font-bold text-slate-800 block truncate" title={asset.fileName}>
                {asset.fileName}
              </span>
              <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                <span>{Math.round(asset.sizeBytes / 1024)} KB</span>
                <span className="bg-slate-200/80 px-1 py-0.2 rounded text-slate-700 font-medium">
                  {asset.tags[0] || 'وسائط'}
                </span>
              </div>
            </div>
            {selectedAsset === asset.url && (
              <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white p-1 rounded-full shadow-xs">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

