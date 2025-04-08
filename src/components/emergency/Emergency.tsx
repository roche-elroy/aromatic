import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEmergencyContacts } from '../../services/userService';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { useTranslation } from '../../context/TranslationContext';
import { useFocusEffect } from '@react-navigation/native';

import { SERVER_IP } from '../../lib/constants';
import FallDetection from '../fallDetection/FallDetection';

const EmergencyScreen: React.FC = () => {
  const [contacts, setContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const { translateText, targetLanguage } = useTranslation();
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

  const makeEmergencyCall = async (number: string) => {
    try {
      const response = await axios.post(`http://${SERVER_IP}:8000/make-call`, { to: number });
      Alert.alert('Call Started', `Status: ${response.data.status}`);
    } catch (error) {
      console.error('Call failed:', error);
      Alert.alert('Call Failed', 'Unable to place the call.');
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
      <FallDetection />
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
