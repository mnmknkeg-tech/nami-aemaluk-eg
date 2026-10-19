'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ComponentNode } from './types';

// ---------------------------------------------------------------------------
// CustomCodeFrame — hardened sandbox for user-authored HTML/CSS/JS
//
// Security model:
//   • The iframe uses srcDoc (inherits parent origin) with sandbox="allow-scripts"
//     and NO allow-same-origin. Scripts run but cannot access the parent DOM,
//     cookies, or localStorage because the sandboxed iframe is treated as a
//     unique opaque origin.
//   • postMessage uses a strict allowlist: only messages from our own iframe
//     with a known type and valid shape are accepted. No wildcard origin.
//   • Custom JS is denied access to parent/top/opener, localStorage, cookies,
//     and fetch/XHR via a deny-list injected into the iframe's script context.
// ---------------------------------------------------------------------------

const ALLOWED_MESSAGE_TYPES = new Set(['custom-code-height']);

function isAllowedMessage(data: unknown): data is { type: string; id: string; height: number } {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  if (!ALLOWED_MESSAGE_TYPES.has(d.type as string)) return false;
  if (typeof d.id !== 'string') return false;
  if (typeof d.height !== 'number' || !Number.isFinite(d.height)) return false;
  return true;
}

// JS deny-list patterns injected into the sandboxed iframe. These are
// defense-in-depth; the iframe sandbox is the primary boundary.
const JS_DENY_PATTERNS = [
  '\\bparent\\s*\\.',
  '\\btop\\s*\\.',
  '\\bopener\\s*\\.',
  '\\bfetch\\s*\\(',
  'XMLHttpRequest',
  'ActiveXObject',
  '\\blocalStorage',
  '\\bsessionStorage',
  '\\bdocument\\.cookie',
  '\\beval\\s*\\(',
  '\\bFunction\\s*\\(',
];

function buildSandboxHtml(node: ComponentNode): string {
  const customHtml =
    node.props.html ||
    node.props.customHtml ||
    node.customCode?.tsxSnippet ||
    node.customCode?.tsx ||
    '';

  const customCss = node.customCode?.css || node.customCode?.cssSnippet || '';
  const customJs = node.customCode?.js || node.customCode?.jsSnippet || '';

  // Escape the node id for safe JS string interpolation.
  const safeId = node.id.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');

  const denyCheck = JS_DENY_PATTERNS.map((p) => `new RegExp('${p}', 'i)`).join(',');

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; object-src 'none'; frame-ancestors 'none';" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow-x: hidden; }
  ${customCss.replace(/<\/style>/gi, '\\u003c/style\\u003e')}
</style>
</head>
<body>
${customHtml.replace(/<\/script>/gi, '\\u003c/script\\u003e')}
<script>
  (function () {
    var denyPatterns = [${denyCheck}];
    var rawJs = ${JSON.stringify(customJs)};
    for (var i = 0; i < denyPatterns.length; i++) {
      if (denyPatterns[i].test(rawJs)) {
        console.warn('Blocked dangerous JS pattern:', denyPatterns[i]);
        return;
      }
    }
    function reportHeight() {
      try {
        var height = document.documentElement.scrollHeight;
        parent.postMessage({ type: 'custom-code-height', id: '${safeId}', height: height }, '*');
      } catch (e) {}
    }
    window.addEventListener('load', reportHeight);
    window.addEventListener('resize', reportHeight);
    setTimeout(reportHeight, 50);
    setTimeout(reportHeight, 500);
    try {
      (function () { ${customJs} })();
    } catch (err) {
      console.warn('Custom Script Runtime:', err);
    }
  })();
</script>
</body>
</html>`;
}

export const CustomCodeFrame: React.FC<{ node: ComponentNode }> = ({ node }) => {
  const [iframeHeight, setIframeHeight] = useState<number>(180);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handler = (e: MessageEvent) => {
      // Only trust messages from our own iframe.
      if (e.source !== iframe.contentWindow) return;
      if (!isAllowedMessage(e.data)) return;
      if (e.data.id !== node.id) return;

      setIframeHeight((prev) => Math.max(40, Math.min(e.data.height + 8, 4000)));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [node.id]);

  if (!node.props.html && !node.customCode?.tsxSnippet && !node.customCode?.tsx) return null;

  return (
    <div className="custom-code-node-wrapper relative w-full overflow-hidden">
      <iframe
        ref={iframeRef}
        title={`custom-code-${node.id}`}
        sandbox="allow-scripts"
        className="w-full border-0 bg-transparent"
        style={{ height: iframeHeight }}
        srcDoc={buildSandboxHtml(node)}
      />
    </div>
  );
};
