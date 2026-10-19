// Sales utility functions migrated from old React SalesChannelView.tsx

const asCleanText = (v: any) => {
  const s = typeof v === 'string' ? v : (v == null ? '' : String(v));
  const t = s.trim();
  return t ? t : '';
};

const toArabicUnitLabel = (value: string): string => {
  const unitMap: Record<string, string> = {
    'kg': 'كجم',
    'g': 'جم',
    'l': 'لتر',
    'ml': 'مل',
    'piece': 'قطعة',
    'pcs': 'قطع',
    'unit': 'وحدة',
  };
  return unitMap[value.toLowerCase()] || value;
};

const toLocalizedUnitLabel = (raw: any, isArabic: boolean) => {
  const value = asCleanText(raw);
  if (!value) return '';
  return isArabic ? toArabicUnitLabel(value) : value;
};

const formatPackLabelArabic = (input: any, fallbackUnit: any): string => {
  if (!input || typeof input !== 'object') return '';
  const qty = input?.qty;
  const unit = toLocalizedUnitLabel(input?.unit || fallbackUnit, true);
  const qtyText = typeof qty === 'number' || typeof qty === 'string' ? asCleanText(qty) : '';
  return [qtyText, unit].filter(Boolean).join(' ');
};

const formatPackLabel = (input: any, fallbackUnit: any, isArabic: boolean) => {
  if (isArabic) return asCleanText(formatPackLabelArabic(input, fallbackUnit));
  if (!input || typeof input !== 'object') return '';
  const label = asCleanText(input?.label || input?.name);
  if (label) return label;
  const qty = input?.qty;
  const qtyText = typeof qty === 'number' || typeof qty === 'string' ? asCleanText(qty) : '';
  const unit = toLocalizedUnitLabel(input?.unit || fallbackUnit, false);
  return [qtyText, unit].filter(Boolean).join(' ');
};

const formatVariantSelection = (raw: any, t?: any, isArabic = false) => {
  if (!raw || typeof raw !== 'object') return '';
  const kind = asCleanText(raw?.kind).toLowerCase();

  if (kind === 'pack') {
    const label = formatPackLabel(raw, raw?.unit, isArabic);
    const qty = raw?.qty;
    const unit = toLocalizedUnitLabel(raw?.unit, isArabic);
    const qtyText = typeof qty === 'number' || typeof qty === 'string' ? asCleanText(qty) : '';
    const fallback = [qtyText, unit].filter(Boolean).join(' ');
    return label || fallback ? `العبوة: ${label || fallback}` : '';
  }

  if (kind === 'fashion') {
    const color = asCleanText(raw?.colorName || raw?.color || raw?.colorValue);
    const size = asCleanText(raw?.size);
    const parts = [color ? `اللون: ${color}` : '', size ? `المقاس: ${size}` : ''].filter(Boolean);
    return parts.join(' - ');
  }

  const size = asCleanText(raw?.sizeLabel || raw?.sizeName || raw?.size);
  const type = asCleanText(raw?.typeLabel || raw?.typeName || raw?.type);
  const parts = [type, size].filter(Boolean);
  if (parts.length) return `الاختيار: ${parts.join(' - ')}`;

  const label = asCleanText(raw?.label || raw?.name);
  return label ? `الاختيار: ${label}` : '';
};

const formatAddons = (raw: any, t?: any) => {
  if (!raw) return '';

  const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : null);
  if (Array.isArray(list)) {
    const out = list
      .map((a: any) => {
        if (typeof a === 'string') return asCleanText(a);
        if (a && typeof a === 'object') {
          const name = asCleanText(a?.name || a?.title || a?.label);
          const qty = a?.qty ?? a?.quantity;
          const qtyText = typeof qty === 'number' || typeof qty === 'string' ? asCleanText(qty) : '';
          return qtyText && name ? `${name} × ${qtyText}` : name;
        }
        return '';
      })
      .filter(Boolean);
    return out.length ? `الإضافات: ${out.join(' + ')}` : '';
  }

  if (raw && typeof raw === 'object') {
    const labels = Object.entries(raw)
      .map(([k, v]) => {
        const key = asCleanText(k);
        if (!key) return '';
        if (v === true) return key;
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) return `${key} × ${v}`;
        const val = asCleanText(v);
        return val ? `${key}: ${val}` : '';
      })
      .filter(Boolean);
    return labels.length ? `الإضافات: ${labels.join(' + ')}` : '';
  }

  const s = asCleanText(raw);
  return s ? `الإضافات: ${s}` : '';
};

const formatAddonsCompactParts = (raw: any, t?: any): string[] => {
  if (!raw) return [];

  const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : null);
  if (Array.isArray(list)) {
    const out = list
      .map((a: any) => {
        if (typeof a === 'string') return asCleanText(a);
        if (!a || typeof a !== 'object') return '';

        const name = asCleanText(a?.optionName || a?.name || a?.title || a?.label);
        const size = asCleanText(a?.variantLabel || a?.variant || a?.size || a?.sizeLabel || a?.sizeName);
        const priceRaw = typeof a?.price === 'number' ? a.price : Number(a?.price ?? NaN);
        const priceText = Number.isFinite(priceRaw) && priceRaw >= 0 ? ` ج.م ${Math.round(priceRaw * 100) / 100}` : '';
        const core = [name, size].filter(Boolean).join(' ');
        if (!core) return '';
        return `${core}${priceText}`.trim();
      })
      .filter(Boolean);
    return out;
  }

  const s = asCleanText(raw);
  return s ? [s] : [];
};

