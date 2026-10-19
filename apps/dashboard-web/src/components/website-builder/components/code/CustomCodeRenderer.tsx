import React, { useEffect, useRef, useState } from 'react';
import { ComponentNode } from '../../types/builder';
import { AlertCircle } from 'lucide-react';

interface CustomCodeRendererProps {
  node: ComponentNode;
  isInteractivePreview?: boolean;
}

export const CustomCodeRenderer: React.FC<CustomCodeRendererProps> = ({
  node,
  isInteractivePreview = false,
}) => {
  const [iframeHeight, setIframeHeight] = useState<number>(180);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const customHtml =
    node.props.html ||
    node.props.customHtml ||
    node.customCode?.tsxSnippet ||
    node.customCode?.tsx ||
    `<div class="p-6 bg-slate-900 text-white rounded-2xl border border-indigo-500/30 text-center">
      <h3 class="font-bold text-lg text-indigo-300">مكون كود مخصص (Custom Code)</h3>
      <p class="text-xs text-slate-400 mt-1">اضغط على زر الكود في شريط الأدوات لتعديل هذا المكون مباشرة.</p>
    </div>`;

  const customCss = node.customCode?.css || node.customCode?.cssSnippet || '';
  const customJs = node.customCode?.js || node.customCode?.jsSnippet || '';

  // Listen for height reports from the sandboxed iframe so the canvas
  // sizes the component correctly. Only trust messages from our own iframe,
  // and strictly validate shape before touching state.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'custom-code-height' || d.id !== node.id) return;
      if (typeof d.height !== 'number' || !Number.isFinite(d.height)) return;
      setIframeHeight(Math.max(40, Math.min(d.height + 8, 4000)));
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [node.id]);

  // Defense-in-depth escaping for values interpolated into srcDoc:
  // - CSS must not be able to close its <style> element early.
  // - JSON embedded in <script> must not be able to close the script tag
  //   (JSON.stringify does not escape "<" by default).
  const safeCss = customCss.replace(/<\/style/gi, '<\\/style');
  const propsJson = JSON.stringify({ id: node.id, props: node.props || {} }).replace(
    /</g,
    '\\u003c'
  );
  const nodeIdJson = JSON.stringify(node.id);

  return (
    <div className="custom-code-node-wrapper relative w-full overflow-hidden">
      {/* Custom HTML+CSS+JS are rendered inside a sandboxed iframe so the
          code cannot access the parent page, cookies, or localStorage.
          sandbox="allow-scripts" (without allow-same-origin) keeps it
          isolated: scripts run but cannot touch our origin. */}
      <iframe
        ref={iframeRef}
        title={`custom-code-${node.id}`}
        sandbox="allow-scripts"
        className="w-full border-0 bg-transparent"
        style={{ height: iframeHeight }}
        srcDoc={`<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob: https:; font-src https: data:; media-src https: data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow-x: hidden; }
  ${safeCss}
</style>
</head>
<body>
${customHtml}
<script>
  (function () {
    function reportHeight() {
      try {
        parent.postMessage({ type: 'custom-code-height', id: ${nodeIdJson}, height: document.documentElement.scrollHeight }, '*');
      } catch (e) {}
    }
    window.addEventListener('load', reportHeight);
    window.addEventListener('resize', reportHeight);
    setTimeout(reportHeight, 50);
    setTimeout(reportHeight, 500);
    ${isInteractivePreview ? `
    try {
      (function (container, node) {
        ${customJs}
      })(document.body, ${propsJson});
    } catch (err) {
      console.warn('Custom Script Runtime:', err);
    }` : ''}
  })();
</script>
</body>
</html>`}
      />
      {error && (
        <div className="mt-2 p-2 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>تنبيه كود: {error}</span>
        </div>
      )}
    </div>
  );
};
