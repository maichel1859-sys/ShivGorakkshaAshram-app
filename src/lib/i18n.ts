import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language files
import enTranslations from '@/locales/en.json';
import hiTranslations from '@/locales/hi.json';
import mrTranslations from '@/locales/mr.json';

const resources = {
  en: {
    translation: enTranslations
  },
  hi: {
    translation: hiTranslations
  },
  mr: {
    translation: mrTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Language utilities
export const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
];

export const getCurrentLanguage = () => i18n.language;

export const changeLanguage = (language: string) => {
  i18n.changeLanguage(language);
  // Store in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('i18nextLng', language);
  }
};

// Date formatting utilities
export const formatDate = (date: Date | string, language?: string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const lang = language || getCurrentLanguage();
  
  return dateObj.toLocaleDateString(lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatTime = (date: Date | string, language?: string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const lang = language || getCurrentLanguage();
  
  return dateObj.toLocaleTimeString(lang, {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (date: Date | string, language?: string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const lang = language || getCurrentLanguage();
  
  return dateObj.toLocaleString(lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Number formatting utilities
export const formatNumber = (number: number, language?: string) => {
  const lang = language || getCurrentLanguage();
  return number.toLocaleString(lang);
};

export const formatCurrency = (amount: number, currency = 'INR', language?: string) => {
  const lang = language || getCurrentLanguage();
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency,
  }).format(amount);
};

// Direction utilities for RTL support
export const isRTL = (language?: string) => {
  const lang = language || getCurrentLanguage();
  return ['ar', 'he', 'fa', 'ur'].includes(lang);
};

export const getTextDirection = (language?: string) => {
  return isRTL(language) ? 'rtl' : 'ltr';
}; 