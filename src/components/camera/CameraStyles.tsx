import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({  
    container: { 
      flex: 1,
      backgroundColor: '#000',
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000',
    },
    camera: {
      flex: 1,
    },
    cameraButtonContainer: { 
      position: 'absolute',
      bottom: 60,
      width: '100%',
      alignItems: 'center',
      zIndex: 999, // Add this
      elevation: 999, // Add this for Android
    },
    flashButtonContainer: {
      position: 'absolute',
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      zIndex: 999, // Add this
      elevation: 999, // Add this for Android
    },
    detectionText: {
      color: '#fff',
      fontSize: 18,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 10,
      borderRadius: 5,
      position: 'absolute',
      top: 60,
      left: 20,
      right: 20,
      textAlign: 'center',
    },
    connectionStatus: {
      color: '#fff',
      fontSize: 16,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 8,
      borderRadius: 5,
      position: 'absolute',
      top: 10,
      alignSelf: 'center',
    },
    message: {
      color: '#fff',
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 20
    },
    cameraButton: {
      backgroundColor: 'rgba(0,0,0,0.74)',
      borderRadius: 50,
      padding: 15,
      width: 70,
      height: 70,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999, // Add this
      elevation: 999, // Add this for Android
    },
    proximityWarning: {
      color: '#ff4444',
      fontSize: 20,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 10,
      borderRadius: 5,
      position: 'absolute',
      top: 120,
      left: 20,
      right: 20,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    permissionButton: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    permissionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    centerButtonContainer: { 
      position: 'absolute',
      bottom: 60,
      width: '100%',
      alignItems: 'center',
      zIndex: 999, // Add this
      elevation: 999, // Add this for Android
    },
    flashButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 30,
      padding: 12,
      margin: 10,
      zIndex: 999, // Add this
      elevation: 999, // Add this for Android
    },
    boundingBox: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: '#00ff00',
    },
    objectLabel: {
      position: 'absolute',
      backgroundColor: '#00ff00',
      color: 'white',
      padding: 2,
      fontSize: 12,
    }
  });