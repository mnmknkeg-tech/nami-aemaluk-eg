import React from 'react';
import { SectionTemplate } from '../../data/sectionLibrary';
import {
  ProductDetailWireframe,
  NavbarWireframe,
  HeroWireframe,
  FeaturesWireframe,
  PricingWireframe,
  ContentWireframe,
  FooterWireframe,
  AboutWireframe,
  AuthWireframe,
} from './wireframes';

interface Props {
  template: SectionTemplate;
}

export const SectionWireframePreview: React.FC<Props> = ({ template }) => {
  switch (template.category) {
    case 'product_detail':
      return <ProductDetailWireframe template={template} />;
    case 'navbar':
      return <NavbarWireframe template={template} />;
    case 'hero':
      return <HeroWireframe template={template} />;
    case 'features':
    case 'stats':
    case 'steps':
    case 'logos':
    case 'gallery':
      return <FeaturesWireframe template={template} />;
    case 'pricing':
      return <PricingWireframe template={template} />;
    case 'team':
    case 'tabs':
    case 'accordion':
    case 'testimonials':
    case 'contact':
    case 'cta':
    case 'content':
      return <ContentWireframe template={template} />;
    case 'footer':
      return <FooterWireframe template={template} />;
    case 'about':
      return <AboutWireframe template={template} />;
    case 'auth':
      return <AuthWireframe template={template} />;
    default:
      return null;
  }
};