const formatVariantSelectionCompact = (raw: any, isArabic = false) => {
  if (!raw || typeof raw !== 'object') return '';
  const kind = asCleanText(raw?.kind).toLowerCase();

  if (kind === 'pack') {
    const label = formatPackLabel(raw, raw?.unit, isArabic);
    return label || '';
  }

  if (kind === 'fashion') {
    const color = asCleanText(raw?.colorName || raw?.color || raw?.colorValue);
    const size = asCleanText(raw?.size);
    return [color, size].filter(Boolean).join(' ');
  }

  const size = asCleanText(raw?.sizeLabel || raw?.sizeName || raw?.size);
  const type = asCleanText(raw?.typeLabel || raw?.typeName || raw?.type);
  return [type, size].filter(Boolean).join(' ');
};

const isDeliveryDisabledOrder = (order: any) => {
  return Boolean(
    order?.shops?.deliveryDisabled ??
    order?.shops?.delivery_disabled ??
    order?.shop?.deliveryDisabled ??
    order?.shop?.delivery_disabled ??
    order?.deliveryDisabled ??
    order?.delivery_disabled ??
    false
  );
};

const formatOrderItemsSummary = (sale: any, t?: any, isArabic = false) => {
  const items = Array.isArray(sale?.items) ? sale.items : [];
  if (items.length === 0) return '';

  const parts = items.slice(0, 3).map((it: any) => {
    const name = asCleanText(it?.product?.name || it?.name || it?.title);
    const qty = Number(it?.quantity || it?.qty || 1);
    const qtyText = Number.isFinite(qty) && qty > 1 ? ` × ${qty}` : '';
    const unitPrice = Number(it?.price ?? it?.unitPrice ?? it?.unit_price ?? 0);
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const lineTotal = Number.isFinite(unitPrice) ? unitPrice * safeQty : NaN;
    const priceText = (() => {
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return '';
      const useTotal = Number.isFinite(lineTotal) && safeQty > 1;
      const n = useTotal ? lineTotal : unitPrice;
      return ` ج.م ${Math.round(n * 100) / 100}`;
    })();
    const variantText = formatVariantSelectionCompact(it?.variantSelection ?? it?.variant_selection, isArabic);
    const addonsParts = formatAddonsCompactParts(it?.addons ?? it?.extras ?? it?.addOns);
    const core = [name, variantText].filter(Boolean).join(' ');
    const base = [core ? `${core}${qtyText}` : '', priceText].filter(Boolean).join('');
    const addons = addonsParts.length ? ` + ${addonsParts.join(' + ')}` : '';
    return `${base}${addons}`.trim();
  }).filter(Boolean);

  const more = items.length > 3 ? ` +${items.length - 3}` : '';
  return `${parts.join(' + ')}${more}`;
};

const getDeliveryAddress = (order: any): string => {
  return String(
    order?.deliveryAddressManual ||
    order?.delivery_address_manual ||
    order?.deliveryAddress ||
    order?.delivery_address ||
    ''
  ).trim();
};

const parseLocationFromNotes = (notes: string | null | undefined): { lat: number; lng: number } | null => {
  try {
    const raw = typeof notes === 'string' ? notes : '';
    const prefix = 'COD_LOCATION:';
    const start = raw.indexOf(prefix);
    if (start < 0) return null;
    const after = raw.slice(start + prefix.length).trim();
    const jsonPart = String(after.split(/\r?\n/)[0] || '').trim();
    if (!jsonPart) return null;
    const parsed = JSON.parse(jsonPart);
    const lat = Number(parsed?.coords?.lat);
    const lng = Number(parsed?.coords?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  } catch {
    return null;
  }
};

const hasLocationData = (order: any): boolean => {
  try {
    const raw = typeof order?.notes === 'string' ? order.notes : '';
    if (raw.includes('COD_LOCATION:')) return true;
  } catch {
    // ignore
  }
  
  return Boolean(
    order?.deliveryAddressManual ??
    order?.delivery_address_manual ??
    order?.deliveryAddress ??
    order?.delivery_address ??
    order?.address ??
    order?.user?.address
  );
};

const renderDeliveryFee = (sale: any): string => {
  if (isDeliveryDisabledOrder(sale)) {
    return 'توصيل ذاتي';
  }
  
  const raw = typeof sale?.notes === 'string' ? sale.notes : '';
  const lines = raw
    .split(/\r?\n/)
    .map((l: any) => String(l).trim())
    .filter(Boolean);
  const feeLine = lines.find((l: any) => String(l).toUpperCase().startsWith('DELIVERY_FEE:'));
  if (!feeLine) return '-';
  const value = String(feeLine).split(':').slice(1).join(':').trim();
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return '-';
  return `ج.م ${n}`;
};

export {
  asCleanText,
  toArabicUnitLabel,
  toLocalizedUnitLabel,
  formatPackLabelArabic,
  formatPackLabel,
  formatVariantSelection,
  formatAddons,
  formatAddonsCompactParts,
  formatVariantSelectionCompact,
  isDeliveryDisabledOrder,
  formatOrderItemsSummary,
  getDeliveryAddress,
  parseLocationFromNotes,
  hasLocationData,
  renderDeliveryFee,
};