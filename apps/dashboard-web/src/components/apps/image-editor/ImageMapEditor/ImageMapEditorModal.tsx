'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Loader2,
  Sparkles,
  Trash2,
  Save,
  RefreshCw,
  Link2,
  Unlink,
  Wand2,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import {
  ImageMapApi,
  type Hotspot,
  type ImageMap,
  type ImageMapSection,
} from '@/lib/api/imageMaps';
import { compressForUpload } from '@/lib/upload-image';
import CanvasArea from './CanvasArea';
import Sidebar from './Sidebar';

interface ImageMapEditorModalProps {
  open: boolean;
  onClose: () => void;
  shopId: string;
  products: any[];
  /** Optional callback fired after hotspots are saved/synced. */
  onSave?: (hotspots: Hotspot[]) => void;
  /** Optional callback fired after products are synced (so parent can refetch). */
  onProductsSynced?: () => void;
}

const normalizeText = (v: any) => String(v ?? '').trim();
const normalizeNumber = (v: any, fallback: number) => {
  const n = typeof v === 'number' ? v : v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

/** Normalize hotspots coming from the backend into the local working shape. */
const normalizeHotspotsFromMap = (map: ImageMap | null): Hotspot[] => {
  if (!map) return [];
  const raw = Array.isArray((map as any).hotspots) ? (map as any).hotspots : [];
  return raw.map((h: any) => ({
    id: normalizeText(h?.id) || genId('hotspot'),
    x: normalizeNumber(h?.x, 50),
    y: normalizeNumber(h?.y, 50),
    label: normalizeText(h?.label) || '',
    productId: normalizeText(h?.productId ?? h?.product_id ?? h?.product?.id) || null,
    priceOverride:
      typeof h?.priceOverride === 'number'
        ? h.priceOverride
        : typeof h?.price_override === 'number'
          ? h.price_override
          : null,
    sortOrder:
      typeof h?.sortOrder === 'number'
        ? h.sortOrder
        : typeof h?.sort_order === 'number'
          ? h.sort_order
          : 0,
    sectionId: normalizeText(h?.sectionId ?? h?.section_id) || null,
    width:
      typeof h?.width === 'number'
        ? h.width
        : typeof h?.width === 'string'
          ? Number(h.width)
          : null,
    height:
      typeof h?.height === 'number'
        ? h.height
        : typeof h?.height === 'string'
          ? Number(h.height)
          : null,
    aiMeta: h?.aiMeta ?? h?.ai_meta ?? null,
  }));
};

const normalizeSectionsFromMap = (map: ImageMap | null): ImageMapSection[] => {
  if (!map) return [];
  const raw = Array.isArray((map as any).sections) ? (map as any).sections : [];
  return raw.map((s: any, idx: number) => ({
    id: normalizeText(s?.id) || genId('section'),
    name: normalizeText(s?.name) || `قسم ${idx + 1}`,
    sortOrder:
      typeof s?.sortOrder === 'number'
        ? s.sortOrder
        : typeof s?.sort_order === 'number'
          ? s.sort_order
          : idx,
    imageUrl: normalizeText(s?.imageUrl ?? s?.image_url) || null,
  }));
};

export default function ImageMapEditorModal({
  open,
  onClose,
  shopId,
  products,
  onSave,
  onProductsSynced,
}: ImageMapEditorModalProps) {
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [maps, setMaps] = useState<ImageMap[]>([]);
  const [activeMap, setActiveMap] = useState<ImageMap | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [sections, setSections] = useState<ImageMapSection[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [addingMode, setAddingMode] = useState(false);

  // Product editing state (inline edit of linked product's name/price/stock)
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productEditName, setProductEditName] = useState('');
  const [productEditPrice, setProductEditPrice] = useState('');
  const [productEditStock, setProductEditStock] = useState('');
  const [productSaving, setProductSaving] = useState(false);

  // Linked products management view
  const [showLinkedView, setShowLinkedView] = useState(false);
  const [linkedRows, setLinkedRows] = useState<
    Array<{
      key: string;
      name: string;
      price: number;
      stock: number;
      productId: string | null;
      linked: boolean;
    }>
  >([]);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Load maps on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (open && shopId) {
      loadMaps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shopId]);

  const loadMaps = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await ImageMapApi.listForManage(shopId);
      setMaps(list);
      if (list.length > 0) {
        const active = list.find((m) => m.isActive || m.is_active) || list[0];
        setActiveMap(active);
        setHotspots(normalizeHotspotsFromMap(active));
        setSections(normalizeSectionsFromMap(active));
      } else {
        setActiveMap(null);
        setHotspots([]);
        setSections([]);
      }
    } catch (e: any) {
      setError(String(e?.message || 'فشل تحميل الخرائط'));
    } finally {
      setLoading(false);
    }
  };

  // ─── Selection → load linked product ─────────────────────────────────────
  const selected = hotspots.find((h) => h.id === selectedId) || null;

  useEffect(() => {
    if (selected?.productId) {
      const product = (products || []).find((p) => p.id === selected.productId);
      setSelectedProduct(product || null);
      if (product) {
        setProductEditName(String(product.name || ''));
        setProductEditPrice(String(product.price ?? ''));
        setProductEditStock(String(product.stock ?? ''));
      }
    } else {
      setSelectedProduct(null);
      setProductEditName('');
      setProductEditPrice('');
      setProductEditStock('');
    }
  }, [selected, products]);

  // ─── Canvas interactions ─────────────────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!addingMode || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const newHotspot: Hotspot = {
        id: genId('hotspot'),
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        label: '',
        productId: null,
        priceOverride: null,
        sortOrder: hotspots.length,
        sectionId: null,
        width: null,
        height: null,
        aiMeta: null,
      };
      setHotspots((prev) => [...prev, newHotspot]);
      setSelectedId(newHotspot.id as string);
      setAddingMode(false);
    },
    [addingMode, hotspots.length]
  );

  const handleHotspotClick = useCallback((id: string) => {
    setSelectedId(id);
    setAddingMode(false);
  }, []);

  const updateSelected = useCallback(
    (patch: Partial<Hotspot>) => {
      if (!selected?.id) return;
      setHotspots((prev) => prev.map((h) => (h.id === selected.id ? { ...h, ...patch } : h)));
    },
    [selected]
  );

  // ─── Image upload → create a new map via backend ─────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setImageUploading(true);
    setError('');
    try {
      // Re-encode only — map hotspots are percentage-based, but keep near-original
      // resolution so analysis precision is unaffected.
      const toUpload = await compressForUpload(file, 'map');
      const { url } = await ImageMapApi.uploadMedia(toUpload, shopId);
      if (!url) throw new Error('لم يتم استرجاع رابط الصورة من الخادم');

      // Create a new map record on the backend
      const created = await ImageMapApi.create(shopId, {
        imageUrl: url,
        title: `خريطة ${maps.length + 1}`,
        isActive: maps.length === 0, // auto-activate if first map
        hotspots: [],
        sections: [],
      });

      const updatedMaps = [...maps, created as ImageMap];
      setMaps(updatedMaps);
      setActiveMap(created as ImageMap);
      setHotspots([]);
      setSections([]);

      // Auto-activate if it's the first map (backend may have already done it)
      if (maps.length === 0 && created?.id) {
        try {
          await ImageMapApi.activate(shopId, created.id);
          setMaps((prev) => prev.map((m) => ({ ...m, isActive: m.id === created.id })));
        } catch {
          /* activation is best-effort */
        }
      }
    } catch (err: any) {
      // Fallback: local object URL preview (offline / no backend)
      const previewUrl = URL.createObjectURL(file);
      const localMap: ImageMap = {
        id: genId('map'),
        imageUrl: previewUrl,
        isActive: maps.length === 0,
        hotspots: [],
        sections: [],
      };
      setMaps((prev) => [...prev, localMap]);
      setActiveMap(localMap);
      setHotspots([]);
      setSections([]);
      setError(String(err?.message || 'تعذّر الرفع على الخادم — تم استخدام معاينة محلية مؤقتة'));
    } finally {
      setImageUploading(false);
    }
  };

  // ─── AI analysis: detect hotspots from the active image ──────────────────
  const handleAnalyze = async () => {
    if (!activeMap) return;
    const imageUrl = activeMap.imageUrl || activeMap.image_url;
    if (!imageUrl) {
      setError('لا توجد صورة لتحليلها');
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const result = await ImageMapApi.analyze(shopId, {
        imageUrl,
        language: 'ar',
      });
      const detected: Hotspot[] = Array.isArray(result?.hotspots)
        ? result.hotspots.map((h: any, idx: number) => ({
            id: genId('hotspot'),
            x: normalizeNumber(h?.x, 50),
            y: normalizeNumber(h?.y, 50),
            label: normalizeText(h?.label) || '',
            productId: null,
            priceOverride: null,
            sortOrder: hotspots.length + idx,
            sectionId: null,
            width: typeof h?.width === 'number' ? h.width : null,
            height: typeof h?.height === 'number' ? h.height : null,
            aiMeta: h?.aiMeta ?? h ?? null,
          }))
        : [];
      if (detected.length === 0) {
        setError('لم يتم اكتشاف أي منتجات في الصورة');
      } else {
        setHotspots((prev) => [...prev, ...detected]);
        setSuccessMsg(`تم اكتشاف ${detected.length} منتج بواسطة الذكاء الاصطناعي`);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (e: any) {
      setError(String(e?.message || 'فشل تحليل الصورة بالذكاء الاصطناعي'));
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Save layout to backend ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!activeMap?.id) {
      setError('لا توجد خريطة نشطة لحفظها');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const imageUrl = activeMap.imageUrl || activeMap.image_url || '';
      await ImageMapApi.saveLayout(shopId, activeMap.id, {
        imageUrl,
        title: activeMap.title || 'خريطة',
        sections,
        hotspots: hotspots.map(({ id, ...rest }) => rest), // strip local-only id
      });

      // Notify other tabs/windows (e.g. storefront preview) that the map changed
      try {
        window.dispatchEvent(new CustomEvent('ray-image-map:refresh', { detail: { shopId } }));
      } catch {}
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('ray-image-map');
          bc.postMessage({ shopId });
          bc.close();
        }
      } catch {}

      setSuccessMsg('تم حفظ الخريطة بنجاح');
      setTimeout(() => setSuccessMsg(''), 2500);
      if (onSave) onSave(hotspots);
    } catch (e: any) {
      setError(String(e?.message || 'فشل حفظ الخريطة'));
    } finally {
      setSaving(false);
    }
  };

  // ─── Inline product save (PATCH /products/:id) ───────────────────────────
  const saveLinkedProduct = async () => {
    if (!selectedProduct?.id) return;
    setProductSaving(true);
    try {
      await apiRequest(`/products/${selectedProduct.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: productEditName,
          price: Number(productEditPrice),
          stock: Number(productEditStock),
        }),
      });
      setSuccessMsg('تم تحديث بيانات المنتج');
      setTimeout(() => setSuccessMsg(''), 2000);
      if (onProductsSynced) onProductsSynced();
    } catch (e: any) {
      setError(String(e?.message || 'فشل تحديث المنتج'));
    } finally {
      setProductSaving(false);
    }
  };

  // ─── Bulk sync: upsert products from hotspots ────────────────────────────
  const handleSyncProducts = async () => {
    if (!activeMap?.id) {
      setError('لا توجد خريطة نشطة');
      return;
    }
    const items = hotspots
      .map((h) => {
        const name = normalizeText(h?.label);
        const price =
          typeof h?.priceOverride === 'number' && h.priceOverride !== null
            ? h.priceOverride
            : normalizeNumber((products || []).find((p) => p.id === h.productId)?.price, NaN);
        return {
          name,
          price,
          stock: normalizeNumber((products || []).find((p) => p.id === h.productId)?.stock, 0),
          category: '__IMAGE_MAP__',
          productId: normalizeText(h?.productId) || undefined,
          description: null,
        };
      })
      .filter((r) => r.name && Number.isFinite(r.price) && r.price >= 0);

    if (items.length === 0) {
      setError('لا توجد منتجات صالحة للمزامنة — تأكد من إدخال الأسماء والأسعار');
      return;
    }

    setSyncing(true);
    setError('');
    try {
      const res = await ImageMapApi.importDrafts(shopId, items, 'image_map');
      const created = Array.isArray(res?.created) ? res.created : [];
      const updated = Array.isArray(res?.updated) ? res.updated : [];
      const nameToId = new Map<string, string>();
      for (const p of [...created, ...updated]) {
        const id = normalizeText(p?.id);
        const name = normalizeText(p?.name);
        if (id && name) nameToId.set(name, id);
      }

      // Re-link hotspots to the newly created/updated product IDs
      const nextHotspots = hotspots.map((h) => {
        const label = normalizeText(h?.label);
        const mapped = label ? nameToId.get(label) : undefined;
        const prevPid = normalizeText(h?.productId) || null;
        const prevProduct = (products || []).find((p) => p.id === prevPid);
        const prevCategory = normalizeText(prevProduct?.category);
        const canKeepPrev =
          prevPid &&
          (prevCategory === '__IMAGE_MAP__' || prevCategory.toUpperCase().includes('IMAGE_MAP'));
        const productId = mapped || (canKeepPrev ? prevPid : null);
        return { ...h, productId: productId || null };
      });
      setHotspots(nextHotspots);

      // Persist the re-linked layout
      const imageUrl = activeMap.imageUrl || activeMap.image_url || '';
      await ImageMapApi.saveLayout(shopId, activeMap.id, {
        imageUrl,
        title: activeMap.title || 'خريطة',
        sections,
        hotspots: nextHotspots.map(({ id, ...rest }) => rest),
      });

      try {
        window.dispatchEvent(new CustomEvent('ray-image-map:refresh', { detail: { shopId } }));
      } catch {}
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('ray-image-map');
          bc.postMessage({ shopId });
          bc.close();
        }
      } catch {}

      setSuccessMsg(
        `تمت مزامنة ${created.length + updated.length} منتج (جديد: ${created.length}، محدّث: ${updated.length})`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
      if (onProductsSynced) onProductsSynced();
    } catch (e: any) {
      setError(String(e?.message || 'فشلت مزامنة المنتجات'));
    } finally {
      setSyncing(false);
    }
  };

  // ─── Linked products management view ─────────────────────────────────────
  const loadLinkedRows = useCallback(() => {
    const idx = new Map<string, any>();
    (products || []).forEach((p: any) => {
      const id = normalizeText(p?.id);
      if (id) idx.set(id, p);
    });
    const rows = hotspots
      .map((h) => {
        const name = normalizeText(h?.label);
        if (!name) return null;
        const productId = normalizeText(h?.productId) || null;
        const linkedProduct = productId ? idx.get(productId) : null;
        const price =
          typeof h?.priceOverride === 'number' && h.priceOverride !== null
            ? h.priceOverride
            : normalizeNumber(linkedProduct?.price, 0);
        const stock = normalizeNumber(linkedProduct?.stock, 0);
        return {
          key: h.id || `${name}:${Math.random()}`,
          name,
          price,
          stock,
          productId,
          linked: Boolean(productId),
        };
      })
      .filter(Boolean) as Array<{
      key: string;
      name: string;
      price: number;
      stock: number;
      productId: string | null;
      linked: boolean;
    }>;
    rows.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    setLinkedRows(rows);
  }, [hotspots, products]);

  const updateRowStock = (key: string, value: any) => {
    const raw = typeof value === 'number' ? value : value == null ? NaN : Number(value);
    const nextStock = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    setLinkedRows((prev) => prev.map((r) => (r.key === key ? { ...r, stock: nextStock } : r)));
  };

  const applyStockEdits = async () => {
    const updates = linkedRows
      .filter((r) => r.productId)
      .map((r) => ({ id: r.productId as string, stock: r.stock }));
    if (updates.length === 0) {
      setError('لا توجد منتجات مرتبطة لتحديث مخزونها');
      return;
    }
    setSyncing(true);
    setError('');
    try {
      await Promise.all(
        updates.map((u) =>
          apiRequest(`/products/${u.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ stock: u.stock }),
          })
        )
      );
      setSuccessMsg(`تم تحديث مخزون ${updates.length} منتج`);
      setTimeout(() => setSuccessMsg(''), 2500);
      if (onProductsSynced) onProductsSynced();
    } catch (e: any) {
      setError(String(e?.message || 'فشل تحديث المخزون'));
    } finally {
      setSyncing(false);
    }
  };

  // ─── Sections helpers ────────────────────────────────────────────────────
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: genId('section'),
        name: `قسم ${prev.length + 1}`,
        sortOrder: prev.length,
        imageUrl: null,
      },
    ]);
  };

  const updateSection = (id: string, patch: Partial<ImageMapSection>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setHotspots((prev) => prev.map((h) => (h.sectionId === id ? { ...h, sectionId: null } : h)));
  };

  // ─── Active map switcher ─────────────────────────────────────────────────
  const switchMap = async (mapId: string) => {
    const m = maps.find((x) => x.id === mapId) || null;
    setActiveMap(m);
    setHotspots(normalizeHotspotsFromMap(m));
    setSections(normalizeSectionsFromMap(m));
    setSelectedId('');
    setAddingMode(false);
    if (m?.id && !(m.isActive || m.is_active)) {
      try {
        await ImageMapApi.activate(shopId, m.id);
        setMaps((prev) => prev.map((x) => ({ ...x, isActive: x.id === m.id })));
      } catch {
        /* best-effort */
      }
    }
  };

  const productOptions = useMemo(() => products || [], [products]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[600]" dir="rtl">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div className="w-full h-full sm:h-[95vh] bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-row-reverse gap-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900">
              محرر خريطة الصور
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAddingMode(!addingMode)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  addingMode
                    ? 'bg-cyan-500 text-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                type="button"
              >
                <Plus size={16} />
                {addingMode ? 'إلغاء الإضافة' : 'إضافة نقطة'}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !activeMap}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-purple-500 text-white font-bold text-xs sm:text-sm hover:bg-purple-600 transition-all disabled:opacity-50"
                type="button"
                title="تحليل الصورة بالذكاء الاصطناعي لاكتشاف المنتجات"
              >
                {analyzing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                تحليل AI
              </button>
              <button
                onClick={() => {
                  setShowLinkedView(true);
                  loadLinkedRows();
                }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-200 transition-all"
                type="button"
              >
                <Link2 size={16} />
                المنتجات المرتبطة
              </button>
              <button
                onClick={handleSyncProducts}
                disabled={syncing || !activeMap}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs sm:text-sm hover:bg-emerald-600 transition-all disabled:opacity-50"
                type="button"
                title="إنشاء/تحديث المنتجات من النقاط الموجودة على الخريطة"
              >
                {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                مزامنة المنتجات
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !activeMap}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-black transition-all disabled:opacity-50"
                type="button"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                حفظ
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 transition-all"
                type="button"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Error / Success banners */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-700 text-xs font-bold text-right">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-xs font-bold text-right">
              {successMsg}
            </div>
          )}

          {/* Content */}
          {showLinkedView ? (
            <div className="flex-1 overflow-auto p-4 sm:p-6" dir="rtl">
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black">المنتجات المرتبطة بالخريطة</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={applyStockEdits}
                    disabled={syncing}
                    className="px-4 py-2 rounded-xl bg-[#00E5FF] text-black font-black text-xs disabled:opacity-50"
                    type="button"
                  >
                    {syncing ? <Loader2 size={14} className="animate-spin inline" /> : null}
                    حفظ المخزون المعدّل
                  </button>
                  <button
                    onClick={() => setShowLinkedView(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 font-black text-xs"
                    type="button"
                  >
                    رجوع للمحرر
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-500">
                  <div className="col-span-5 text-right">الاسم</div>
                  <div className="col-span-3 text-right">السعر</div>
                  <div className="col-span-2 text-right">المخزون</div>
                  <div className="col-span-2 text-right">الحالة</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {linkedRows.map((r) => (
                    <div key={r.key} className="grid grid-cols-12 px-4 py-3 text-sm items-center">
                      <div className="col-span-5 text-right font-black text-slate-900 truncate">
                        {r.name}
                      </div>
                      <div className="col-span-3 font-black text-right text-slate-700">
                        {r.price} ج.م
                      </div>
                      <div className="col-span-2 text-right">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={
                            Number.isFinite(Number(r.stock))
                              ? String(Math.max(0, Math.floor(Number(r.stock))))
                              : '0'
                          }
                          onChange={(e) => updateRowStock(r.key, e.target.value)}
                          className="w-full max-w-[120px] bg-white border border-slate-200 rounded-xl py-2 px-3 font-black text-right outline-none focus:border-[#00E5FF]/60"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black ${
                            r.linked ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {r.linked ? 'مرتبط' : 'غير مرتبط'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {linkedRows.length === 0 && (
                    <div className="p-6 text-center text-slate-400 font-black">
                      لا توجد منتجات على الخريطة بعد
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Canvas Area */}
              <div className="flex-1 bg-slate-900 min-h-[300px]">
                <CanvasArea
                  mapImageUrl={activeMap?.imageUrl || activeMap?.image_url || ''}
                  hotspots={hotspots}
                  selectedId={selectedId}
                  addingMode={addingMode}
                  loading={loading}
                  imageUploading={imageUploading}
                  onCanvasClick={handleCanvasClick}
                  onHotspotClick={handleHotspotClick}
                  canvasRef={canvasRef}
                  fileInputRef={fileInputRef}
                />
              </div>

              {/* Sidebar */}
              <div className="w-full lg:w-80 shrink-0 max-h-[50vh] lg:max-h-none overflow-y-auto">
                <Sidebar
                  selected={selected}
                  selectedProduct={selectedProduct}
                  productEditName={productEditName}
                  setProductEditName={setProductEditName}
                  productEditPrice={productEditPrice}
                  setProductEditPrice={setProductEditPrice}
                  productEditStock={productEditStock}
                  setProductEditStock={setProductEditStock}
                  productSaving={productSaving}
                  saveLinkedProduct={saveLinkedProduct}
                  updateSelected={updateSelected}
                  productOptions={productOptions}
                  hotspots={hotspots}
                  setHotspots={setHotspots}
                  setSelectedId={setSelectedId}
                  activeMap={activeMap}
                  maps={maps}
                  setActiveMap={(m) => m?.id && switchMap(m.id)}
                  normalizeHotspotsFromMap={normalizeHotspotsFromMap}
                  setAddingMode={setAddingMode}
                  fileInputRef={fileInputRef}
                  // Sections support
                  sections={sections}
                  addSection={addSection}
                  updateSection={updateSection}
                  removeSection={removeSection}
                />
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
