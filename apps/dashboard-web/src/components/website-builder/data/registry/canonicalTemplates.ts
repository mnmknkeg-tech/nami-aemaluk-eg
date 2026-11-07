import { allActivityWebsites, activityTemplatesMeta } from '../templates/allActivities';
import { sampleWebsites } from '../templates/automotive';
import { sectionTemplates } from '../sections';
import { themePresets } from '../themes/presets';
import type {
  FullWebsiteTemplateEntry,
  SectionTemplateEntry,
  TemplateRegistryEntry,
  ThemePresetEntry,
} from './templateTypes';
import { TEMPLATE_SCHEMA_VERSIONS } from './templateTypes';

const LEGACY_FULL_WEBSITE_IDS: Record<string, string> = {
  site_fashion_boutique: 'site_opal_fashion',
  site_dental_clinic: 'site_clinic_hospital',
  site_beauty_salon: 'site_lotus_beauty',
  site_electronics_store: 'site_techzone_store',
  site_hotel_resort: 'site_resorts_boutique_hotels',
  site_law_firm: 'site_nukhba_law',
  site_grocery_supermarket: 'site_al_waha_grocery',
  site_travel_tourism: 'site_ofok_travel',
  site_accounting: 'site_diqqa_accounting',
  site_nursery_plants: 'site_agriculture_nursery',
  site_flowers_gifts: 'site_flora_gifts',
  site_home_services: 'site_sarh_home_services',
  site_academy_education: 'site_education_academy',
};

const fullWebsiteSources = new Map(
  Object.entries(sampleWebsites).map(([id, website]) => [
    id,
    { website, dataSource: 'sampleWebsites' },
  ])
);

// Preserve the historical resolver precedence: allActivityWebsites wins where
// it overlaps the older automotive/sample website catalog.
Object.entries(allActivityWebsites).forEach(([id, website]) => {
  fullWebsiteSources.set(id, { website, dataSource: 'allActivityWebsites' });
});

const metadataById = new Map(activityTemplatesMeta.map((metadata) => [metadata.id, metadata]));

function adaptLegacyWebsite(website: FullWebsiteTemplateEntry['website']) {
  const adapted = {
    ...website,
    pages: website.pages.map((page) => ({ ...page })),
    components: Object.fromEntries(
      Object.entries(website.components).map(([id, node]) => [
        id,
        { ...node, childrenIds: [...node.childrenIds] },
      ])
    ),
  };
  let nextCloneId = 1;

  adapted.pages.forEach((page) => {
    const parentsByNode = new Map<string, string>();
    const visited = new Set<string>();

    const cloneSubtree = (nodeId: string, parentId: string, active: Set<string>): string => {
      if (active.has(nodeId) || !adapted.components[nodeId]) return nodeId;
      const source = adapted.components[nodeId];
      let cloneId = `${nodeId}__registry_${nextCloneId}`;
      while (adapted.components[cloneId]) {
        nextCloneId += 1;
        cloneId = `${nodeId}__registry_${nextCloneId}`;
      }
      nextCloneId += 1;

      const nextActive = new Set(active).add(nodeId);
      const childrenIds = source.childrenIds.map((childId) =>
        cloneSubtree(childId, cloneId, nextActive)
      );
      adapted.components[cloneId] = {
        ...source,
        id: cloneId,
        parentId,
        childrenIds,
      };
      return cloneId;
    };

    const visit = (nodeId: string) => {
      if (visited.has(nodeId) || !adapted.components[nodeId]) return;
      visited.add(nodeId);
      const node = adapted.components[nodeId];
      node.childrenIds = node.childrenIds.map((childId) => {
        const previousParent = parentsByNode.get(childId);
        const resolvedChildId =
          previousParent && previousParent !== nodeId
            ? cloneSubtree(childId, nodeId, new Set())
            : childId;
        parentsByNode.set(resolvedChildId, nodeId);
        visit(resolvedChildId);
        return resolvedChildId;
      });
    };

    if (page.rootNodeId) visit(page.rootNodeId);
  });

  return adapted;
}

