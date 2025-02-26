import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';

interface LocationInfo {
  coords: {
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}

interface LocationDetails {
  display_name?: string;
  error?: string;
}

export default function LocationScreen() {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const subscription = Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
          fetchLocationDetails(newLocation.coords);
        }
      );

      return () => {
        subscription.then(sub => sub.remove());
      };
    })();
  }, []);

  const fetchLocationDetails = async (coords: { latitude: number; longitude: number }) => {
    try {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);
      if (!isConnected) {
        setLocationDetails({ error: 'No internet connection' });
        return;
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
      );
      const data = await response.json();
      setLocationDetails({ display_name: data.display_name });
    } catch (error) {
      setLocationDetails({ error: 'Failed to fetch location details' });
    }
  };

  return (
    <View style={styles.container}>
      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : location ? (
        <>
          <Text style={styles.text}>Latitude: {location.coords.latitude}</Text>
          <Text style={styles.text}>Longitude: {location.coords.longitude}</Text>
          {locationDetails.display_name ? (
            <Text style={styles.text}>Location: {locationDetails.display_name}</Text>
          ) : locationDetails.error ? (
            <Text style={styles.errorText}>{locationDetails.error}</Text>
          ) : (
            <Text style={styles.text}>Loading location details...</Text>
          )}
        </>
      ) : (
        <Text style={styles.text}>Getting location...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    marginVertical: 5,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginVertical: 5,
  },
});
