const MAX_HTML_BYTES = 256 * 1024;
const MAX_CSS_BYTES = 64 * 1024;
const MAX_JS_BYTES = 64 * 1024;
// The sandbox renderer intentionally caps reported component height at 4,000px.
const MAX_DIMENSION = 4000;

const EVENT_HANDLER_NAMES = [
  'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 'mousemove',
  'keydown', 'keyup', 'keypress', 'submit', 'change', 'focus', 'blur', 'load', 'error',
  'abort', 'reset', 'resize', 'scroll', 'unload', 'beforeunload', 'contextmenu', 'drag',
  'drop', 'cut', 'copy', 'paste', 'input', 'invalid', 'select', 'toggle', 'show', 'hide',
  'animationstart', 'animationiteration', 'animationend', 'transitionend', 'wheel',
  'touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointerup',
  'pointermove', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave',
  'gotpointercapture', 'lostpointercapture',
];
const EVENT_HANDLER_RE = new RegExp(`\\bon(?:${EVENT_HANDLER_NAMES.join('|')})\\s*=`, 'i');
const DANGEROUS_HTML_TAG_RE = /<(?:script|iframe|object|embed|form|svg|math|noscript|link|meta|base)\b/i;
const DANGEROUS_HTML_URL_RE = /(?:javascript|vbscript)\s*:|data\s*:/i;
const DANGEROUS_JS_PATTERNS: RegExp[] = [
  /\bparent\s*\./i,
  /\btop\s*\./i,
  /\bopener\s*\./i,
  /\bfetch\s*\(|XMLHttpRequest|ActiveXObject/i,
  /\blocalStorage|sessionStorage/i,
  /\bdocument\.cookie/i,
  /\beval\s*\(|Function\s*\(|setTimeout\s*\(.*["']|setInterval\s*\(.*["']/i,
];
const CSS_DIMENSION_RE = /(-?\d*\.?\d+)\s*(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)?/gi;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function validHeightValue(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && value <= MAX_DIMENSION;
  if (typeof value !== 'string' || value.trim() === '') return false;

  const cssValue = value.trim();
  if (/^(auto|min-content|max-content|fit-content|inherit|initial|unset|revert)$/i.test(cssValue)) {
    return true;
  }
  if (/^-\s*\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)?$/i.test(cssValue)) {
    return false;
  }
  const matches = [...cssValue.matchAll(CSS_DIMENSION_RE)];
  if (matches.length === 0) return false;

  // Keep ordinary dimensions and calc()/min()/max()/clamp() values while
  // preventing extreme numeric lengths. The same 4,000px cap is used by the
  // custom-code iframe renderer; relative units are bounded conservatively.
  return matches.every((match) => {
    const amount = Math.abs(Number(match[1]));
    const unit = (match[2] || 'px').toLowerCase();
    const pxFactor: Record<string, number> = {
      px: 1,
      rem: 16,
      em: 16,
      ch: 16,
      ex: 8,
      cm: 37.8,
      mm: 3.78,
      in: 96,
      pt: 96 / 72,
      pc: 16,
      '%': 1,
      vh: 1,
      vw: 1,
      vmin: 1,
      vmax: 1,
    };
    return Number.isFinite(amount) && amount * pxFactor[unit] <= MAX_DIMENSION;
  });
}

function checkHtml(value: unknown, label: string, errors: string[]): void {
  if (typeof value !== 'string' || value === '') return;
  if (byteLength(value) > MAX_HTML_BYTES) {
    errors.push(`${label}: حجم HTML يتجاوز الحد المسموح (256 كيلوبايت).`);
  }
  if (DANGEROUS_HTML_TAG_RE.test(value)) {
    errors.push(`${label}: يحتوي HTML على وسم لا تسمح به معاينة الموقع المنشور.`);
  }
  if (EVENT_HANDLER_RE.test(value)) {
    errors.push(`${label}: احذف معالجات الأحداث المضمنة (مثل onclick) من HTML.`);
  }
  if (DANGEROUS_HTML_URL_RE.test(value)) {
    errors.push(`${label}: روابط javascript: وvbscript: وdata: غير مسموحة في HTML.`);
  }
}

/** Pure preflight validation for the website tree sent by the builder. */
export function validateWebsiteForPublishing(website: unknown): string[] {
  const errors: string[] = [];
  if (!website || typeof website !== 'object') return ['بيانات الموقع غير صالحة.'];

  const candidate = website as { pages?: unknown; components?: unknown };
  if (!Array.isArray(candidate.pages) || candidate.pages.length === 0) {
    return ['يجب أن يحتوي الموقع على صفحة واحدة على الأقل.'];
  }
  if (
    !candidate.components ||
    typeof candidate.components !== 'object' ||
    Array.isArray(candidate.components)
  ) {
    return ['قائمة مكونات الموقع غير صالحة.'];
  }

  const components = candidate.components as Record<string, any>;
  const componentIds = Object.keys(components);
  const roots = new Set<string>();
  for (const [index, rawPage] of candidate.pages.entries()) {
    const page = rawPage as { name?: unknown; rootNodeId?: unknown } | null;
    const pageName =
      page && typeof page.name === 'string' && page.name.trim()
        ? page.name
        : `الصفحة ${index + 1}`;
    const rootId = page?.rootNodeId;
    if (typeof rootId !== 'string' || !rootId || !components[rootId]) {
      errors.push(`${pageName}: لم يتم العثور على مكون الجذر المرتبط بالصفحة.`);
      continue;
    }
    const root = components[rootId];
    if (root.id !== rootId || root.type !== 'container' || root.parentId != null) {
      errors.push(`${pageName}: يجب أن يكون الجذر مكون حاوية صالحًا بلا أب.`);
    }
    if (roots.has(rootId)) {
      errors.push(
        `${pageName}: مكون الجذر مستخدم لصفحة أخرى؛ أنشئ جذرًا مستقلًا لكل صفحة.`
      );
    }
    roots.add(rootId);
  }

  const childrenByParent = new Map<string, string[]>();
  for (const [id, node] of Object.entries(components)) {
    if (!node || typeof node !== 'object') {
      errors.push(`المكون ${id}: بيانات المكون غير صالحة.`);
      childrenByParent.set(id, []);
      continue;
    }
    if (node.id !== id) {
      errors.push(`المكون ${id}: معرّف المكون لا يطابق مفتاحه في شجرة الموقع.`);
    }
    const hasTemporaryImageReference = (value: unknown, visited = new Set<object>()): boolean => {
      if (typeof value === 'string') return /(?:^|[('\"]?)blob:/i.test(value);
      if (!value || typeof value !== 'object' || visited.has(value as object)) return false;
      visited.add(value as object);
      return Object.values(value as Record<string, unknown>).some((child) =>
        hasTemporaryImageReference(child, visited)
      );
    };
    if (hasTemporaryImageReference(node.props) || hasTemporaryImageReference(node.styles)) {
      errors.push(`المكون ${id}: يحتوي على صورة مؤقتة (blob:)؛ ارفع الصورة إلى التخزين الدائم قبل النشر.`);
    }
    const children = Array.isArray(node.childrenIds) ? node.childrenIds : [];
    childrenByParent.set(
      id,
      children.filter((childId: unknown): childId is string => typeof childId === 'string')
    );
    const uniqueChildren = new Set<string>();
    for (const childId of children) {
      if (typeof childId !== 'string' || !components[childId]) {
        errors.push(`المكون ${id}: يشير إلى ابن غير موجود في الشجرة.`);
      } else if (uniqueChildren.has(childId)) {
        errors.push(`المكون ${id}: يحتوي الابن نفسه أكثر من مرة.`);
      } else {
        uniqueChildren.add(childId);
        if (components[childId]?.parentId !== id) {
          errors.push(
            `المكون ${childId}: لا يتطابق parentId مع قائمة أبناء المكون ${id}.`
          );
        }
      }
    }
    if (node.parentId != null) {
      if (typeof node.parentId !== 'string' || !components[node.parentId]) {
        errors.push(`المكون ${id}: يشير إلى أب غير موجود.`);
      } else if (
        !Array.isArray(components[node.parentId]?.childrenIds) ||
        !components[node.parentId].childrenIds.includes(id)
      ) {
        errors.push(`المكون ${id}: الأب لا يدرجه ضمن childrenIds.`);
      }
    }

    const styles = node.styles && typeof node.styles === 'object' ? node.styles : {};
    for (const viewport of ['desktop', 'tablet', 'mobile']) {
      const viewportStyles = styles[viewport];
      if (!viewportStyles || typeof viewportStyles !== 'object') continue;
      for (const key of ['height', 'minHeight']) {
        if (viewportStyles[key] != null && !validHeightValue(viewportStyles[key])) {
          errors.push(
            `المكون ${id}: قيمة ${key} في نمط ${viewport} غير معقولة أو غير صالحة.`
          );
        }
      }
    }

    checkHtml(node.customCode?.tsxSnippet, `المكون ${id}`, errors);
    checkHtml(node.customCode?.tsx, `المكون ${id}`, errors);
    checkHtml(node.props?.html, `المكون ${id}`, errors);
    checkHtml(node.props?.customHtml, `المكون ${id}`, errors);
    for (const [code, label] of [
      [node.customCode?.css, 'CSS'],
      [node.customCode?.cssSnippet, 'CSS'],
    ]) {
      if (typeof code !== 'string' || code === '') continue;
      if (byteLength(code) > MAX_CSS_BYTES) {
        errors.push(`المكون ${id}: حجم ${label} يتجاوز الحد المسموح (64 كيلوبايت).`);
      }
      if (/@import\s+/i.test(code) || /expression\s*\(/i.test(code)) {
        errors.push(`المكون ${id}: احذف @import أو expression() غير الآمن من CSS.`);
      }
    }
    for (const [code, label] of [
      [node.customCode?.js, 'JavaScript'],
      [node.customCode?.jsSnippet, 'JavaScript'],
    ]) {
      if (typeof code !== 'string' || code === '') continue;
      if (byteLength(code) > MAX_JS_BYTES) {
        errors.push(`المكون ${id}: حجم ${label} يتجاوز الحد المسموح (64 كيلوبايت).`);
      }
      if (DANGEROUS_JS_PATTERNS.some((pattern) => pattern.test(code))) {
        errors.push(
          `المكون ${id}: يحتوي JavaScript على وصول أو تنفيذ محظور وفق سياسة عزل الكود.`
        );
      }
    }
  }

  // Detect cycles even when their nodes are disconnected from every page root.
  const completed = new Set<string>();
  let hasCycle = false;
  for (const startId of componentIds) {
    if (completed.has(startId)) continue;
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let current: string | null = startId;
    while (current && components[current] && !completed.has(current)) {
      if (pathIndex.has(current)) {
        hasCycle = true;
        break;
      }
      pathIndex.set(current, path.length);
      path.push(current);
      const parentId: unknown = components[current]?.parentId;
      current = typeof parentId === 'string' ? parentId : null;
    }
    for (const id of path) completed.add(id);
  }
  if (hasCycle) {
    errors.push('تحتوي شجرة المكونات على دورة بين الآباء والأبناء؛ أصلح العلاقات قبل الحفظ.');
  }

  // Every component must be reachable from exactly one declared page root.
  const reachable = new Set<string>();
  const queue = [...roots].filter((rootId) => !!components[rootId]);
  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const current = queue[queueIndex];
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const childId of childrenByParent.get(current) || []) {
      if (components[childId] && !reachable.has(childId)) queue.push(childId);
    }
  }
  // normalizeWebsite intentionally retains this empty legacy root as a
  // compatibility placeholder beside the current page_root fixture.
  const orphans = componentIds.filter((id) => {
    if (reachable.has(id)) return false;
    const node = components[id];
    const isLegacyBlankRoot =
      id === 'comp_blank_root' &&
      node?.id === id &&
      node.type === 'container' &&
      node.parentId == null &&
      Array.isArray(node.childrenIds) &&
      node.childrenIds.length === 0;
    return !isLegacyBlankRoot;
  });
  if (orphans.length > 0) {
    errors.push(
      `توجد مكونات غير مرتبطة بجذر صفحة: ${orphans.slice(0, 5).join('، ')}` +
        `${orphans.length > 5 ? '، …' : ''}.`
    );
  }

  return [...new Set(errors)];
}
