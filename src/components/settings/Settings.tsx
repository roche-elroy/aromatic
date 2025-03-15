import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from '../../context/TranslationContext';

export default function SettingsScreen() {
  const { targetLanguage, setTargetLanguage, supportedLanguages, translateText } = useTranslation();
  const [translations, setTranslations] = useState({
    title: 'Translation Settings',
    label: 'Select Language:'
  });

  useEffect(() => {
    translateUIElements();
  }, [targetLanguage]);

  const translateUIElements = async () => {
    if (targetLanguage !== 'en') {
      const translated = {
        title: await translateText('Translation Settings'),
        label: await translateText('Select Language:')
      };
      setTranslations(translated);
    } else {
      setTranslations({
        title: 'Translation Settings',
        label: 'Select Language:'
      });
    }
  };

  const handleLanguageChange = (lang: string) => {
    setTargetLanguage(lang);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{translations.title}</Text>
        
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>{translations.label}</Text>
          <Picker
            selectedValue={targetLanguage}
            onValueChange={handleLanguageChange}
            style={styles.picker}
          >
            {supportedLanguages.map((lang) => (
              <Picker.Item 
                key={lang.code} 
                label={lang.name} 
                value={lang.code} 
              />
            ))}
          </Picker>
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
});