import { SectionTemplate } from '../types';
import { productDetailTemplates } from './productDetail';
import { navbarTemplates } from './navbar';
import { heroTemplates } from './hero';
import { featuresTemplates } from './features';
import { aboutTemplates } from './about';
import { galleryTemplates } from './gallery';
import { pricingTemplates } from './pricing';
import { contentTemplates } from './content';
import { accordionTemplates } from './accordion';
import { testimonialsTemplates } from './testimonials';
import { contactTemplates } from './contact';
import { ctaTemplates } from './cta';
import { footerTemplates } from './footer';
import { statsTemplates } from './stats';
import { authTemplates } from './auth';
import { tabsTemplates } from './tabs';

export const allSectionTemplates: SectionTemplate[] = [
  ...productDetailTemplates,
  ...navbarTemplates,
  ...heroTemplates,
  ...featuresTemplates,
  ...aboutTemplates,
  ...galleryTemplates,
  ...pricingTemplates,
  ...contentTemplates,
  ...accordionTemplates,
  ...testimonialsTemplates,
  ...contactTemplates,
  ...ctaTemplates,
  ...footerTemplates,
  ...statsTemplates,
  ...authTemplates,
  ...tabsTemplates,
];

export * from './productDetail';
export * from './navbar';
export * from './hero';
export * from './features';
export * from './about';
export * from './gallery';
export * from './pricing';
export * from './content';
export * from './accordion';
export * from './testimonials';
export * from './contact';
export * from './cta';
export * from './footer';
export * from './stats';
export * from './auth';
export * from './tabs';
