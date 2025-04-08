import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useFallDetection } from '../../hooks/useFallDetection';

const FallDetection: React.FC = () => {
  const handleFallDetected = () => {
    Alert.alert(
      'Fall Detected!',
      'Are you okay? Do you need emergency assistance?',
      [
        {
          text: "I'm OK",
          style: 'cancel',
        },
        {
          text: 'Get Help',
          onPress: () => {
            // TODO: Implement emergency contact/service call
            console.log('Emergency help requested');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const { isMonitoring, accelerometerData } = useFallDetection(handleFallDetected);

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        Fall Detection: {isMonitoring ? 'Active' : 'Inactive'}
      </Text>
      <Text style={styles.data}>
        X: {accelerometerData.x.toFixed(2)}
        Y: {accelerometerData.y.toFixed(2)}
        Z: {accelerometerData.z.toFixed(2)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  data: {
    fontSize: 14,
    marginTop: 5,
  },
});

export default FallDetection;