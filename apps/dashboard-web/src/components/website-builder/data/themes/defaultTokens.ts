// Canonical tokens live in shared (packages/shared/src/builder/designTokens.ts)
// and are re-exported here so relative dashboard imports (presets, polish,
// utils, canvas) keep working unchanged. Never redefine values locally — the
// published renderer reads the same source, and a local copy WILL drift.
export { defaultDesignTokens } from '@ray-eg/shared/builder';
