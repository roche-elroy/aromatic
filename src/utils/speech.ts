import * as Speech from 'expo-speech';

export const speak = async (text: string, language: string = 'en-US') => {
  try {
    // Stop any ongoing speech
    await Speech.stop();

    // Language mapping
    const languageMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN'
    };

    const options = {
      language: languageMap[language] || 'en-US',
      pitch: 1.0,
      rate: 0.9,
    };

    await Speech.speak(text, options);
  } catch (error) {
    console.error('Speech error:', error);
  }
};