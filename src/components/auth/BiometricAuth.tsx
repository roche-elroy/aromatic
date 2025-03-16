import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useTranslation } from '../../context/TranslationContext';

interface BiometricAuthProps {
  onAuthSuccess: () => void;
}

export const BiometricAuth: React.FC<BiometricAuthProps> = ({ onAuthSuccess }) => {
  const { isBiometricAvailable, authenticate } = useBiometricAuth();
  const { translateText, targetLanguage } = useTranslation();

  const handleAuth = async () => {
    const success = await authenticate();
    if (success) {
      onAuthSuccess();
    }
  };

  if (!isBiometricAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.warning}>
          {targetLanguage === 'hi' 
            ? 'बायोमेट्रिक प्रमाणीकरण इस डिवाइस पर उपलब्ध नहीं है।'
            : 'Biometric authentication is not available on this device.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {targetLanguage === 'hi' ? 'वीजनमेट में आपका स्वागत है' : 'Welcome to VisionMate'}
      </Text>
      <Button 
        title={targetLanguage === 'hi' ? 'फिंगरप्रिंट से लॉगिन करें' : 'Login with Fingerprint'} 
        onPress={handleAuth} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 999,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    color: '#fff',
    textAlign: 'center',
  },
  warning: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});