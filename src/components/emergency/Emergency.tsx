import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEmergencyContacts } from '../../services/userService';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { useTranslation } from '../../context/TranslationContext';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { useSpeech } from '../../hooks/useSpeech';

import { SERVER_IP } from '../../lib/constants';
import FallDetection from '../fallDetection/FallDetection';

const EmergencyScreen: React.FC = () => {
  const [contacts, setContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { translateText, targetLanguage } = useTranslation();
  const speakText = useSpeech();
  const [translations, setTranslations] = useState({
    title: 'Emergency Services',
    description: 'Call emergency services immediately',
    call: 'Call',
    fallback: 'No contacts found. Please add from your Profile.',
    login: 'Please log in to access emergency services.'
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      setUser(user);
      if (user) {
        fetchContacts();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchContacts();
    }, [])
  );
  const fetchContacts = async () => {
    try {
      const result = await getEmergencyContacts();
      setContacts(result);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const translateUI = async () => {
      try {
        const translated = {
          title: await translateText('Emergency Services'),
          description: await translateText('Call emergency services immediately'),
          call: await translateText('Call'),
          fallback: await translateText('No contacts found. Please add from your Profile.'),
          login: await translateText('Please log in to access emergency services.')
        };
        setTranslations(translated);
      } catch (error) {
        console.error('Translation error:', error);
      }
    };

    translateUI();
  }, [targetLanguage, translateText]);

  const makeEmergencyCall = async (phoneNumber: string) => {
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch (error) {
      console.error('Call failed:', error);
      Alert.alert('Call Failed', 'Unable to make the emergency call.');
    }
  };

  const sendEmergencyMessage = async (number: string, message: string) => {
    try {
      const response = await axios.post(`http://${SERVER_IP}:8000/send-sms`, {
        to: number,
        message
      });
      Alert.alert('Message Sent', `Status: ${response.data.status}`);
    } catch (error) {
      console.error('Message failed:', error);
      Alert.alert('Message Failed', 'Unable to send the message.');
    }
  };

  const sendWhatsAppMessage = async (number: string, message: string) => {
    try {
      const response = await axios.post(`http://${SERVER_IP}:8000/send-whatsapp`, {
        to: number,
        message
      });
      Alert.alert('WhatsApp Sent', `Status: ${response.data.status}`);
    } catch (error) {
      console.error('WhatsApp message failed:', error);
      Alert.alert('Failed', 'Could not send WhatsApp message.');
    }
  };

  const handleFallDetected = async () => {
    // Stop any existing timeout
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }

    // Speak the alert in current language
    const alertMessage = await translateText('Fall detected! Are you okay?');
    await speakText(alertMessage);

    // Show alert with countdown
    Alert.alert(
      await translateText('Fall Detected!'),
      await translateText('Are you okay? Automatic emergency call in 20 seconds.'),
      [
        {
          text: await translateText("I'm OK"),
          onPress: () => {
            if (alertTimeoutRef.current) {
              clearTimeout(alertTimeoutRef.current);
            }
          },
          style: 'cancel',
        },
        {
          text: await translateText('Get Help'),
          onPress: async () => {
            if (alertTimeoutRef.current) {
              clearTimeout(alertTimeoutRef.current);
            }
            if (contacts.length > 0) {
              await speakText(await translateText('Calling emergency contact now'));
              makeEmergencyCall(contacts[0]);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );

    // Set timeout for automatic call
    alertTimeoutRef.current = setTimeout(async () => {
      if (contacts.length > 0) {
        const noResponseMessage = await translateText('No response detected. Calling emergency contact.');
        await speakText(noResponseMessage);
        makeEmergencyCall(contacts[0]);
      }
    }, 20000); // 20 seconds
  };

  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#000" style={styles.loader} />;
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{translations.login}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FallDetection onFallDetected={handleFallDetected} />
      <Text style={styles.title}>{translations.title}</Text>
      <Text style={styles.description}>{translations.description}</Text>

      {contacts.length === 0 ? (
        <Text style={styles.fallback}>{translations.fallback}</Text>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.serviceButton}
              onPress={() => makeEmergencyCall(item)}
              onLongPress={() => {
                Alert.alert(
                  'Choose Action',
                  `What would you like to do with ${item}?`,
                  [
                    { text: 'Call', onPress: () => makeEmergencyCall(item) },
                    { text: 'SMS', onPress: () => sendEmergencyMessage(item, 'Send Help') },
                    { text: 'WhatsApp', onPress: () => sendWhatsAppMessage(item, 'Hello, how are you?') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            >
              <Ionicons name="call-outline" size={28} color="#007AFF" />
              <Text style={styles.serviceText}>{item}</Text>
              <Text style={styles.callText}>{translations.call}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, padding: 16, backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center'
  },
  description: {
    fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center'
  },
  fallback: {
    fontSize: 16, color: 'gray', textAlign: 'center', marginTop: 20
  },
  serviceButton: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  serviceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  callText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  loader: {
    flex: 1, justifyContent: 'center', alignItems: 'center'
  },
});

export default EmergencyScreen;
