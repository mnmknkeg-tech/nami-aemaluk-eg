'use client';

import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import arCommon from '@shared/i18n/locales/ar/common.json';
import arPublic from '@shared/i18n/locales/ar/public.json';
import arAuth from '@shared/i18n/locales/ar/auth.json';
import arHome from '@shared/i18n/locales/ar/home.json';
import arBusiness from '@shared/i18n/locales/ar/business.json';
import arBlog from '@shared/i18n/locales/ar/blog.json';
import enCommon from '@shared/i18n/locales/en/common.json';
import enPublic from '@shared/i18n/locales/en/public.json';
import enAuth from '@shared/i18n/locales/en/auth.json';
import enHome from '@shared/i18n/locales/en/home.json';
import enBusiness from '@shared/i18n/locales/en/business.json';
import enBlog from '@shared/i18n/locales/en/blog.json';

const resources = {
  ar: {
    common: arCommon,
    public: arPublic,
    auth: arAuth,
    home: arHome,
    business: arBusiness,
    blog: arBlog,
  },
  en: {
    common: enCommon,
    public: enPublic,
    auth: enAuth,
    home: enHome,
    business: enBusiness,
    blog: enBlog,
  },
} as const;

let instance: ReturnType<typeof createInstance> | null = null;

export function getI18n(lng: string = 'ar') {
  if (instance) return instance;

  instance = createInstance();
  instance.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'ar',
    defaultNS: 'common',
    ns: ['common', 'public', 'auth', 'home', 'business', 'blog'],
    interpolation: { escapeValue: false },
  });

  return instance;
}
