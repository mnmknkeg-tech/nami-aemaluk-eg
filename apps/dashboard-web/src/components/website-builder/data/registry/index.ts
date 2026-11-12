import {
  canonicalTemplates,
  legacyFullWebsiteIds,
  templateSourceAudit,
} from './canonicalTemplates';
import { TemplateRegistry } from './TemplateRegistry';

export * from './canonicalTemplates';
export * from './templateTypes';
export * from './validationTypes';
export {
  TemplateRegistry,
  validateTemplateEntries,
  validateTemplateEntry,
} from './TemplateRegistry';

export const templateRegistry = new TemplateRegistry(canonicalTemplates, legacyFullWebsiteIds);

export const getFullWebsiteTemplates = () => templateRegistry.getFullWebsites();

export const fullWebsiteTemplateMetadata = getFullWebsiteTemplates().map((entry) => entry.metadata);

export const getFullWebsiteTemplateMetadata = () => [...fullWebsiteTemplateMetadata];

export const resolveFullWebsiteTemplateId = (id: string) => templateRegistry.getCanonicalId(id);

export const loadFullWebsiteTemplate = (id: string) => templateRegistry.load(id, 'full-website');

export const loadSectionTemplate = (id: string) => templateRegistry.load(id, 'section-template');

export const loadThemePreset = (id: string) => templateRegistry.load(id, 'theme-preset');

export const getSectionTemplateRecords = () => templateRegistry.getSectionTemplates();

export const getThemePresetRecords = () => templateRegistry.getThemePresets();

export const getTemplateRegistryAudit = () => ({
  ...templateSourceAudit,
  registryCounts: {
    fullWebsite: templateRegistry.getFullWebsites().length,
    section: templateRegistry.getSectionTemplates().length,
    theme: templateRegistry.getThemePresets().length,
  },
  idsByCategory: {
    fullWebsite: templateRegistry.getFullWebsites().map((entry) => entry.id),
    section: templateRegistry.getSectionTemplates().map((entry) => entry.id),
    theme: templateRegistry.getThemePresets().map((entry) => entry.id),
  },
});