const websiteEntries: FullWebsiteTemplateEntry[] = [...fullWebsiteSources.entries()].map(
  ([id, source]) => {
    const metadata = metadataById.get(id);
    const website = adaptLegacyWebsite(source.website);
    const fallbackMetadata = {
      id,
      tenantId: website.tenantId,
      name: website.name,
      category: String(website.activity || 'عام'),
      icon: '🌐',
      badge: '',
      themeKey: '',
      primaryColor: website.theme?.colors?.primary || '#2563eb',
      description: '',
      tags: [],
    };
    return {
      id,
      category: 'full-website',
      activity: String(website.activity || metadata?.category || ''),
      displayName: metadata?.name || website.name || id,
      version: '1.0.0',
      dataSource: source.dataSource,
      schemaVersion: TEMPLATE_SCHEMA_VERSIONS.fullWebsite,
      capabilities: { preview: true, apply: true },
      website,
      metadata: metadata || fallbackMetadata,
    };
  }
);

const sectionIds = new Set<string>();
const duplicateSectionTemplateIds: Record<string, string[]> = {};
const sectionEntries: SectionTemplateEntry[] = sectionTemplates.map((sourceTemplate) => {
  let id = sourceTemplate.id;
  if (sectionIds.has(id)) {
    const baseId = `${id}-${sourceTemplate.style}`;
    id = baseId;
    let suffix = 2;
    while (sectionIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    duplicateSectionTemplateIds[sourceTemplate.id] ??= [sourceTemplate.id];
    duplicateSectionTemplateIds[sourceTemplate.id].push(id);
  }
  sectionIds.add(id);
  const template = id === sourceTemplate.id ? sourceTemplate : { ...sourceTemplate, id };
  return {
    id,
    category: 'section-template',
    activity: String(template.activity || ''),
    displayName: template.nameAr || template.name || id,
    version: '1.0.0',
    dataSource: 'sectionTemplates',
    schemaVersion: TEMPLATE_SCHEMA_VERSIONS.section,
    capabilities: { preview: true, apply: true },
    template,
  };
});

const themeEntries: ThemePresetEntry[] = Object.entries(themePresets).map(
  ([presetKey, preset]) => ({
    id: presetKey,
    category: 'theme-preset',
    displayName: preset.nameAr || preset.name || presetKey,
    version: '1.0.0',
    dataSource: 'themePresets',
    schemaVersion: TEMPLATE_SCHEMA_VERSIONS.theme,
    capabilities: { preview: true, apply: true },
    presetKey,
    preset,
  })
);

export const canonicalTemplates: TemplateRegistryEntry[] = [
  ...websiteEntries,
  ...sectionEntries,
  ...themeEntries,
];

export const legacyFullWebsiteIds = LEGACY_FULL_WEBSITE_IDS;

export interface TemplateSourceAudit {
  fullWebsiteCount: number;
  sectionTemplateCount: number;
  themePresetCount: number;
  metadataWithoutWebsite: string[];
  websitesWithoutMetadata: string[];
  overlappingWebsiteIds: string[];
  duplicateSectionTemplateIds: Record<string, string[]>;
  legacyAliases: Record<string, string>;
}

export const templateSourceAudit: TemplateSourceAudit = {
  fullWebsiteCount: websiteEntries.length,
  sectionTemplateCount: sectionEntries.length,
  themePresetCount: themeEntries.length,
  metadataWithoutWebsite: activityTemplatesMeta
    .filter((metadata) => !fullWebsiteSources.has(metadata.id))
    .map((metadata) => metadata.id),
  websitesWithoutMetadata: websiteEntries
    .filter((entry) => !metadataById.has(entry.id))
    .map((entry) => entry.id),
  overlappingWebsiteIds: Object.keys(sampleWebsites).filter((id) =>
    Object.prototype.hasOwnProperty.call(allActivityWebsites, id)
  ),
  duplicateSectionTemplateIds,
  legacyAliases: LEGACY_FULL_WEBSITE_IDS,
};
