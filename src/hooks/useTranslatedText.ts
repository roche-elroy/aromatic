import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';

export function useTranslatedText(originalText: string) {
  const { translateText, targetLanguage } = useTranslation();
  const [translatedText, setTranslatedText] = useState(originalText);

  useEffect(() => {
    const translate = async () => {
      const translated = await translateText(originalText);
      setTranslatedText(translated);
    };
    translate();
  }, [originalText, targetLanguage]);

  return translatedText;
}