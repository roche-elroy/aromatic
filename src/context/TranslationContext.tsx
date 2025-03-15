import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = {
  code: string;
  name: string;
};

const SERVER_IP = '192.168.43.22';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
];

interface TranslationContextType {
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  supportedLanguages: Language[];
  translateText: (text: string) => Promise<string>;
  reconnectWebSocket?: () => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [wsReconnect, setWsReconnect] = useState<(() => void) | undefined>();

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('targetLanguage');
      if (saved) setTargetLanguage(saved);
    } catch (error) {
      console.error('Error loading language preference:', error);
    }
  };

  const handleSetTargetLanguage = async (lang: string) => {
    setTargetLanguage(lang);
    try {
      await AsyncStorage.setItem('targetLanguage', lang);
      if (wsReconnect) {
        wsReconnect();
      }
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const translateText = async (text: string): Promise<string> => {
    if (targetLanguage === 'en') return text;
    
    try {
      const response = await fetch(`http://${SERVER_IP}:8000/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          target_lang: targetLanguage
        })
      });
      const data = await response.json();
      return data.translated_text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const registerWebSocketReconnect = (callback: () => void) => {
    setWsReconnect(() => callback);
  };

  return (
    <TranslationContext.Provider value={{
      targetLanguage,
      setTargetLanguage: handleSetTargetLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      translateText,
      reconnectWebSocket: wsReconnect
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

