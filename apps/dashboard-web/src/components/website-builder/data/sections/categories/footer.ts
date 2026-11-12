import { SectionTemplate } from '../types';
import { footerTemplatesA } from './footerA';
import { footerTemplatesB } from './footerB';
import { footerTemplatesC } from './footerC';

export const footerTemplates: SectionTemplate[] = [
  ...footerTemplatesA,
  ...footerTemplatesB,
  ...footerTemplatesC,
];
