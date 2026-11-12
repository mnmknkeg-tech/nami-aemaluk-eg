import {
  getInitialBuilderState,
  createFullWebsiteTemplateCandidate,
  persistTemplateCandidateBeforeCommit,
} from '../apps/dashboard-web/src/components/website-builder/context/builderUtils';
import {
  loadFullWebsiteTemplate,
  loadSectionTemplate,
  loadThemePreset,
  validateTemplateEntry,
} from '../apps/dashboard-web/src/components/website-builder/data/registry';
import { restoreHistorySnapshot } from '../apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderHistory';
import type { Website } from '../packages/shared/src/builder/types';

const merchantWebsite: Website = {
  ...loadFullWebsiteTemplate('site_restaurant_cafe').website,
  id: 'merchant-site-id',
  tenantId: 'shop-123',
  name: 'Merchant site',
  domain: 'merchant.example.com',
  subdomain: 'merchant',
};

describe('full website template application', () => {
  it('creates a validated candidate for a new shop without carrying template tenant identity', () => {
    const entry = loadFullWebsiteTemplate('site_clinic_hospital');
    const candidate = createFullWebsiteTemplateCandidate(merchantWebsite, entry, {
      shopId: 'new-shop',
      shopSlug: 'new-shop',
      preserveExistingIdentity: false,
    });

    expect(candidate.id).toBe('new-shop');
    expect(candidate.tenantId).toBe('new-shop');
    expect(candidate.name).toBe(entry.website.name);
    expect(candidate.pages.length).toBeGreaterThan(0);
    expect(validateTemplateEntry({ ...entry, website: candidate }).valid).toBe(true);
  });

  it('preserves the current merchant website identity while replacing its template content', () => {
    const candidate = createFullWebsiteTemplateCandidate(
      merchantWebsite,
      loadFullWebsiteTemplate('site_opal_fashion'),
      {
        shopId: 'shop-123',
        shopSlug: 'merchant',
        preserveExistingIdentity: true,
      }
    );

    expect(candidate.id).toBe('merchant-site-id');
    expect(candidate.tenantId).toBe('shop-123');
    expect(candidate.name).toBe('Merchant site');
    expect(candidate.domain).toBe('merchant.example.com');
    expect(candidate.subdomain).toBe('merchant');
    expect(candidate.components).not.toEqual(merchantWebsite.components);
    expect(Object.keys(candidate.components).length).toBeGreaterThan(0);
  });

  it('keeps pages intact when applying a theme preset separately', () => {
    const preset = loadThemePreset('modernBlue');
    const updated = {
      ...merchantWebsite,
      theme: { ...merchantWebsite.theme, ...preset.preset.tokens },
    };

    expect(updated.pages).toBe(merchantWebsite.pages);
    expect(updated.components).toBe(merchantWebsite.components);
    expect(updated.theme).not.toBe(merchantWebsite.theme);
  });

  it('keeps section templates as sections rather than full website applications', () => {
    const section = loadSectionTemplate('eg-trust-badges');
    expect(section.category).toBe('section-template');
    expect(section.template.nodes[section.template.rootNodeId]).toBeDefined();
    expect(section).not.toHaveProperty('website');
  });

  it('rejects invalid page and component relationships before a candidate can be saved', () => {
    const entry = loadFullWebsiteTemplate('site_clinic_hospital');
    const invalidEntry = {
      ...entry,
      website: {
        ...entry.website,
        pages: [{ ...entry.website.pages[0], rootNodeId: 'missing-root' }],
      },
    };

    expect(() =>
      createFullWebsiteTemplateCandidate(merchantWebsite, invalidEntry, {
        shopId: 'shop-123',
        shopSlug: 'merchant',
        preserveExistingIdentity: true,
      })
    ).toThrow(/INVALID_RELATIONSHIP/);
  });

  it('does not commit when draft persistence fails', async () => {
    const candidate = createFullWebsiteTemplateCandidate(
      merchantWebsite,
      loadFullWebsiteTemplate('site_clinic_hospital'),
      {
        shopId: 'shop-123',
        shopSlug: 'merchant',
        preserveExistingIdentity: true,
      }
    );
    const commit = jest.fn();
    const saveDraft = jest.fn().mockResolvedValue(false);

    await expect(persistTemplateCandidateBeforeCommit(candidate, saveDraft, commit)).resolves.toBe(
      false
    );
    expect(saveDraft).toHaveBeenCalledWith(candidate);
    expect(commit).not.toHaveBeenCalled();
  });

  it('persists before commit, reloads the applied draft, and retains undo/redo snapshots', async () => {
    const previous = merchantWebsite;
    const candidate = createFullWebsiteTemplateCandidate(
      previous,
      loadFullWebsiteTemplate('site_clinic_hospital'),
      {
        shopId: 'shop-123',
        shopSlug: 'merchant',
        preserveExistingIdentity: true,
      }
    );
    let persistedDraft: Website | null = null;
    let committedWebsite = previous;
    const applied = await persistTemplateCandidateBeforeCommit(
      candidate,
      async (snapshot) => {
        persistedDraft = snapshot;
        return true;
      },
      (snapshot) => {
        committedWebsite = snapshot;
      }
    );

    expect(applied).toBe(true);
    expect(committedWebsite).toBe(candidate);
    expect(persistedDraft).toBe(candidate);

    const reloaded = getInitialBuilderState({
      lastActiveSite: JSON.stringify(persistedDraft),
      selectedTemplate: null,
    }).website;
    expect(reloaded.pages.map((page) => page.id)).toEqual(candidate.pages.map((page) => page.id));
    expect(Object.keys(reloaded.components).sort()).toEqual(
      Object.keys(candidate.components).sort()
    );
    reloaded.pages.forEach((page) => {
      expect(reloaded.components[page.rootNodeId]).toBeDefined();
    });

    const undone = restoreHistorySnapshot({
      direction: 'undo',
      current: candidate,
      past: [previous],
      future: [],
    });
    expect(undone?.website).toBe(previous);

    const redone = restoreHistorySnapshot({
      direction: 'redo',
      current: previous,
      past: [],
      future: [candidate],
    });
    expect(redone?.website).toBe(candidate);
  });

  it('does not initialize a gallery apply request as an already-applied website', () => {
    const initial = getInitialBuilderState({
      search: '?template=site_clinic_hospital&applyTemplate=1',
      selectedTemplate: 'site_clinic_hospital',
      selectedPreset: 'modernBlue',
    });

    expect(initial.templateId).toBe('blank');
    expect(initial.website.id).not.toBe('site_clinic_hospital');
  });
});
