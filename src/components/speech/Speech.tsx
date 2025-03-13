import { useEffect } from "react";
import { Text, View } from "react-native";
import * as Speech from "expo-speech";

type SpeechProps = {
  text: string;  // Receive translated text
};

export default function SpeechComponent({ text }: SpeechProps) {
  useEffect(() => {
    if (text) {
      Speech.speak(text, {
        language: "en",  // Change language if needed
        pitch: 1.0,
        rate: 1.0,
      });
    }
  }, [text]);

  return (
    <View>
      <Text>🔊 Speaking: {text}</Text>
    </View>
  );
}
