import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const speak = async (text: string, language: string = 'en-US') => {
  try {
    // Stop any ongoing speech
    await Speech.stop();

    // Get stored speech settings
    const pitch = parseFloat(await AsyncStorage.getItem('speech_pitch') || '1.0');
    const rate = parseFloat(await AsyncStorage.getItem('speech_rate') || '0.9');

    // Language mapping
    const languageMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN'
    };

    const options = {
      language: languageMap[language] || 'en-US',
      pitch,
      rate,
    };

    await Speech.speak(text, options);
  } catch (error) {
    console.error('Speech error:', error);
  }
};