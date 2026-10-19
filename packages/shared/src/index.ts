// Shared package entry points. Apps import subpaths
// (@ray-eg/shared/builder, /components/common/*, /i18n, /types) rather than
// this root barrel; it re-exports the stable public surface.
export * from './components';
export * from './builder';
export * from './i18n';
