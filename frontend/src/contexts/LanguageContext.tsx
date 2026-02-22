/**
 * LanguageContext - Manages application language state
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getTranslations, type Language, type Translations, defaultLanguage } from '../i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Storage key
const LANGUAGE_STORAGE_KEY = 'nakari_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  // Load language on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && ['en', 'zh', 'ja'].includes(stored)) {
        setLanguageState(stored as Language);
      }
    } catch (error) {
      console.warn('Failed to load language from localStorage:', error);
    }
  }, []);

  // Save language to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Failed to save language to localStorage:', error);
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = getTranslations(language);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
