import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Button, Image, Alert, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { useTranslation } from '../../context/TranslationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageStorage } from '../../utils/imageStorage';
import Constants from 'expo-constants';
import { checkServerConnection } from '../../utils/networkUtils';

// Add this type definition at the top
interface ImageVariation {
  variation: string;
  landmarks: any[];
  image_data: string;
  orb_results?: OrbResults;
}

interface OrbResults {
  num_keypoints: number;
  keypoints_image: string;
  descriptors: number[][];
}

export default function SettingsScreen() {
  const { targetLanguage, setTargetLanguage, supportedLanguages, translateText } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [personName, setPersonName] = useState('');
  const [imageUris, setImageUris] = useState<{ name: string; uri: string; variations?: ImageVariation[] }[]>([]);
  const [translations, setTranslations] = useState({
    label: 'Select Language:',
    languages: {} as Record<string, string>
  });
  const [pitch, setPitch] = useState(1.0);
  const [rate, setRate] = useState(0.9);
  const [processedNames, setProcessedNames] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Add this after the existing state declarations
  const MAX_IMAGES = 7;

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

  // Remove or modify the translateUIElements function
const translateUIElements = async () => {
    if (targetLanguage === 'en') {
      setTranslations({
        label: 'Select Language:',
        languages: {}
      });
      return;
    }

    setIsLoading(true);
    try {
      const translatedLabel = await translateText('Select Language:');

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

  // Modify the openCameraMultiple function
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
  
    // Check for existing images
    const storedImages = await ImageStorage.getStoredImages();
    if (storedImages.length > 0) {
      Alert.alert(
        'Existing Images',
        'There are already captured images. What would you like to do?',
        [
          {
            text: 'Upload Existing',
            onPress: () => uploadImages()
          },
          {
            text: 'Delete & Capture New',
            onPress: async () => {
              await ImageStorage.clearStoredImages();
              setImageUris([]);
              captureNewImages();
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
      return;
    }
  
    await captureNewImages();
  };
  
  // Add this new function for capturing images
  const captureNewImages = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed to take pictures.');
      return;
    }
  
    try {
      const capturedImages: { name: string; uri: string }[] = [];
      let captured = 0;
  
      while (captured < MAX_IMAGES) {
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
        });
  
        if (result.canceled || result.assets.length === 0) break;
  
        const newUri = result.assets[0].uri;
        await ImageStorage.saveImage(personName.trim(), newUri);
        
        capturedImages.push({ name: personName.trim(), uri: newUri });
        setImageUris((prev) => [...prev, { name: personName.trim(), uri: newUri }]);
        captured++;
  
        // Show remaining images count
        if (captured < MAX_IMAGES) {
          Alert.alert(
            'Image Captured',
            `${captured} images captured. ${MAX_IMAGES - captured} remaining.`
          );
        }
      }
  
      if (captured === MAX_IMAGES) {
        Alert.alert('Maximum Reached', `${MAX_IMAGES} images captured successfully for ${personName.trim()}`);
      } else {
        Alert.alert('Capture Complete', `${captured} images captured for ${personName.trim()}`);
      }
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

  // Add this function
  const checkConnection = async () => {
    const SERVER_IP = process.env.SERVER_IP || '192.168.1.108';
    const isConnected = await checkServerConnection(SERVER_IP);
    
    if (!isConnected) {
      Alert.alert(
        'Connection Error',
        'Cannot connect to server. Please check:\n\n' +
        '1. Server is running\n' +
        '2. Device is connected to network\n' +
        '3. Server IP is correct\n\n' +
        `Current server IP: ${SERVER_IP}`
      );
      return false;
    }
    return true;
  };

  // Replace the uploadImages function
  const uploadImages = async () => {
    if (!personName.trim()) {
      Alert.alert('Missing Name', 'Please enter a person name before uploading images.');
      return;
    }
  
    const storedImages = await ImageStorage.getStoredImages();
    if (storedImages.length === 0) {
      Alert.alert('No Images', 'Please capture images first.');
      return;
    }
  
    setIsLoading(true);
    try {
      // Log the stored images for debugging
      console.log('Stored images:', storedImages);
  
      const formData = new FormData();
      storedImages.forEach((img, idx) => {
        // Ensure proper file name and type
        formData.append('images', {
          uri: img.uri,
          type: 'image/jpeg',
          name: `${personName.trim() || 'unnamed'}_${idx}.jpg`,
        } as any);
  
        // Log each image being added to formData
        console.log(`Adding image ${idx} to formData:`, img.uri);
      });
  
      const SERVER_IP = process.env.SERVER_IP || '192.168.1.108';
      console.log('Attempting to connect to:', SERVER_IP);
  
      // First verify server connection
      const isConnected = await checkServerConnection(SERVER_IP);
      if (!isConnected) {
        throw new Error('Server connection failed');
      }
  
      const response = await fetch(`http://${SERVER_IP}:8000/facemesh/process-images/`, {
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
      console.log('Server response:', result);
  
      if (result.error) {
        throw new Error(result.error);
      }
  
      // Update imageUris with variations
      setImageUris(prev => prev.map(img => {
        const resultData = result.results.find(r => 
          r.filename.startsWith(img.name)
        );
        return {
          ...img,
          variations: resultData?.variations || []
        };
      }));
  
      // Store the name
      if (personName) {
        await ImageStorage.addProcessedName(personName.trim());
        setProcessedNames(prev => [...new Set([...prev, personName.trim()])]);
      }
  
      Alert.alert(
        'Processing Complete',
        `Facial landmarks processed for: ${personName}`
      );
  
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Network Error', 
        'Failed to process images. Please check:\n\n' +
        '1. Server is running\n' +
        '2. Device is connected to network\n' +
        '3. Server IP is correct\n\n' +
        `Error: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new function to handle image deletion
  const handleDeleteImages = async () => {
    Alert.alert(
      'Delete Images',
      'Are you sure you want to delete all captured images?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await ImageStorage.clearStoredImages();
            setImageUris([]);
            setPersonName('');
            Alert.alert('Success', 'All captured images have been deleted');
          }
        }
      ]
    );
  };

  const handleDeleteLandmark = async (name: string) => {
    Alert.alert(
      'Delete Landmarks',
      `Are you sure you want to delete landmarks for ${name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ImageStorage.deleteProcessedName(name);
              setProcessedNames(prev => prev.filter(n => n !== name));
              Alert.alert('Success', `Landmarks for ${name} deleted successfully`);
            } catch (error) {
              console.error('Error deleting landmarks:', error);
              Alert.alert('Error', 'Failed to delete landmarks');
            }
          }
        }
      ]
    );
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

  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(`ws://${process.env.SERVER_IP}:8000/ws/video?target=${targetLanguage}`);
      
      ws.onopen = () => {
        console.log('WebSocket Connected');
        setWsConnected(true);
      };

      ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket Closed');
        setWsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      return ws;
    } catch (error) {
      console.error('WebSocket Connection Error:', error);
      return null;
    }
  }, [targetLanguage]);

  useEffect(() => {
    const ws = connectWebSocket();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket]);

  // Add this function after other handlers
  const handleUseLandmarks = async (name: string) => {
    try {
        setIsLoading(true);
        
        const storedImages = await ImageStorage.getStoredImages();
        if (storedImages.length === 0) {
            Alert.alert('No Images', 'Please capture images first before using landmarks.');
            return;
        }

        const landmarks = await ImageStorage.getLandmarks(name);
        if (!landmarks || landmarks.length === 0) {
            Alert.alert('Error', 'No landmarks found for this person.');
            return;
        }

        console.log(`Using ${landmarks.length} landmarks for ${name}`);

        const formData = new FormData();
        storedImages.forEach((img, idx) => {
            formData.append('images', {
                uri: img.uri,
                type: 'image/jpeg',
                name: `${name}_${idx}.jpg`,
            } as any);
        });

        const SERVER_IP = process.env.SERVER_IP || '192.168.1.108';
        console.log('Sending request to:', `http://${SERVER_IP}:8000/orb/process-orb/`);

        // First verify server connection
        const isConnected = await checkServerConnection(SERVER_IP);
        if (!isConnected) {
            throw new Error('Server connection failed');
        }

        const orbResponse = await fetch(`http://${SERVER_IP}:8000/orb/process-orb/`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
                'X-Landmarks': JSON.stringify(landmarks)
            },
        });

        if (!orbResponse.ok) {
            throw new Error(`Server error: ${orbResponse.status}`);
        }

        const orbResult = await orbResponse.json();
        
        if (orbResult.error) {
            throw new Error(orbResult.error);
        }

        if (!orbResult.results || orbResult.results.length === 0) {
            throw new Error('No results returned from server');
        }

        // Update images with ORB results
        setImageUris(prev => prev.map(img => ({
            ...img,
            variations: [{
                variation: 'ORB with stored landmarks',
                landmarks: landmarks,
                image_data: orbResult.results[0].orb_results.keypoints_image,
                orb_results: orbResult.results[0].orb_results
            }]
        })));

        Alert.alert(
            'Success', 
            `Processed ${orbResult.results[0].orb_results.num_keypoints} keypoints\n` +
            `using ${landmarks.length} landmarks from ${name}`
        );

    } catch (error) {
        console.error('Error using landmarks:', error);
        Alert.alert(
            'Processing Error', 
            `Failed to process images: ${error.message}\n\n` +
            'Check the terminal for more details.'
        );
    } finally {
        setIsLoading(false);
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
        <Text style={styles.sectionTitle}>Person List</Text>
        {processedNames.length > 0 ? (
          <View style={styles.namesGrid}>
            {processedNames.map((name, index) => (
              <View key={index} style={styles.nameCard}>
                <View style={styles.nameHeader}>
                  <Text style={styles.nameText}>{name}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteLandmark(name)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No persons added yet</Text>
        )}
      </View>

      <TextInput
        placeholder="Enter person name"
        value={personName}
        onChangeText={setPersonName}
        style={styles.input}
      />

      <View style={styles.buttonContainer}>
        <Button title="Capture 7 Images" onPress={openCameraMultiple} />
        <Button title="Upload Images" onPress={uploadImages} />
        {imageUris.length > 0 && (
          <TouchableOpacity 
            onPress={handleDeleteImages}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>Delete All Images</Text>
          </TouchableOpacity>
        )}
      </View>

      {imageUris.map((img, idx) => (
        <View key={idx} style={styles.imageVariationsContainer}>
          <Text style={styles.variationTitle}>
            {img.name} - Image {idx + 1}
            {img.variations?.[0]?.orb_results && 
              ` (${img.variations[0].orb_results.num_keypoints} keypoints)`
            }
          </Text>
          <ScrollView horizontal={true} style={styles.variationsScroll}>
            <Image
              source={{ uri: img.uri }}
              style={styles.imageVariation}
            />
            {img.variations?.map((variation: ImageVariation, varIdx: number) => (
              <View key={varIdx} style={styles.variationContainer}>
                <Text style={styles.variationLabel}>
                  {variation.variation}
                  {variation.orb_results && 
                    ` (${variation.orb_results.num_keypoints} keypoints)`
                  }
                </Text>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${variation.image_data}` }}
                  style={styles.imageVariation}
                />
              </View>
            ))}
          </ScrollView>
        </View>
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
    borderLeftColor: '#2196F3', // Changed to blue to remove the "landmark" association
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
  nameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  imageVariationsContainer: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  variationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  variationsScroll: {
    flexDirection: 'row',
  },
  variationContainer: {
    marginRight: 10,
    alignItems: 'center',
  },
  imageVariation: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 10,
  },
  variationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  buttonContainer: {
    marginVertical: 10,
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
});