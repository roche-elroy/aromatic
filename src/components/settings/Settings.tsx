import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from '../../context/TranslationContext';

export default function SettingsScreen() {
  const { targetLanguage, setTargetLanguage, supportedLanguages, translateText } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [translations, setTranslations] = useState({
    title: 'Translation Settings',
    label: 'Select Language:',
    languages: {} as Record<string, string>
  });

  // Translate UI elements when language changes
  useEffect(() => {
    translateUIElements();
  }, [targetLanguage]);

  const translateUIElements = async () => {
    if (targetLanguage === 'en') {
      setTranslations({
        title: 'Translation Settings',
        label: 'Select Language:',
        languages: {}
      });
      return;
    }

    setIsLoading(true);
    try {
      // Translate static text
      const translatedTitle = await translateText('Translation Settings');
      const translatedLabel = await translateText('Select Language:');

      // Translate language names
      const translatedLanguages: Record<string, string> = {};
      for (const lang of supportedLanguages) {
        translatedLanguages[lang.code] = await translateText(lang.name);
      }

      setTranslations({
        title: translatedTitle,
        label: translatedLabel,
        languages: translatedLanguages
      });
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    setIsLoading(true);
    try {
      await setTargetLanguage(lang);
    } finally {
      setIsLoading(false);
    }
  };

  // Get translated language name or fall back to original
  const getLanguageName = (lang: { code: string; name: string }) => {
    if (targetLanguage === 'en') return lang.name;
    return translations.languages[lang.code] || lang.name;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{translations.title}</Text>
        
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>{translations.label}</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#0000ff" style={styles.loader} />
          ) : (
            <Picker
              selectedValue={targetLanguage}
              onValueChange={handleLanguageChange}
              style={styles.picker}
              enabled={!isLoading}
            >
              {supportedLanguages.map((lang) => (
                <Picker.Item 
                  key={lang.code} 
                  label={getLanguageName(lang)} 
                  value={lang.code} 
                />
              ))}
            </Picker>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  picker: {
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  loader: {
    marginVertical: 20,
  }
});