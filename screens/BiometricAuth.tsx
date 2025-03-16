import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Device from "expo-device";


const API_URL = "http://192.168.1.7:8000"; // Change this with your IP address

const BiometricAuth = ({ navigation }) => {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
    checkStoredSession();
  }, []);

  const checkBiometricSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricAvailable(compatible && enrolled);
  };

  const checkStoredSession = async () => {
    const token = await AsyncStorage.getItem("user_token");
    if (!token) return;
  
    try {
      const response = await axios.post(`${API_URL}/verify`, { token });
      if (response.data.status === "authenticated") {
        navigation.replace("Home");
      }
    } catch (error) {
      console.error("Session verification failed:", error);
    }
  };
  

  const handleBiometricAuth = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to continue",
      fallbackLabel: "Enter password",
      disableDeviceFallback: true,
    });
  
    if (result.success) {
      const deviceId = Device.deviceName || Device.osBuildId; // Use a unique identifier
      console.log("Device ID:", deviceId);
  
      try {
        const response = await axios.post(`${API_URL}/authenticate`, { device_id: deviceId });
  
        if (response.data.token) {
          await AsyncStorage.setItem("user_token", response.data.token);
          navigation.replace("Home"); // Navigate to Home screen
        }
      } catch (error) {
        console.error("Error authenticating:", error);
        Alert.alert("Authentication Failed", "Server Error.");
      }
    } else {
      Alert.alert("Authentication Failed", "Please try again.");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Use Biometric Authentication</Text>
      {isBiometricAvailable ? (
        <Button title="Login with Fingerprint / Face ID" onPress={handleBiometricAuth} />
      ) : (
        <Text>Biometric Authentication is not available.</Text>
      )}
    </View>
  );
};

export default BiometricAuth;
