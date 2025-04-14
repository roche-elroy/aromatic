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
    detectionContainer: {
      position: 'absolute',
      top: 90,  // Positioned below connection status
      left: 20,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 12,
      borderRadius: 8,
      zIndex: 99,
      elevation: 99,
    },
    detectionText: {
      color: '#ffffff',
      fontSize: 16,
      textAlign: 'center',
      fontWeight: '500',
    },
    connectionStatus: {
      position: 'absolute',
      color: '#ffffff',
      top: 40,
      left: 50,
      right: 50,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 10,
      borderRadius: 8,
      zIndex: 99,
      elevation: 99,
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
      fontSize: 16,
      textAlign: 'center',
      marginTop: 8,
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
    debugOverlay: {
      position: 'absolute',
      top: 60,
      left: 20,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 10,
      borderRadius: 5,
      maxWidth: '80%',
      zIndex: 1,
      elevation: 1, // Add this for Android
    },
    debugText: {
      color: 'white',
      fontSize: 12,
      marginBottom: 4,
    },
    controlPanel: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 20,
      zIndex: 100,
      elevation: 100,
      backgroundColor: 'transparent',
    },
    sideButton: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 35,
      width: 55,
      height: 55,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 101,
      elevation: 101,
    },
    centerButton: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 45,
      width: 80,
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#ffffff50',
      zIndex: 101,
      elevation: 101,
    },
    boundingBox: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: '#00FF00',
      backgroundColor: 'transparent',
      zIndex: 1,
      elevation: 1,
    },
  });