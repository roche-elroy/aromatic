import { useCameraPermissions } from 'expo-camera';
import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';

export const useCamera = () => {
  const [permission, requestPermission] = useCameraPermissions();

  const handlePermissionRequest = async () => {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();

        // If permission is still denied after request, show settings dialog
        if (!result.granted) {
          Alert.alert(
            'Camera Access Required',
            'Please enable camera access in Expo Go settings',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings',
                onPress: () => Linking.openSettings()
              }
            ]
          );
        }
        return result.granted;
      }
      return true;
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  };

  return {
    hasPermission: permission?.granted ?? false,
    requestPermission: handlePermissionRequest
  };
};