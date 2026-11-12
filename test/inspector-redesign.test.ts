import { DEFAULT_INSPECTOR_EXPANDED_SECTIONS } from '../apps/dashboard-web/src/components/website-builder/components/inspector/inspectorDefaults';

describe('Inspector progressive disclosure defaults', () => {
  it('keeps primary content and actions visible while secondary groups start collapsed', () => {
    expect(DEFAULT_INSPECTOR_EXPANDED_SECTIONS.content).toBe(true);
    expect(DEFAULT_INSPECTOR_EXPANDED_SECTIONS.actions).toBe(true);
    expect(DEFAULT_INSPECTOR_EXPANDED_SECTIONS.media).toBe(false);
    expect(DEFAULT_INSPECTOR_EXPANDED_SECTIONS.colors).toBe(false);
    expect(DEFAULT_INSPECTOR_EXPANDED_SECTIONS.theme).toBe(false);
    expect(DEFAULT_INSPECTOR_EXPANDED_SECTIONS.advanced).toBe(false);
  });
});
