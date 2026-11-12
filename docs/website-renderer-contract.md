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

The shared contract covers style resolution, not all host markup. `NodeView`, `ComponentRenderer`, and `BuilderTreeRenderer` retain their existing specialized component renderers. In particular, `/shop` uses the marketplace cart and live product catalog; `/site` uses the published-site cart bridge; the Builder has editing selection behavior; and section preview renders a restricted, non-interactive subtree. These differences are intentional and should not be unified by changing commerce or editing behavior.

## Responsive style precedence

Responsive component styles inherit in this order: desktop defaults, then tablet overrides, then mobile overrides. A value saved for a narrower breakpoint wins over the inherited value. Layout safeguards use those explicit breakpoint values where supported (for example, authored mobile flex directions and grid column counts); viewport safety clamps such as `max-width: 100%` still apply. Theme typography supplies a rendering fallback and does not rewrite saved component styles, so changing a theme does not erase merchant breakpoint customizations.

The shared public header uses compact navigation at tablet and mobile breakpoints. On desktop, account/cart/contact actions occupy their own layout space beside the template header content instead of overlaying its navigation or CTA.

## Draft and published isolation

The Builder saves drafts through `builder_config`. Publishing snapshots that value into `builder_published_config`; public website reads select only the published snapshot. `/shop` additionally uses `getPublicBuilderConfig`, which rejects missing or unpublished responses before passing configuration to a public renderer. A later draft save therefore does not update either public Builder renderer until an explicit publish operation.

Legacy flat-site fallbacks remain available for stores without a published Builder snapshot. A legacy page is not expected to be pixel-identical to a Builder tree because it has a different input schema and renderer.

## Verification boundary

Automated style tests verify equivalent shared CSS for desktop, tablet, and mobile, including RTL-oriented typography choices. SSR and published-config tests cover structural rendering and draft/published selection. These checks do not prove pixel-level equivalence; browser screenshots are required for visual regression claims.
