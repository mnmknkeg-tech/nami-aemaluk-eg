#!/usr/bin/env node
/**
 * migrate-shape-to-cardShape.js
 *
 * One-shot migration: normalize the legacy `props.shape` field on product-card
 * section nodes to the canonical `props.cardShape` used by the shared
 * `resolveProductCardOptions` resolver and the dashboard Inspector.
 *
 * Background:
 *   The Inspector at apps/dashboard-web/src/components/website-builder/components/
 *   inspector/panels/ProductCardSection.tsx used to read `p.cardShape ?? p.shape`
 *   as a compatibility fallback. Old templates authored `shape`; the Inspector
 *   saves `cardShape`. This left mixed data in the DB. After this migration,
 *   the `?? p.shape` fallback can be removed from the Inspector and from
 *   `packages/shared/src/builder/productCard.ts:resolveProductCardOptions`.
 *
 * Run:
 *   node scripts/migrate-shape-to-cardShape.js
 *   node scripts/migrate-shape-to-cardShape.js --dry-run   # preview only
 *
 * This script is idempotent: re-running it is a no-op once `shape` is gone.
 */
'use strict';

// Adjust the import path below to wherever your website drafts are persisted
// before being sent to the Go backend. By default we read from a JSON file
// passed via argv, e.g.:
//   node scripts/migrate-shape-to-cardShape.js path/to/websites.json
const fs = require('fs');
const path = require('path');

const VALID_SHAPES = new Set(['classic', 'minimal', 'overlay', 'horizontal', 'compact']);
const isDryRun = process.argv.includes('--dry-run');
const inputPath = process.argv.find((arg) => !arg.startsWith('-') && arg !== process.argv[1]);

if (!inputPath) {
  console.error('Usage: node migrate-shape-to-cardShape.js <path-to-websites.json> [--dry-run]');
  console.error('  Pass a JSON file containing an array of Website objects, or a single Website.');
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
const parsed = JSON.parse(raw);
const websites = Array.isArray(parsed) ? parsed : [parsed];

let migratedNodes = 0;
let migratedWebsites = 0;

for (const website of websites) {
  if (!website || typeof website !== 'object' || !website.components) continue;
  let touched = false;
  for (const node of Object.values(website.components)) {
    if (!node || typeof node !== 'object' || !node.props) continue;
    const p = node.props;
    // Only touch product-card-shaped nodes that still carry the legacy `shape`.
    if (p.shape === undefined) continue;
    const legacy = String(p.shape);
    if (!VALID_SHAPES.has(legacy)) {
      // Unknown value — keep cardShape if present, else default to 'classic'.
      p.cardShape = p.cardShape || 'classic';
    } else {
      p.cardShape = p.cardShape || legacy;
    }
    delete p.shape;
    migratedNodes++;
    touched = true;
  }
  if (touched) migratedWebsites++;
}

if (isDryRun) {
  console.log(`[dry-run] Would migrate ${migratedNodes} nodes across ${migratedWebsites} websites.`);
  process.exit(0);
}

const outPath = inputPath.replace(/\.json$/i, '.migrated.json');
fs.writeFileSync(outPath, JSON.stringify(websites, null, 2), 'utf8');
console.log(`Migrated ${migratedNodes} nodes across ${migratedWebsites} websites.`);
console.log(`Output written to: ${outPath}`);
console.log('You can now drop the `?? p.shape` fallback from:');
console.log('  - apps/dashboard-web/.../ProductCardSection.tsx:109');
console.log('  - packages/shared/src/builder/productCard.ts:92-93');
