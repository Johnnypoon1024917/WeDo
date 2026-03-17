import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import es from './es.json';
import zh from './zh.json';

const LANGUAGE_KEY = 'wedo_language';

const resources = {
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
};

const SUPPORTED_LANGUAGES = Object.keys(resources);

/**
 * Detect the best language to use:
 * 1. Check AsyncStorage for a saved override
 * 2. Fall back to device locale via expo-localization
 * 3. Default to 'en'
 */
async function detectLanguage(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
      return saved;
    }
  } catch {
    // AsyncStorage read failed — fall through to device locale
  }

  const locales = getLocales();
  if (locales.length > 0) {
    const deviceLang = locales[0].languageCode;
    if (deviceLang && SUPPORTED_LANGUAGES.includes(deviceLang)) {
      return deviceLang;
    }
  }

  return 'en';
}

// Initialize with 'en' synchronously, then update once AsyncStorage resolves
i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Async language detection — runs on app init
detectLanguage().then((lang) => {
  if (lang !== i18n.language) {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
export { LANGUAGE_KEY, SUPPORTED_LANGUAGES };
