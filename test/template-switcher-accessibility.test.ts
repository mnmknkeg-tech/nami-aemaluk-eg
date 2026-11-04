import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ActivityTemplateSwitcher,
  isTemplateSwitcherActivationKey,
} from '../apps/dashboard-web/src/components/website-builder/components/header/ActivityTemplateSwitcher';

jest.mock('../apps/dashboard-web/src/components/website-builder/context/BuilderContext', () => ({
  useBuilder: () => ({
    activeTemplateId: 'template-1',
    allTemplatesList: [
      {
        id: 'template-1',
        tenantId: 'tenant-1',
        name: 'قالب تجريبي',
        category: 'عام',
        description: 'وصف',
        tags: [],
        icon: 'T',
        primaryColor: '#2563eb',
      },
    ],
    switchWebsite: jest.fn(),
    website: { tenantId: 'tenant-1' },
  }),
}));

describe('ActivityTemplateSwitcher accessibility', () => {
  it('exposes a dialog trigger relationship and expanded state', () => {
    const html = renderToStaticMarkup(React.createElement(ActivityTemplateSwitcher));
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('قالب تجريبي');
  });

  it('uses Enter and Space as template card activation keys', () => {
    expect(isTemplateSwitcherActivationKey('Enter')).toBe(true);
    expect(isTemplateSwitcherActivationKey(' ')).toBe(true);
    expect(isTemplateSwitcherActivationKey('Tab')).toBe(false);
  });
});
