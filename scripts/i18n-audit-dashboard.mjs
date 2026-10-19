import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = [
  'components/pages/business',
  'components/layouts/BusinessLayout.tsx',
  'src/components/MerchantDashboard',
];
const LOCALE_DIR = path.join(ROOT, 'i18n', 'locales');
const OUTPUT_DIR = path.join(ROOT, 'reports');
const DEFAULT_OUTPUT_CSV = path.join(OUTPUT_DIR, 'i18n-dashboard-report.csv');

const KEY_PATTERN = /(?<![\w$])(?:i18n\.)?t\(\s*['"]([^'"]+)['"]/g;

function walkFiles(targetPath, out = []) {
  const abs = path.join(ROOT, targetPath);
  if (!fs.existsSync(abs)) return out;
  const st = fs.statSync(abs);
  if (st.isFile()) {
    if (abs.endsWith('.tsx') || abs.endsWith('.ts')) out.push(abs);
    return out;
  }
  for (const entry of fs.readdirSync(abs)) {
    const child = path.join(abs, entry);
    const cst = fs.statSync(child);
    if (cst.isDirectory()) {
      walkFiles(path.relative(ROOT, child), out);
    } else if (child.endsWith('.tsx') || child.endsWith('.ts')) {
      out.push(child);
    }
  }
  return out;
}

function collectKeys() {
  const keys = new Map();
  const files = TARGETS.flatMap((t) => walkFiles(t));
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(KEY_PATTERN)) {
      const key = String(m[1] || '').trim();
      if (!key || !key.includes('.') || key.endsWith('.') || key.includes('/') || /\s/.test(key)) continue;
      if (!keys.has(key)) keys.set(key, new Set());
      keys.get(key).add(rel);
    }
  }
  return keys;
}

function loadLocale(lang) {
  const dir = path.join(LOCALE_DIR, lang);
  const out = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const ns = file.slice(0, -5);
    out[ns] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
  return out;
}

function getValue(localeByNs, fullKey) {
  const [ns, ...rest] = fullKey.split('.');
  let cur = localeByNs[ns];
  if (!cur) return { exists: false, value: '' };
  for (const part of rest) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) {
      return { exists: false, value: '' };
    }
    cur = cur[part];
  }
  if (typeof cur === 'string') return { exists: true, value: cur };
  return { exists: true, value: JSON.stringify(cur) };
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function main() {
  const args = process.argv.slice(2);
  const failOnMissing = args.includes('--fail-on-missing');
  const outArgIndex = args.findIndex((a) => a === '--out');
  const outputCsv = outArgIndex >= 0 && args[outArgIndex + 1]
    ? path.join(ROOT, args[outArgIndex + 1])
    : DEFAULT_OUTPUT_CSV;

  const keys = collectKeys();
  const ar = loadLocale('ar');
  const en = loadLocale('en');

  const rows = [];
  for (const [key, refs] of [...keys.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const arRes = getValue(ar, key);
    const enRes = getValue(en, key);
    const status =
      !arRes.exists && !enRes.exists
        ? 'missing_both'
        : !arRes.exists
          ? 'missing_ar'
          : !enRes.exists
            ? 'missing_en'
            : 'ok';
    rows.push({
      key,
      status,
      ar: arRes.value,
      en: enRes.value,
      refs: [...refs].join(' | '),
    });
  }

  const outputDir = path.dirname(outputCsv);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const header = ['key', 'status', 'ar', 'en', 'refs'];
  const csv = [
    header.join(','),
    ...rows.map((r) => [r.key, r.status, r.ar, r.en, r.refs].map(csvEscape).join(',')),
  ].join('\n');
  fs.writeFileSync(outputCsv, csv, 'utf8');

  const summary = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  console.log('i18n dashboard audit complete');
  console.log(`rows: ${rows.length}`);
  console.log(`report: ${path.relative(ROOT, outputCsv)}`);
  console.log('summary:', summary);

  const missingTotal = (summary.missing_ar || 0) + (summary.missing_en || 0) + (summary.missing_both || 0);
  if (failOnMissing && missingTotal > 0) {
    process.exitCode = 2;
  }
}

main();
