# Website renderer contract

## Route and renderer map

| Surface                                  | Renderer                                                                            | Input and scope                                                                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder Canvas and standalone `/preview` | `ComponentRenderer`                                                                 | The current editable Builder website draft. Canvas selection controls are disabled in interactive preview; preview actions are handled without saving.              |
| Full website template preview            | `PublicSiteRenderer` and shared `NodeView`                                          | A template website in preview mode. It is not connected to the merchant's persisted draft or real catalog actions.                                                  |
| Section template preview                 | `PreviewNodeRenderer` in `LiveTemplatePreviewModal`                                 | A single section subtree. It is intentionally not a full-site renderer; actions are inert.                                                                          |
| Modern public `/site/[slug]`             | `SiteCartBridge` → `PublicSiteRenderer` → shared `NodeView`                         | A published Builder snapshot from `/shops/{slug}/website`; the bridge supplies the marketplace cart.                                                                |
| Modern public `/shop/[slug]`             | `ShopRenderer` → `BuilderTreeRenderer`                                              | A published Builder snapshot, rendered with marketplace-specific product and cart integration.                                                                      |
| Legacy public website fallback           | `LegacyPublishedSiteView` in `/site/[slug]` or `LegacyShopLayout` in `/shop/[slug]` | The existing flat `pageDesign` / legacy website format when a Builder snapshot is unavailable. These are compatibility paths, not alternate Builder-tree renderers. |

## Shared rendering contract

`computeThemeResponsiveNodeStyles` in `packages/shared/src/builder/responsiveStyles.ts` is the canonical breakpoint and typography style calculation used by the Canvas, shared public `NodeView`, marketplace Builder-tree renderer, and section-template preview. It applies the same saved-style conversion, responsive safeguards, and heading/body font selection. `PublicSiteRenderer` and `BuilderTreeRenderer` also establish the website's theme background, text color, body font, and direction at their respective root.

The shared contract covers style resolution, not all host markup. `NodeView`, `ComponentRenderer`, and `BuilderTreeRenderer` retain their existing specialized component renderers. The `/shop` tree renderer delegates its published primitives, hero, products, footer, contact form, and marketing sections to focused modules under `apps/marketplace-next/src/merchant-site/components/`; `BuilderTreeRenderer` remains the host adapter that owns recursive traversal, page navigation, viewport context, and the merchant-site cart. This extraction is structural only: it must not redirect `/shop` commerce to the marketplace cart or make the `/shop` and `/site` renderers share host-specific actions. In particular, `/shop` uses the marketplace cart and live product catalog; `/site` uses the published-site cart bridge; the Builder has editing selection behavior; and section preview renders a restricted, non-interactive subtree. These differences are intentional and should not be unified by changing commerce or editing behavior.

## Component tree ownership and compatibility

The canonical Builder tree is stored in the website-level `components` map. A page's `rootNodeId` selects its root, and each node's `childrenIds` array is the authoritative ordered list used for recursive rendering. `parentId` is a denormalized reverse link retained for editor operations, ancestry lookups, and validation; it must agree with the parent edge that lists the node.

`inspectWebsiteTree` reports duplicate child edges, multiple parents, cycles, unreachable nodes, and explicit `parentLinkConflicts` (missing parent, missing reverse child edge, or a parent mismatch). `normalizeWebsiteTree` remains a non-persistent compatibility adapter: it follows the ordered `childrenIds` edges, repairs reverse `parentId` links in its returned copy, detaches unsafe/unreachable edges, and retains detached component records for recovery. It does not write repaired data back to storage. This policy is deliberate so older saved sites are rendered deterministically while diagnostics expose the source-data inconsistency for later repair.

New editor operations and templates must update both sides of a parent-child relationship atomically. Do not change the source of truth or delete legacy nodes as part of a renderer refactor; any future migration must be versioned, tested against existing published snapshots, and applied at an explicit persistence boundary.

## Responsive style precedence

Responsive component styles inherit in this order: desktop defaults, then tablet overrides, then mobile overrides. A value saved for a narrower breakpoint wins over the inherited value. Layout safeguards use those explicit breakpoint values where supported (for example, authored mobile flex directions and grid column counts); viewport safety clamps such as `max-width: 100%` still apply. Theme typography supplies a rendering fallback and does not rewrite saved component styles, so changing a theme does not erase merchant breakpoint customizations.

The shared public header uses compact navigation at tablet and mobile breakpoints. On desktop, account/cart/contact actions occupy their own layout space beside the template header content instead of overlaying its navigation or CTA.

## Draft and published isolation

The Builder saves drafts through `builder_config`. Publishing snapshots that value into `builder_published_config`; public website reads select only the published snapshot. `/shop` additionally uses `getPublicBuilderConfig`, which rejects missing or unpublished responses before passing configuration to a public renderer. A later draft save therefore does not update either public Builder renderer until an explicit publish operation.

Legacy flat-site fallbacks remain available for stores without a published Builder snapshot. A legacy page is not expected to be pixel-identical to a Builder tree because it has a different input schema and renderer.

## Verification boundary

Automated style tests verify equivalent shared CSS for desktop, tablet, and mobile, including RTL-oriented typography choices. SSR and published-config tests cover structural rendering and draft/published selection. These checks do not prove pixel-level equivalence; browser screenshots are required for visual regression claims.


## Component registry version contract

The shared component registry exposes canonical and exact-persisted-key lookups.
`getComponentDefinition` resolves legacy aliases to their canonical definition;
`getPersistedComponentDefinition` preserves the literal stored key for
diagnostics and compatibility work. `getComponentVersion` and
`isComponentVersionCurrent` provide version checks without mutating saved
documents. The current registry version is `1` for all registered keys.

A version mismatch is diagnostic information only at this stage: loading and
rendering must continue to preserve legacy props. Do not reject or rewrite a
merchant document solely because a component version is old or newer until an
explicit, tested migration policy is introduced. Per-component defaults,
property schemas, renderer slots, and Inspector field metadata remain
intentionally unpopulated until they can be derived from actual insertion
factories and both editor/published renderer contracts.
