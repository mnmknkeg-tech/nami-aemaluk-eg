import type { ThemePreset } from '../themes/types';
import type { SectionTemplate } from '../sections/types';
import type { ActivityTemplateMeta } from '../templates/allActivities/types';
import type { Website } from '../../types/builder';

export const TEMPLATE_CATEGORIES = ['full-website', 'section-template', 'theme-preset'] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_SCHEMA_VERSIONS = {
  fullWebsite: 'full-website/legacy-v1',
  section: 'section-template/legacy-v1',
  theme: 'theme-preset/legacy-v1',
} as const;

export interface TemplateCapabilities {
  preview: boolean;
  apply: boolean;
}

interface TemplateRegistryBase {
  id: string;
  category: TemplateCategory;
  activity?: string;
  displayName: string;
  version: string;
  dataSource: string;
  schemaVersion: string;
  capabilities: TemplateCapabilities;
  legacyIds?: string[];
}

export interface FullWebsiteTemplateEntry extends TemplateRegistryBase {
  category: 'full-website';
  website: Website;
  metadata: ActivityTemplateMeta;
}

export interface SectionTemplateEntry extends TemplateRegistryBase {
  category: 'section-template';
  template: SectionTemplate;
}

export interface ThemePresetEntry extends TemplateRegistryBase {
  category: 'theme-preset';
  presetKey: string;
  preset: ThemePreset;
}

export type TemplateRegistryEntry =
  FullWebsiteTemplateEntry | SectionTemplateEntry | ThemePresetEntry;

export type TemplateRecordByCategory<C extends TemplateCategory> = Extract<
  TemplateRegistryEntry,
  { category: C }
>;
