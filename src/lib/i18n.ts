import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../app/translations/locales/en.json';
import hi from "../app/translations/locales/hi.json";

export const TRANSLATION_CACHE_PATH = `${FileSystem.documentDirectory}translations/`;

const resources = {
  en: { translation: en },
  hi: { translation: hi }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;