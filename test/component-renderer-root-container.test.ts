import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ComponentRenderer } from '../apps/dashboard-web/src/components/website-builder/components/canvas/ComponentRenderer';
import { useBuilder } from '../apps/dashboard-web/src/components/website-builder/context/BuilderContext';

jest.mock('../apps/dashboard-web/src/components/website-builder/context/BuilderContext', () => ({
  useBuilder: jest.fn(),
}));
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/HeaderRenderer',
  () => ({
    HeaderRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/HeroRenderer',
  () => ({
    HeroRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/ProductsRenderer',
  () => ({
    ProductsRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/PricingRenderer',
  () => ({
    PricingRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/AuthRenderer',
  () => ({
    AuthRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/FeaturesRenderer',
  () => ({
    FeaturesRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/FormRenderer',
  () => ({
    FormRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/FooterRenderer',
  () => ({
    FooterRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/FaqRenderer',
  () => ({
    FaqRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/ContactRenderer',
  () => ({
    ContactRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/UtilityRenderers',
  () => ({
    UtilityRenderers: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/canvas/renderers/BasicElementsRenderer',
  () => ({
    BasicElementsRenderer: () => null,
  })
);
jest.mock(
  '../apps/dashboard-web/src/components/website-builder/components/code/CustomCodeRenderer',
  () => ({
    CustomCodeRenderer: () => null,
  })
);

const useBuilderMock = useBuilder as jest.Mock;

const renderRootAt = (overrideViewport?: 'desktop' | 'tablet' | 'mobile') =>
  renderToStaticMarkup(
    React.createElement(ComponentRenderer, { nodeId: 'root', overrideViewport })
  );

const setBuilderState = () => {
  const website = {
    name: 'Test site',
    components: {
      root: {
        id: 'root',
        name: 'Root',
        type: 'container',
        category: 'layout',
        parentId: null,
        childrenIds: [],
        props: {},
        styles: {
          desktop: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '100vh',
            backgroundColor: '#ffffff',
          },
          tablet: { minHeight: '80vh' },
          mobile: { minHeight: '60vh' },
        },
      },
    },
    pages: [{ id: 'home', name: 'Home', slug: '/' }],
    theme: {},
  };
  useBuilderMock.mockReturnValue({
    // ComponentRenderer renders from the preview composite (saved website +
    // unsaved code drafts). With no drafts they are identical.
    website,
    previewWebsite: website,
    selectedNodeId: null,
    hoveredNodeId: null,
    selectNode: jest.fn(),
    setHoveredNode: jest.fn(),
    viewport: 'desktop',
    activePage: { id: 'home', rootNodeId: 'root' },
    switchPage: jest.fn(),
    cartCount: 0,
    setIsCartOpen: jest.fn(),
    addToCart: jest.fn(),
  });
};

describe('ComponentRenderer root container', () => {
  beforeEach(() => {
    setBuilderState();
  });

  it('keeps the tree default 100vh height and renders the empty-canvas prompt', () => {
    const markup = renderRootAt('desktop');

    expect(markup).toContain('min-height:100vh');
    // The default background token (#ffffff) renders as a live CSS variable so
    // later theme changes propagate without rewriting nodes.
    expect(markup).toContain('background-color:var(--ray-color-background)');
    expect(markup).toContain('الكانفاس فارغ حالياً');
    expect(markup).toContain('ابدأ بإضافة أقسام');
  });

  it('uses responsive root styles merged for the selected viewport', () => {
    const tabletMarkup = renderRootAt('tablet');
    const mobileMarkup = renderRootAt('mobile');

    expect(tabletMarkup).toContain('min-height:80vh');
    expect(mobileMarkup).toContain('min-height:60vh');
    expect(mobileMarkup).toContain('width:100%');
    expect(mobileMarkup).not.toContain('min-height:100vh');
  });
});
