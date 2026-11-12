/// <reference types="vite-plugin-pwa/client" />

import 'vite/client';

interface ImportMetaEnv {
  readonly VITE_FEATURED_SHOP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
