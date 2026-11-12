import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('marketplace Tailwind source discovery', () => {
  it('scans shared builder components so their production utility classes are emitted', () => {
    const configPath = resolve(__dirname, '../apps/marketplace-next/tailwind.config.ts');
    const config = readFileSync(configPath, 'utf8');
    expect(config).toContain('../../packages/shared/src/**/*.{js,ts,jsx,tsx,mdx}');
  });
});

describe('marketplace middleware static assets', () => {
  it('excludes nested static file paths from tenant rewrites', () => {
    const middlewarePath = resolve(__dirname, '../apps/marketplace-next/middleware.ts');
    const middleware = readFileSync(middlewarePath, 'utf8');
    expect(middleware).toContain(String.raw`.*\\.[^/]+$`);
  });
});
