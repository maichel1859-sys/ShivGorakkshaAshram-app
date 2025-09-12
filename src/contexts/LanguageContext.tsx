'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🚩',
  },
];

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (languageCode: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  isLoading: boolean;
  translations: Record<string, string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const { setLoadingState, loadingStates } = useAppStore();
  const isLoading = loadingStates['language-context'] || false;

  const loadTranslations = useCallback(async (languageCode: string) => {
    try {
      setLoadingState('language-context', true);
      const response = await fetch(`/locales/${languageCode}/common.json`);
      if (response.ok) {
        const translationData = await response.json();
        setTranslations(translationData);
      } else {
        console.warn(`Failed to load translations for ${languageCode}`);
        // Fallback to English if the language file doesn't exist
        if (languageCode !== 'en') {
          const fallbackResponse = await fetch('/locales/en/common.json');
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            setTranslations(fallbackData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading translations:', error);
    } finally {
      setLoadingState('language-context', false);
    }
  }, [setLoadingState]);

  const changeLanguage = async (languageCode: string) => {
    try {
      setCurrentLanguage(languageCode);
      
      // Update document direction for RTL languages
      const selectedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
      if (selectedLang?.rtl) {
        document.documentElement.dir = 'rtl';
      } else {
        document.documentElement.dir = 'ltr';
      }

      // Store preference in localStorage
      localStorage.setItem('preferred-language', languageCode);
      
      // Update HTML lang attribute
      document.documentElement.lang = languageCode;
      
      // Load new translations
      await loadTranslations(languageCode);
      
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let value: string | Record<string, string> = translations;
    
    for (const k of keys) {
      if (typeof value === 'object' && value !== null) {
        value = value[k];
        if (value === undefined) break;
      } else {
        break;
      }
    }
    
    return typeof value === 'string' ? value : fallback || key;
  };

  useEffect(() => {
    // Load saved language preference or default to English
    const savedLanguage = localStorage.getItem('preferred-language');
    const initialLanguage = savedLanguage && SUPPORTED_LANGUAGES.find(lang => lang.code === savedLanguage) 
      ? savedLanguage 
      : 'en';
    
    setCurrentLanguage(initialLanguage);
    loadTranslations(initialLanguage);
  }, [loadTranslations]);

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    t,
    isLoading,
    translations,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}