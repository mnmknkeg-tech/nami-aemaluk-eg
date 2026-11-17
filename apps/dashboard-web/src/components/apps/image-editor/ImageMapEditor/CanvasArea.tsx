import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

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
      isSelected
        ? 'bg-cyan-500 border-white scale-110 shadow-lg z-10'
        : 'bg-white/20 border-white/70 hover:bg-white/40'
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

const MIN_ZOOM = 1; // 1 = ملاءمة المساحة بالكامل (fit)
const MAX_ZOOM = 5;
const WHEEL_STEP = 1.15;
const STAGE_PADDING = 24; // نفس p-3 القديم حول الصورة

/**
 * مساحة العمل: تعرض صورة الخريطة دائمًا ملائمة للمساحة، وكل ما تكبر الصورة
 * عن المساحة (عريضة/طويلة) يتاح زوم بالعجلة أو الأزرار وتحريك يدوي بالسحب
 * مع تقييد الحدود حتى لا تخرج الصورة من الإطار. الهوتسبوتس نسب مئوية داخل
 * صندوق الصورة نفسه، فتتحرك وتتدرج مع الصورة تلقائيًا.
 */
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
  fileInputRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [viewport, setViewport] = useState({ cw: 0, ch: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ px: number; py: number; panX: number; panY: number; moved: boolean } | null>(null);
  // علم منفصل يبقى متاحًا عند صدور الـ click (dragRef يتصفّر عند pointerup)
  const didDragRef = useRef(false);

  // قياس المساحة المتاحة (إعادة الحساب عند تغيّر حجم النافذة/اللوحة)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setViewport({ cw: r.width, ch: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // تصفير الحالة عند تغيّر الصورة
  useEffect(() => {
    setNatural(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }, [mapImageUrl]);

  // scale الأساس: ملاءمة كاملة داخل المساحة (بدون تكبير فوق الحجم الطبيعي)
  const baseScale = natural && viewport.cw > 0 && viewport.ch > 0
    ? Math.min(
        Math.max((viewport.cw - STAGE_PADDING) / natural.w, 0.01),
        Math.max((viewport.ch - STAGE_PADDING) / natural.h, 0.01),
        1
      )
    : null;
  const displayW = natural && baseScale ? Math.round(natural.w * baseScale * zoom) : null;
  const displayH = natural && baseScale ? Math.round(natural.h * baseScale * zoom) : null;

  // تقييد الإزاحة: الصورة لا تخرج من الإطار مهما كان الزوم
  const clampPan = useCallback(
    (p: { x: number; y: number }, z: number) => {
      if (!natural || viewport.cw <= 0 || viewport.ch <= 0 || !baseScale) return { x: 0, y: 0 };
      const maxX = Math.max(0, (natural.w * baseScale * z - viewport.cw) / 2);
      const maxY = Math.max(0, (natural.h * baseScale * z - viewport.ch) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, p.x)),
        y: Math.max(-maxY, Math.min(maxY, p.y)),
      };
    },
    [natural, viewport, baseScale]
  );

  // إعادة التقييد عند تغيّر الزوم أو حجم المساحة
  useEffect(() => {
    setPan((prev) => clampPan(prev, zoom));
  }, [zoom, clampPan]);

  // زوم بعجلة الفأرة داخل المساحة فقط
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mapImageUrl) return;
    const onWheel = (e: WheelEvent) => {
      if (!natural) return;
      e.preventDefault();
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * (e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [mapImageUrl, natural]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    didDragRef.current = false;
    dragRef.current = { px: e.clientX, py: e.clientY, panX: pan.x, panY: pan.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.px;
      const dy = e.clientY - d.py;
      if (!d.moved && Math.hypot(dx, dy) < 4) return; // تحت عتبة السحب — نقرة عادية
      if (!d.moved) {
        d.moved = true;
        didDragRef.current = true;
        setDragging(true);
      }
      setPan(clampPan({ x: d.panX + dx, y: d.panY + dy }, zoom));
    },
    [clampPan, zoom]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer capture قد تكون أفلتت بالفعل */
    }
  }, []);

  // السحب يلغي إضافة الهوتسبوت (نقرة بعد سحب = تحريك وليس تحديد نقطة)
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  const canPan = displayW != null && displayH != null && (displayW > viewport.cw + 1 || displayH > viewport.ch + 1);

  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);

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
    <div
      ref={containerRef}
      className="relative bg-black overflow-hidden select-none"
      style={{
        contentVisibility: 'auto',
        touchAction: 'none',
        cursor: addingMode ? 'crosshair' : canPan ? (dragging ? 'grabbing' : 'grab') : 'default',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* صندوق الصورة — حجمه = حجم الصورة المعروضة، والهوتسبوتس بداخله */}
      <div
        ref={canvasRef}
        onClick={onCanvasClick}
        onClickCapture={onClickCapture}
        className="absolute"
        style={
          displayW != null && displayH != null
            ? {
                left: '50%',
                top: '50%',
                width: displayW,
                height: displayH,
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
              }
            : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <img
          src={mapImageUrl}
          onLoad={onImgLoad}
          className="block w-full h-full select-none"
          style={{ visibility: natural ? 'visible' : 'hidden' }}
          alt="Map"
          loading="eager"
          decoding="async"
          draggable={false}
        />

        {natural &&
          hotspots.map((h) => (
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

      {/* أدوات الزوم */}
      {natural && (
        <div
          className="absolute bottom-3 left-3 z-20 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur px-1.5 py-1"
          dir="ltr"
        >
          <button
            type="button"
            title="تصغير"
            className="w-8 h-8 rounded-full text-white hover:bg-white/20 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={zoom <= MIN_ZOOM + 0.001}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / WHEEL_STEP))}
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-white text-[11px] font-bold tabular-nums min-w-[42px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            title="تكبير"
            className="w-8 h-8 rounded-full text-white hover:bg-white/20 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={zoom >= MAX_ZOOM - 0.001}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * WHEEL_STEP))}
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            title="إعادة ملاءمة المساحة"
            className="w-8 h-8 rounded-full text-white hover:bg-white/20 flex items-center justify-center"
            onClick={() => {
              setZoom(MIN_ZOOM);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      )}

      {/* تلميح التحريك اليدوي */}
      {natural && canPan && !addingMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="rounded-full bg-black/70 backdrop-blur text-white text-[11px] font-bold px-3 py-1.5">
            اسحب بالفأرة لتحريك الصورة — العجلة للتكبير
          </span>
        </div>
      )}
    </div>
  );
};

export default memo(CanvasArea);
