import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Button, Image, Alert, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '../../context/TranslationContext';

export default function SettingsScreen() {
  const { targetLanguage, setTargetLanguage, supportedLanguages, translateText } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [personName, setPersonName] = useState('');
  const [imageUris, setImageUris] = useState<{ name: string; uri: string }[]>([]);
  const [translations, setTranslations] = useState({
    title: 'Translation Settings',
    label: 'Select Language:',
    languages: {} as Record<string, string>
  });

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
      const translatedTitle = await translateText('Translation Settings');
      const translatedLabel = await translateText('Select Language:');
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

  const getLanguageName = (lang: { code: string; name: string }) => {
    if (targetLanguage === 'en') return lang.name;
    return translations.languages[lang.code] || lang.name;
  };

  const openCameraMultiple = async () => {
    if (!personName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name before capturing images.');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed to take pictures.');
      return;
    }

    let captured = 0;
    while (captured < 15) {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
      });

      if (result.canceled || result.assets.length === 0) {
        break; // Stop if user cancels
      }

      const newUri = result.assets[0].uri;
      setImageUris((prev) => [...prev, { name: personName.trim(), uri: newUri }]);
      captured++;
    }

    Alert.alert('Capture Complete', `${captured} images captured for ${personName.trim()}`);
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

        <TextInput
          style={styles.input}
          placeholder="Enter person's name"
          value={personName}
          onChangeText={setPersonName}
        />

        <Button title="Capture 15 Images" onPress={openCameraMultiple} color="#007bff" />

        {imageUris.length > 0 && (
          <View style={styles.imageGallery}>
            {imageUris.map((item, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: item.uri }} style={styles.previewImage} />
                <Text style={styles.imageLabel}>{item.name}</Text>
              </View>
            ))}
          </View>
        )}
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
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  imageGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
  },
  imageWrapper: {
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  imageLabel: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
});
