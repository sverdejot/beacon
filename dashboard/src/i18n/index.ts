import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en.json';

export type SupportedLang = 'es' | 'en';

export function getInitialLanguage(): SupportedLang {
  if (typeof window === 'undefined') return 'es';
  const path = window.location.pathname;
  if (path.startsWith('/en/') || path === '/en') return 'en';
  return 'es';
}

export function getLocalizedPath(targetLang: SupportedLang): string {
  if (typeof window === 'undefined') return '/';
  const path = window.location.pathname;

  // Strip current prefix
  let basePath = path;
  if (basePath.startsWith('/en/')) {
    basePath = basePath.slice(3);
  } else if (basePath === '/en') {
    basePath = '/';
  }

  if (targetLang === 'en') {
    return basePath === '/' ? '/en/' : `/en${basePath}`;
  }
  return basePath || '/';
}

let initialized = false;

export function initI18n(lang?: SupportedLang) {
  const language = lang ?? getInitialLanguage();

  if (!initialized) {
    i18next.use(initReactI18next).init({
      resources: {
        es: { translation: es },
        en: { translation: en },
      },
      lng: language,
      fallbackLng: 'es',
      interpolation: {
        escapeValue: false,
      },
    });
    initialized = true;
  } else if (i18next.language !== language) {
    i18next.changeLanguage(language);
  }
}

export { i18next };
