import {
  getFullWebsiteTemplateMetadata,
  getFullWebsiteTemplates,
  getSectionTemplateRecords,
  getTemplateRegistryAudit,
  getThemePresetRecords,
  loadFullWebsiteTemplate,
  loadSectionTemplate,
  loadThemePreset,
  legacyFullWebsiteIds,
  resolveFullWebsiteTemplateId,
  templateRegistry,
  validateTemplateEntries,
  validateTemplateEntry,
} from '../apps/dashboard-web/src/components/website-builder/data/registry';
import { getInitialBuilderState } from '../apps/dashboard-web/src/components/website-builder/context/builderUtils';
import { sectionCategoriesList } from '../apps/dashboard-web/src/components/website-builder/data/sections';

describe('canonical website template registry', () => {
  it('loads every registered full website template with its stable id and page roots', () => {
    const entries = getFullWebsiteTemplates();
    expect(entries.length).toBeGreaterThan(0);

    entries.forEach((entry) => {
      const loaded = loadFullWebsiteTemplate(entry.id);
      expect(loaded.website.id).toBe(entry.website.id);
      expect(loaded.website.pages.length).toBeGreaterThan(0);
      loaded.website.pages.forEach((page) => {
        expect(loaded.website.components[page.rootNodeId]).toBeDefined();
      });
    });
  });

  it('keeps the initial selector and the in-editor selector on the same full-template metadata', () => {
    const entries = getFullWebsiteTemplates();
    const metadata = getFullWebsiteTemplateMetadata();

    expect(metadata.map((entry) => entry.id)).toEqual(entries.map((entry) => entry.id));
    expect(new Set(metadata.map((entry) => entry.id)).size).toBe(metadata.length);
  });

  it('loads every section subtree and its root node through the section category', () => {
    const entries = getSectionTemplateRecords();
    expect(entries.length).toBeGreaterThan(0);

    entries.forEach((entry) => {
      const loaded = loadSectionTemplate(entry.id);
      expect(loaded.template.nodes[loaded.template.rootNodeId]).toBeDefined();
    });
    const sectionIds = new Set(entries.map((entry) => entry.id));
    expect(templateRegistry.getThemePresets().every((entry) => !sectionIds.has(entry.id))).toBe(
      true
    );
  });

  it('keeps a restorable products section available in the page-builder section library', () => {
    expect(sectionCategoriesList.some((category) => category.id === 'products')).toBe(true);

    const productTemplate = getSectionTemplateRecords().find(
      (entry) => entry.template.category === 'products'
    );
    expect(productTemplate).toBeDefined();

    const loaded = loadSectionTemplate(productTemplate!.id);
    const root = loaded.template.nodes[loaded.template.rootNodeId];
    expect(root.type).toBe('products');
    expect(root.props.title).toBeTruthy();
    expect(root.props.columnsDesktop).toBeGreaterThan(0);
  });

  it('loads every visual theme preset without treating it as a website template', () => {
    const entries = getThemePresetRecords();
    expect(entries.length).toBeGreaterThan(0);

    entries.forEach((entry) => {
      const loaded = loadThemePreset(entry.id);
      expect(loaded.preset.tokens).toBeDefined();
      expect(loaded.category).toBe('theme-preset');
    });
    expect(resolveFullWebsiteTemplateId(entries[0].id)).toBeNull();
  });

  it('resolves known legacy full-template IDs to canonical records', () => {
    expect(resolveFullWebsiteTemplateId('site_fashion_boutique')).toBe('site_opal_fashion');
    expect(loadFullWebsiteTemplate('site_fashion_boutique').id).toBe('site_opal_fashion');
    Object.entries(legacyFullWebsiteIds).forEach(([legacyId, canonicalId]) => {
      expect(resolveFullWebsiteTemplateId(legacyId)).toBe(canonicalId);
    });
  });

  it('reports duplicate template IDs instead of silently overwriting one record', () => {
    const theme = getThemePresetRecords()[0];
    const result = validateTemplateEntries([theme, theme]);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_ID', templateId: theme.id }),
      ])
    );
  });

  it('rejects unsupported schemas, categories, and missing required template data', () => {
    const theme = getThemePresetRecords()[0];
    const unsupported = validateTemplateEntry({ ...theme, schemaVersion: 'theme-preset/v999' });
    const invalidCategory = validateTemplateEntry({ ...theme, category: 'website-theme' });
    const missingData = validateTemplateEntry({
      ...theme,
      preset: undefined,
      presetKey: '',
    });

    expect(unsupported.errors[0].code).toBe('UNSUPPORTED_SCHEMA');
    expect(invalidCategory.errors[0].code).toBe('INVALID_CATEGORY');
    expect(missingData.errors[0].code).toBe('MISSING_REQUIRED');
  });

  it('rejects invalid full website page and component relationships', () => {
    const entry = getFullWebsiteTemplates()[0];
    const invalidWebsite = {
      ...entry,
      website: {
        ...entry.website,
        pages: [{ ...entry.website.pages[0], rootNodeId: 'missing-root' }],
        components: {
          ...entry.website.components,
          broken: {
            id: 'broken',
            type: 'container',
            category: 'layout',
            childrenIds: ['missing-child'],
            props: {},
            styles: {},
          },
        },
      },
    };

    const result = validateTemplateEntry(invalidWebsite);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'INVALID_RELATIONSHIP' })])
    );
  });

  it('rejects a component whose declared parent disagrees with the page tree', () => {
    const entry = loadFullWebsiteTemplate('site_restaurant_cafe');
    const hero = entry.website.components.rest_hero;
    const invalidWebsite = {
      ...entry,
      website: {
        ...entry.website,
        components: {
          ...entry.website.components,
          [hero.id]: { ...hero, parentId: 'orphaned-parent' },
        },
      },
    };

    expect(validateTemplateEntry(invalidWebsite).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'INVALID_RELATIONSHIP' })])
    );
  });

  it('rejects broken section subtrees and gives duplicated source sections distinct registry IDs', () => {
    const section = getSectionTemplateRecords()[0];
    const invalidSection = {
      ...section,
      template: {
        ...section.template,
        nodes: {
          ...section.template.nodes,
          [section.template.rootNodeId]: {
            ...section.template.nodes[section.template.rootNodeId],
            childrenIds: ['missing-child'],
          },
        },
      },
    };

    expect(validateTemplateEntry(invalidSection).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'INVALID_RELATIONSHIP' })])
    );

    const duplicateIds = getTemplateRegistryAudit().duplicateSectionTemplateIds['eg-trust-badges'];
    expect(duplicateIds).toHaveLength(2);
    expect(new Set(duplicateIds).size).toBe(2);
    expect(duplicateIds.every((id) => loadSectionTemplate(id).template.id === id)).toBe(true);
  });

  it('restores legacy merchant websites without replacing them with a registry template', () => {
    const merchantWebsite = {
      id: 'merchant_custom_site',
      name: 'Merchant custom content',
      pages: [
        {
          id: 'page_home',
          name: 'Home',
          slug: '',
          rootNodeId: 'merchant_root',
          metadata: { isHomePage: true },
        },
      ],
      components: {
        merchant_root: {
          id: 'merchant_root',
          name: 'Merchant root',
          type: 'container',
          category: 'layout',
          parentId: null,
          childrenIds: ['merchant_content'],
          props: {},
          styles: {},
        },
        merchant_content: {
          id: 'merchant_content',
          name: 'Merchant content',
          type: 'heading',
          category: 'typography',
          parentId: 'merchant_root',
          childrenIds: [],
          props: { text: 'Keep my content' },
          styles: {},
        },
      },
    };

    const result = getInitialBuilderState({
      lastActiveSite: JSON.stringify(merchantWebsite),
      selectedTemplate: null,
    });

    expect(result.website.id).toBe('merchant_custom_site');
    expect(result.website.components.merchant_content.props.text).toBe('Keep my content');
    expect(result.templateId).toBe('merchant_custom_site');
  });

  it('surfaces an invalid selection while keeping an existing merchant website intact', () => {
    const merchantWebsite = {
      id: 'merchant_saved_site',
      name: 'Saved merchant site',
      pages: [{ id: 'page_home', name: 'Home', slug: '', rootNodeId: 'root' }],
      components: {
        root: {
          id: 'root',
          name: 'Root',
          type: 'container',
          category: 'layout',
          parentId: null,
          childrenIds: [],
          props: {},
          styles: {},
        },
      },
    };

    const result = getInitialBuilderState({
      selectedTemplate: 'missing-template-id',
      lastActiveSite: JSON.stringify(merchantWebsite),
    });

    expect(result.templateError).toContain('missing-template-id');
    expect(result.website.id).toBe('merchant_saved_site');
    expect(result.website.name).toBe('Saved merchant site');
  });

  it('reports source counts and known overlaps for the migration map', () => {
    const audit = getTemplateRegistryAudit();
    expect(audit.registryCounts.fullWebsite).toBe(getFullWebsiteTemplates().length);
    expect(audit.registryCounts.section).toBe(getSectionTemplateRecords().length);
    expect(audit.registryCounts.theme).toBe(getThemePresetRecords().length);
    expect(audit.overlappingWebsiteIds).toContain('site_al_majd_auto');
    expect(audit.legacyAliases.site_fashion_boutique).toBe('site_opal_fashion');
  });
});
