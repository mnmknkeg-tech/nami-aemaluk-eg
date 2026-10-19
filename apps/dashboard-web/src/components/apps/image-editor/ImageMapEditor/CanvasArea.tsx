import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

interface HotspotMarkerProps {
  id: string;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: (id: string) => void;
}

const HotspotMarker = memo(({ id, x, y, isSelected, onClick }: HotspotMarkerProps) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick(id);
    }}
    className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200 ${
      isSelected ? 'bg-cyan-500 border-white scale-110 shadow-lg z-10' : 'bg-white/20 border-white/70 hover:bg-white/40'
    }`}
    style={{ left: `${x}%`, top: `${y}%` }}
  />
));

interface CanvasAreaProps {
  mapImageUrl: string;
  hotspots: any[];
  selectedId: string;
  addingMode: boolean;
  loading: boolean;
  imageUploading: boolean;
  onCanvasClick: (e: React.MouseEvent) => void;
  onHotspotClick: (id: string) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  mapImageUrl,
  hotspots,
  selectedId,
  addingMode,
  loading,
  imageUploading,
  onCanvasClick,
  onHotspotClick,
  canvasRef,
  fileInputRef
}) => {
  if (loading || imageUploading) {
    return (
      <div className="relative bg-black flex items-center justify-center min-h-[400px]">
        <div className="text-white flex items-center gap-3">
          <Loader2 className="animate-spin" />
          <span>جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (!mapImageUrl) {
    return (
      <div className="relative bg-black flex items-center justify-center min-h-[400px]">
        <div className="text-white text-center space-y-4 p-8">
          <div className="font-black text-xl">لا توجد صورة خريطة بعد</div>
          <p className="text-slate-400 text-sm">ارفع صورة لإنشاء خريطة المنتجات</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-4 rounded-2xl bg-[#00E5FF] text-black font-black hover:scale-105 transition-all"
            type="button"
          >
            رفع صورة الخريطة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black flex items-center justify-center overflow-hidden" style={{ contentVisibility: 'auto' }}>
      <div
        ref={canvasRef}
        onClick={onCanvasClick}
        className={`relative w-full h-full flex items-center justify-center p-3 ${addingMode ? 'cursor-crosshair' : 'cursor-default'}`}
      >
        <img 
          src={mapImageUrl} 
          className="max-w-full max-h-full object-contain select-none" 
          alt="Map"
          loading="eager"
          decoding="async"
        />

        {hotspots.map((h) => (
          <HotspotMarker
            key={h.id}
            id={h.id}
            x={h.x}
            y={h.y}
            isSelected={selectedId === h.id}
            onClick={onHotspotClick}
          />
        ))}
      </div>
    </div>
  );
};

export default memo(CanvasArea);
