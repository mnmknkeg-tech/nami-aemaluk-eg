export function escapeHtml(input: string) {
  const s = String(input ?? '');
  return s.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

// ثيم الماركرات مطابق للوحة التحكم: أبيض/سليت داكن + سماوي #00e5ff
const CYAN = '#00e5ff';
const DARK = '#0f172a';

export function buildShopMarkerHtml(name: string, city: string) {
  return `<div dir="rtl" style="display:flex; flex-direction:column; align-items:center; gap:7px; transform:translateZ(0);">
    <div style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.97); border:1px solid #e2e8f0; border-radius:12px; padding:8px 12px; box-shadow:0 10px 24px rgba(15,23,42,0.14); cursor:pointer; user-select:none; transition:transform 160ms ease, box-shadow 160ms ease;">
      <div style="display:flex; flex-direction:column; text-align:right; line-height:1.2; min-width:0;">
        <div style="font-weight:900; font-size:12px; color:${DARK}; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
        <div style="font-weight:700; font-size:10px; color:#64748b; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${city}</div>
      </div>
      <div style="background:${DARK}; color:${CYAN}; font-weight:900; font-size:10px; padding:5px 12px; border-radius:999px; white-space:nowrap; letter-spacing:0.2px;">زيارة</div>
    </div>
    <div style="width:10px; height:10px; background:${DARK}; border:2px solid ${CYAN}; border-radius:999px; box-shadow:0 8px 18px rgba(15,23,42,0.25);"></div>
  </div>`;
}

export function buildListingMarkerHtml(name: string, city: string) {
  return `<div dir="rtl" style="display:flex; flex-direction:column; align-items:center; gap:7px; transform:translateZ(0);">
    <div style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.97); border:1px solid rgba(0,229,255,0.55); border-radius:12px; padding:8px 12px; box-shadow:0 10px 24px rgba(15,23,42,0.14); cursor:pointer; user-select:none; transition:transform 160ms ease, box-shadow 160ms ease;">
      <div style="display:flex; flex-direction:column; text-align:right; line-height:1.2; min-width:0;">
        <div style="font-weight:900; font-size:12px; color:${DARK}; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
        <div style="font-weight:700; font-size:10px; color:#64748b; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${city}</div>
      </div>
      <div style="background:#ffffff; border:1.5px solid ${DARK}; color:${DARK}; font-weight:900; font-size:10px; padding:4px 11px; border-radius:999px; white-space:nowrap; letter-spacing:0.2px;">نشاط</div>
    </div>
    <div style="width:10px; height:10px; background:#ffffff; border:2px solid ${DARK}; border-radius:999px; box-shadow:0 8px 18px rgba(15,23,42,0.25);"></div>
  </div>`;
}
