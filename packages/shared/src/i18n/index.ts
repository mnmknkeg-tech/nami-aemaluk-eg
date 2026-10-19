import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar';
import en from './locales/en';

const LANGUAGE_KEY = 'ray_lang';

function applyDirection(lang: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.classList.remove('rtl', 'ltr');
    document.documentElement.classList.add(lang === 'ar' ? 'rtl' : 'ltr');
  }
}

const savedLang = typeof localStorage !== 'undefined'
  ? localStorage.getItem(LANGUAGE_KEY) || 'ar'
  : 'ar';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    fallbackLng: 'ar',
    lng: savedLang,
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lang: string) => {
  applyDirection(lang);
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {}
});

applyDirection(i18n.language);

export default i18n;
export { LANGUAGE_KEY };
