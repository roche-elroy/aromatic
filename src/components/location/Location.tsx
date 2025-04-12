import React from 'react';
import { View, Button, Alert, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getDefaultContact } from '../../services/userService';

const LocationShare = () => {
  // Step 1: Get current location
  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({});
    return location.coords;
  };

  // Step 2: Generate Google Maps URL
  const generateMapsLink = (lat: number, lon: number) => {
    return `https://www.google.com/maps?q=${lat},${lon}`;
  };

  // Step 3: Fetch contact number from Firebase
  const getContactPhone = async (contactId: string): Promise<string> => {
    const db = getFirestore();
    
    const contactRef = doc(db, 'contacts', contactId); // Firestore uses collections
    const snapshot = await getDoc(contactRef);

    if (snapshot.exists()) {
    return snapshot.data().number;
    } else {
    throw new Error('Contact not found');
    }
  };

  // Step 4: Open WhatsApp with location link
  const sendLocationViaWhatsApp = async (phone: string, locationUrl: string) => {
    const message = `Hi! I'm here: ${locationUrl}`;
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      Linking.openURL(whatsappUrl);
    } else {
      Alert.alert('Error', 'WhatsApp is not installed on your device');
    }
  };

  // Step 5: Combine everything
  const handleShareLocation = async () => {
    try {
      const coords = await getCurrentLocation();
      if (!coords) return;

      const mapLink = generateMapsLink(coords.latitude, coords.longitude);
      
      const phoneNumber = await getDefaultContact(); 
        console.log(phoneNumber);
      await sendLocationViaWhatsApp(phoneNumber, mapLink);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Share My Location" onPress={handleShareLocation} />
    </View>
  );
};

export default LocationShare;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
