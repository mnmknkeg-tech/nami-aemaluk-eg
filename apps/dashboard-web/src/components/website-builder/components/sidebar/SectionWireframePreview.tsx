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
    case 'products':
      return (
        <div className="w-full rounded-xl border border-slate-200 bg-white p-2.5">
          <div className="mb-2 text-center">
            <span className="block text-[10px] font-bold text-slate-800">
              {template.nodes[template.rootNodeId]?.props.title || 'منتجات المتجر'}
            </span>
            <span className="mt-0.5 block text-[8px] text-slate-400">شبكة منتجات متجاوبة</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {['منتج مميز', 'وصل حديثاً', 'اختيار العملاء'].map((label, index) => (
              <div
                key={label}
                className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50"
              >
                <div
                  className={`h-10 ${
                    index === 1 ? 'bg-violet-100' : index === 2 ? 'bg-emerald-100' : 'bg-blue-100'
                  }`}
                />
                <div className="space-y-1 p-1.5">
                  <span className="block truncate text-[7px] font-bold text-slate-600">
                    {label}
                  </span>
                  <span className="block h-1 w-1/2 rounded bg-slate-300" />
                  <span className="block h-1.5 w-2/3 rounded bg-blue-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'product_detail':
      return <ProductDetailWireframe template={template} />;
    case 'navbar':
      return <NavbarWireframe template={template} />;
    case 'hero':
      return <HeroWireframe template={template} />;
    case 'features':
    case 'stats':
    case 'gallery':
      return <FeaturesWireframe template={template} />;
    case 'steps':
    case 'logos':
      return <ContentWireframe template={template} />;
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
