import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Button, Image, Alert, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { useTranslation } from '../../context/TranslationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageStorage } from '../../utils/imageStorage';

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
  const [pitch, setPitch] = useState(1.0);
  const [rate, setRate] = useState(0.9);
  const [processedNames, setProcessedNames] = useState<string[]>([]);

  // Initialize settings when component mounts
  useEffect(() => {
    const initializeSettings = async () => {
      await loadSpeechSettings();
    };
    initializeSettings();
  }, []);

  // Translate UI elements based on selected language
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
      const [translatedTitle, translatedLabel] = await Promise.all([ 
        translateText('Translation Settings'),
        translateText('Select Language:')
      ]);

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

  // Load saved speech settings from AsyncStorage
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

  const getLanguageName = (lang: { code: string; name: string }) => {
    if (targetLanguage === 'en') return lang.name;
    return translations.languages[lang.code] || lang.name;
  };

  const openCameraMultiple = async () => {
    if (!personName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name before capturing images.');
      return;
    }

    // Check if name already exists
    if (processedNames.includes(personName.trim())) {
      Alert.alert(
        'Name Already Exists',
        'This person\'s facial landmarks are already processed. Please use a different name.'
      );
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed to take pictures.');
      return;
    }

    try {
      const capturedImages: { name: string; uri: string }[] = [];
      let captured = 0;

      while (captured < 7) {
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
        });

        if (result.canceled || result.assets.length === 0) break;

        const newUri = result.assets[0].uri;
        // Save image to permanent storage
        await ImageStorage.saveImage(personName.trim(), newUri);
        
        capturedImages.push({ name: personName.trim(), uri: newUri });
        setImageUris((prev) => [...prev, { name: personName.trim(), uri: newUri }]);
        captured++;
      }

      Alert.alert('Capture Complete', `${captured} images captured for ${personName.trim()}`);
    } catch (error) {
      console.error('Error capturing images:', error);
      Alert.alert('Error', 'Failed to save images. Please try again.');
    }
  };

  // Load stored images on component mount
  useEffect(() => {
    const loadStoredImages = async () => {
      try {
        const stored = await ImageStorage.getStoredImages();
        setImageUris(stored.map(img => ({ name: img.name, uri: img.uri })));
      } catch (error) {
        console.error('Error loading stored images:', error);
      }
    };

    loadStoredImages();
  }, []);

  // Add this useEffect to load processed names
  useEffect(() => {
    const loadProcessedNames = async () => {
      const names = await ImageStorage.getProcessedNames();
      setProcessedNames(names);
    };
    loadProcessedNames();
  }, []);

  // Modify uploadImages to use stored images
  const uploadImages = async () => {
    const storedImages = await ImageStorage.getStoredImages();
    if (storedImages.length === 0) {
      Alert.alert('No Images', 'Please capture images first.');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      storedImages.forEach((img, idx) => {
        formData.append('images', {
          uri: img.uri,
          type: 'image/jpeg',
          name: `${img.name}_${idx}.jpg`,
        } as any);
      });

      // Use environment variable for server IP
      const response = await fetch(`http://${process.env.SERVER_IP}:8000/facemesh/process-images/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Store the name of the person whose images were just processed
      if (personName) {
        await ImageStorage.addProcessedName(personName.trim());
        setProcessedNames(prev => [...new Set([...prev, personName.trim()])]);
      }

      console.log('Face mesh processing complete:', result);
      Alert.alert(
        'Processing Complete',
        `Facial landmarks processed for: ${personName}`
      );

      // Clear stored images after successful upload
      await ImageStorage.clearStoredImages();
      setImageUris([]);
      setPersonName('');

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to process images. Please try again.');
    } finally {
      setIsLoading(false);
    }
};

  const handleDeleteLandmark = async (name: string) => {
    try {
      await ImageStorage.deleteProcessedName(name);
      setProcessedNames(prev => prev.filter(n => n !== name));
      Alert.alert('Success', `Landmarks for ${name} deleted successfully`);
    } catch (error) {
      console.error('Error deleting landmarks:', error);
      Alert.alert('Error', 'Failed to delete landmarks');
    }
  };

  const handleDeleteUnnamed = async () => {
    try {
      await ImageStorage.deleteUnnamedLandmarks();
      setProcessedNames(prev => prev.filter(name => name && name.trim() !== ''));
      Alert.alert('Success', 'Unnamed landmarks deleted successfully');
    } catch (error) {
      console.error('Error deleting unnamed landmarks:', error);
      Alert.alert('Error', 'Failed to delete unnamed landmarks');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {isLoading && <ActivityIndicator size="large" />}
      <Text style={styles.title}>{translations.title}</Text>

      <Text style={styles.label}>{translations.label}</Text>
      <Picker
        selectedValue={targetLanguage}
        onValueChange={handleLanguageChange}
        style={styles.picker}
      >
        {supportedLanguages.map((lang) => (
          <Picker.Item
            key={lang.code}
            label={getLanguageName(lang)}
            value={lang.code}
          />
        ))}
      </Picker>

      <Text style={styles.label}>Voice Pitch: {pitch.toFixed(2)}</Text>
      <Slider
        minimumValue={0.5}
        maximumValue={2.0}
        step={0.1}
        value={pitch}
        onValueChange={handlePitchChange}
        style={styles.slider}
      />

      <Text style={styles.label}>Voice Rate: {rate.toFixed(2)}</Text>
      <Slider
        minimumValue={0.5}
        maximumValue={1.5}
        step={0.1}
        value={rate}
        onValueChange={handleRateChange}
        style={styles.slider}
      />

      <View style={styles.processedNamesContainer}>
        <Text style={styles.sectionTitle}>Processed Facial Landmarks</Text>
        {processedNames.length > 0 ? (
          <>
            <View style={styles.namesGrid}>
              {processedNames.map((name, index) => (
                <View key={index} style={styles.nameCard}>
                  <View style={styles.nameHeader}>
                    <Text style={styles.nameText}>{name || 'Unnamed'}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteLandmark(name)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.processedText}>Landmarks Stored</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleDeleteUnnamed}
              style={styles.deleteUnnamedButton}
            >
              <Text style={styles.deleteUnnamedText}>Delete Unnamed Landmarks</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>No facial landmarks processed yet</Text>
        )}
      </View>

      <TextInput
        placeholder="Enter person name"
        value={personName}
        onChangeText={setPersonName}
        style={styles.input}
      />

      <Button title="Capture 7 Images" onPress={openCameraMultiple} />
      <Button title="Upload Images" onPress={uploadImages} />

      {imageUris.map((img, idx) => (
        <Image
          key={idx}
          source={{ uri: img.uri }}
          style={{ width: 100, height: 100, marginTop: 10 }}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    marginTop: 10,
    fontSize: 16,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginVertical: 10,
    borderRadius: 8,
  },
  processedNamesContainer: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  nameCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  namesGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  processedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  nameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteUnnamedButton: {
    backgroundColor: '#ff8888',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  deleteUnnamedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
