import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = {
  code: string;
  name: string;
};

interface LanguageState {
  source: string;
  target: string;
}

interface TranslationContextType {
  sourceLanguage: string;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => Promise<void>;
  supportedLanguages: Language[];
  translateText: (text: string) => Promise<string>;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' }
];

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const SERVER_IP = "192.168.43.22";

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [languages, setLanguages] = useState<LanguageState>({
    source: 'en',
    target: 'en'
  });

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedState = await AsyncStorage.getItem('languageState');
      if (savedState) {
        setLanguages(JSON.parse(savedState));
      }
    } catch (error) {
      console.error('Error loading language preferences:', error);
    }
  };

  const handleSetTargetLanguage = async (newTarget: string) => {
    const oldTarget = languages.target;
    setLanguages(prev => ({
      source: prev.target, // Previous target becomes new source
      target: newTarget
    }));

    try {
      await AsyncStorage.setItem('languageState', JSON.stringify({
        source: oldTarget,
        target: newTarget
      }));
    } catch (error) {
      console.error('Error saving language preferences:', error);
    }
  };

  const translateText = async (text: string): Promise<string> => {
    if (languages.source === languages.target) return text;

    try {
      const response = await fetch(`http://${SERVER_IP}:8000/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          source_lang: languages.source,
          target_lang: languages.target
        })
      });
      
      if (!response.ok) throw new Error('Translation request failed');
      
      const data = await response.json();
      return data.translated_text || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  return (
    <TranslationContext.Provider value={{
      sourceLanguage: languages.source,
      targetLanguage: languages.target,
      setTargetLanguage: handleSetTargetLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      translateText
    }}>
      {children}
    </TranslationContext.Provider>
  );
}

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};

