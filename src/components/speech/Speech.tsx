import React, { useState, useEffect } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet } from "react-native";
import * as Speech from "expo-speech";

const SpeechComponent = ({ text }) => {
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const fetchTranslation = async () => {
      if (!text) return;
      setLoading(true);
      try {
        const response = await fetch("http://localhost:8000/translate/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        const data = await response.json();
        setTranslatedText(data.translated_text);
      } catch (error) {
        console.error("Error fetching translation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslation();
  }, [text]); // Runs whenever text changes

  const speakTextContinuously = () => {
    if (translatedText) {
      setIsSpeaking(true);
      const speakLoop = () => {
        if (!isSpeaking) return;
        Speech.speak(translatedText, {
          onDone: speakLoop,
          onStopped: () => setIsSpeaking(false),
        });
      };
      speakLoop();
    }
  };

  const stopSpeaking = () => {
    setIsSpeaking(false);
    Speech.stop();
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <>
          <Text style={styles.text}>Translation: {translatedText}</Text>
          <Button title="🔊 Start Continuous Speech" onPress={speakTextContinuously} disabled={!translatedText || isSpeaking} />
          <Button title="⏹ Stop" onPress={stopSpeaking} disabled={!isSpeaking} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 10,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default SpeechComponent;
