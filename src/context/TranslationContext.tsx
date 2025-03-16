import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_IP = "192.168.43.22";

type Language = {
  code: string;
  name: string;
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' }
];

interface TranslationContextType {
  targetLanguage: string;
  setTargetLanguage: (lang: string) => Promise<void>;
  supportedLanguages: Language[];
  translateText: (text: string) => Promise<string>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const getStoredLanguage = async (): Promise<string> => {
  try {
    const lang = await AsyncStorage.getItem('targetLanguage');
    return lang || 'en';
  } catch {
    return 'en';
  }
};

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [isChanging, setIsChanging] = useState(false);

  // Load language preference once on startup
  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await getStoredLanguage();
      setTargetLanguage(storedLang);
    };
    loadLanguage();
  }, []);

  const translateText = async (text: string): Promise<string> => {
    if (!text || targetLanguage === 'en') {
      return text;
    }

    try {
      const response = await fetch(`http://${SERVER_IP}:8000/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          target_lang: targetLanguage
        })
      });

      if (!response.ok) throw new Error('Translation failed');
      
      const data = await response.json();
      return data.translated_text || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const handleSetTargetLanguage = async (lang: string): Promise<void> => {
    // Prevent concurrent language changes
    if (isChanging) return;
    
    try {
      setIsChanging(true);
      
      // Only update if language actually changed
      if (lang !== targetLanguage) {
        // Update state first to improve responsiveness
        setTargetLanguage(lang);
        
        // Then persist to storage
        await AsyncStorage.setItem('targetLanguage', lang);
        console.log(`✅ Language saved to storage: ${lang}`);
      }
    } catch (error) {
      console.error('Error saving language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <TranslationContext.Provider value={{
      targetLanguage,
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

