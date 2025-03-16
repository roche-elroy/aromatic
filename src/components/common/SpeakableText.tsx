import React from 'react';
import { Text, TouchableOpacity, StyleSheet, TextStyle } from 'react-native';
import { useSpeech } from '../../hooks/useSpeech';

interface SpeakableTextProps {
  text: string;
  style?: TextStyle;
}

export const SpeakableText: React.FC<SpeakableTextProps> = ({ text, style }) => {
  const speakText = useSpeech();

  return (
    <TouchableOpacity 
      onPress={() => speakText(text)}
      accessibilityLabel={text}
      accessibilityHint="Double tap to hear text"
    >
      <Text style={[styles.text, style]}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  text: {
    // Default text styles
  }
});