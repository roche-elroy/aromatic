import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = {
  code: string;
  name: string;
};

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

interface TranslationContextType {
  sourceLanguage: string;
  targetLanguage: string;
  setSourceLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;
  supportedLanguages: Language[];
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('hi');

  useEffect(() => {
    // Load saved language preferences
    const loadLanguages = async () => {
      try {
        const savedSource = await AsyncStorage.getItem('sourceLanguage');
        const savedTarget = await AsyncStorage.getItem('targetLanguage');
        if (savedSource) setSourceLanguage(savedSource);
        if (savedTarget) setTargetLanguage(savedTarget);
      } catch (error) {
        console.error('Error loading language preferences:', error);
      }
    };
    loadLanguages();
  }, []);

  const handleSetSourceLanguage = async (lang: string) => {
    setSourceLanguage(lang);
    try {
      await AsyncStorage.setItem('sourceLanguage', lang);
    } catch (error) {
      console.error('Error saving source language:', error);
    }
  };

  const handleSetTargetLanguage = async (lang: string) => {
    setTargetLanguage(lang);
    try {
      await AsyncStorage.setItem('targetLanguage', lang);
    } catch (error) {
      console.error('Error saving target language:', error);
    }
  };

  return (
    <TranslationContext.Provider
      value={{
        sourceLanguage,
        targetLanguage,
        setSourceLanguage: handleSetSourceLanguage,
        setTargetLanguage: handleSetTargetLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};