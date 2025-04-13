import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { useTranslation } from '../../context/TranslationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { targetLanguage, setTargetLanguage, supportedLanguages, translateText } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [translations, setTranslations] = useState({
    title: 'Translation Settings',
    label: 'Select Language:',
    languages: {} as Record<string, string>
  });
  const [pitch, setPitch] = useState(1.0);
  const [rate, setRate] = useState(0.9);

  useEffect(() => {
    const initializeSettings = async () => {
      await loadSpeechSettings();
    };
    initializeSettings();
  }, []); // Run only once on mount

  useEffect(() => {
    if (targetLanguage) {
      translateUIElements();
    }
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
      // Batch translations together
      const [translatedTitle, translatedLabel] = await Promise.all([
        translateText('Translation Settings'),
        translateText('Select Language:')
      ]);

      // Batch language translations in chunks
      const translatedLanguages: Record<string, string> = {};
      const chunkSize = 5;
      for (let i = 0; i < supportedLanguages.length; i += chunkSize) {
        const chunk = supportedLanguages.slice(i, i + chunkSize);
        const translations = await Promise.all(
          chunk.map(lang => translateText(lang.name))
        );
        chunk.forEach((lang, index) => {
          translatedLanguages[lang.code] = translations[index];
        });
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

  const loadSpeechSettings = async () => {
    try {
      const savedPitch = await AsyncStorage.getItem('speech_pitch');
      const savedRate = await AsyncStorage.getItem('speech_rate');
      if (savedPitch) setPitch(parseFloat(savedPitch));
      if (savedRate) setRate(parseFloat(savedRate));
    } catch (error) {
      console.error('Error loading speech settings:', error);
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

  const handlePitchChange = async (value: number) => {
    setPitch(value);
    try {
      await AsyncStorage.setItem('speech_pitch', value.toString());
    } catch (error) {
      console.error('Error saving pitch:', error);
    }
  };

  const handleRateChange = async (value: number) => {
    setRate(value);
    try {
      await AsyncStorage.setItem('speech_rate', value.toString());
    } catch (error) {
      console.error('Error saving rate:', error);
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Speech Settings</Text>
        
        <View style={styles.sliderContainer}>
          <Text style={styles.label}>Pitch: {pitch.toFixed(1)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            value={pitch}
            onValueChange={handlePitchChange}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#000000"
          />
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.label}>Rate: {rate.toFixed(1)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={1.5}
            value={rate}
            onValueChange={handleRateChange}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#000000"
          />
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
  },
  sliderContainer: {
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});