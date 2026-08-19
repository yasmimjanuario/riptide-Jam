import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ptBR from '../locales/pt-BR.json';
import enUS from '../locales/en-US.json';

/**
 * i18n setup. Every UI string must go through a translation key
 * (`t('game.newLevel')`), never hardcoded in a component — even while only
 * these two locales are populated, so adding a third later needs no
 * component rewrites.
 *
 * The brand name "Riptide Jam" is deliberately NOT part of the translation
 * tables: it stays in English in every locale.
 */
export const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en-US': { translation: enUS },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
    detection: {
      // Detect the device/browser language on first visit; remember an
      // explicit manual choice (settings screen, later) in localStorage.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'riptideJam.language',
    },
  });

export default i18n;
