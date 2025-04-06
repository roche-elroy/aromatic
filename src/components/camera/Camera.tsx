import { CameraPictureOptions, CameraType, CameraView, useCameraPermissions } from "expo-camera";  
import { useState, useEffect, useRef, useCallback } from "react";  
import { View, Text, Button, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "../../context/TranslationContext";  
import { useSpeech } from '../../hooks/useSpeech';
import { Ionicons } from '@expo/vector-icons';

const SERVER_IP = "192.168.1.10";

export default function CameraScreen() {  
  const { targetLanguage } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();  
  const [detectionResult, setDetectionResult] = useState<string>("");
  const [depthValue, setDepthValue] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);
  const isStreaming = useRef<boolean>(false);  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptRef = useRef<number>(0);
  const speakText = useSpeech();

  function toggleCamera() {
    setFacing(current => current === "back" ? "front" : "back");
  }

  // Close existing WebSocket connection
  const closeWebSocket = useCallback(() => {
    console.log("🔄 Cleaning up existing connection");
    isStreaming.current = false;
    
    if (wsRef.current) {
      // Only close if not already closing/closed
      if (wsRef.current.readyState === WebSocket.OPEN || 
          wsRef.current.readyState === WebSocket.CONNECTING) {
        try {
          wsRef.current.close();
        } catch (error) {
          console.error("❌ Error closing WebSocket:", error);
        }
      }
      wsRef.current = null;
    }
    
    // Clear any pending reconnection
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    connectionAttemptRef.current += 1;
    const currentAttempt = connectionAttemptRef.current;
    
    // Clean up existing connection
    closeWebSocket();
    
    console.log(`🔄 Connecting WebSocket with language: ${targetLanguage}`);
    setIsConnected(false);
    
    const ws = new WebSocket(`ws://${SERVER_IP}:8000/ws/video?target=${targetLanguage}`);

    ws.onopen = () => {
      // Ensure this is still the most recent connection attempt
      if (currentAttempt !== connectionAttemptRef.current) {
        console.log("⚠️ Outdated connection attempt, closing");
        ws.close();
        return;
      }
      
      console.log(`✅ Connected to WebSocket (${targetLanguage})`);
      wsRef.current = ws;
      isStreaming.current = true;
      setIsConnected(true);
      startStreaming();
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket Error:", error);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data);
        if (result.translated_text) {
          setDetectionResult(result.translated_text);
        }
        if (result.depth !== undefined) {
          setDepthValue(result.depth);
        }
      } catch (error) {
        console.error("⚠️ Parse Error:", error);
      }
    };

    ws.onclose = (event) => {
      console.log(`🔒 WebSocket Closed (${event.code}): ${event.reason || 'No reason provided'}`);
      isStreaming.current = false;
      wsRef.current = null;
      setIsConnected(false);
      
      // Only attempt reconnect if this is the most recent connection
      if (currentAttempt === connectionAttemptRef.current) {
        reconnectTimeout.current = setTimeout(connectWebSocket, 2000);
      }
    };
  }, [targetLanguage, closeWebSocket]);

  const startStreaming = async () => {
    while (isStreaming.current && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        if (!cameraRef.current) continue;

        const pictureOptions: CameraPictureOptions = {
          base64: true,
          quality: 0.5,
          shutterSound: false,
        };

        const photo = await cameraRef.current.takePictureAsync(pictureOptions);

        // Double-check connection is still valid
        if (isStreaming.current && wsRef.current?.readyState === WebSocket.OPEN && photo?.base64) {
          wsRef.current.send(photo.base64);
        }
      } catch (err) {
        console.error("🚫 Frame capture error:", err);
      }
      
      // Wait before capturing next frame
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  // Handle language changes with a clean disconnect/reconnect
  useEffect(() => {
    console.log(`📢 Language changed to: ${targetLanguage}`);
    connectWebSocket();
    
    // Cleanup function
    return closeWebSocket;
  }, [targetLanguage, connectWebSocket, closeWebSocket]);

  const handleCameraPress = () => {
    if (detectionResult) {
      speakText(detectionResult);
    }
  };

  if (!permission?.granted) {  
    return (  
      <View style={styles.container}>  
        <Text style={styles.message}>No access to camera</Text>  
        <Button title="Grant Permission" onPress={requestPermission} />  
      </View>  
    );  
  }  

  return (  
    <View style={styles.container}>  
      <TouchableOpacity 
        style={styles.camera} 
        onPress={handleCameraPress}
        activeOpacity={0.9}
      >
        <CameraView 
          ref={cameraRef} 
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          animateShutter={false}
        >
          {!isConnected && (
            <Text style={styles.connectionStatus}>
              {targetLanguage === 'hi' ? 'पुन: कनेक्ट हो रहा है...' : 'Reconnecting...'}
            </Text>
          )}
          {detectionResult && (
            <View>
              <Text style={styles.detectionText}>{detectionResult}</Text>
            </View>
          )}
            <View style={[styles.buttonContainer, { flexDirection: 'row', justifyContent: 'center' }]}>
            <TouchableOpacity 
              onPress={toggleCamera}
              style={styles.cameraButton}
            >
              <Ionicons name="camera-reverse" size={30} color="white" />
            </TouchableOpacity>
            </View>
        </CameraView>
      </TouchableOpacity>
    </View>  
  );  
}  

const styles = StyleSheet.create({  
  container: { 
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: { 
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
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
  },
  // detectionContainer: {
  //   position: 'absolute',
  //   top: 40,
  //   left: 20,
  //   right: 20,
  //   backgroundColor: 'rgba(0,0,0,0.7)',
  //   padding: 10,
  //   borderRadius: 10,
  // },

  cameraButton: {
    backgroundColor: 'rgba(0,0,0,0.74)',
    borderRadius: 50,
    padding: 15,
  }
});