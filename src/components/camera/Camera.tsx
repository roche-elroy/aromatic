import { CameraPictureOptions, CameraType, CameraView, PermissionStatus } from "expo-camera";
import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "../../context/TranslationContext";
import { useSpeech } from '../../hooks/useSpeech';
import { useCamera } from '../../permissions/useCamera';
import { Ionicons } from '@expo/vector-icons';
import { SERVER_IP } from "../../lib/constants";

export default function CameraScreen() {  
  const { targetLanguage } = useTranslation();
  const { hasPermission, requestPermission } = useCamera();
  const [detectionResult, setDetectionResult] = useState<string>("");
  const [depthValue, setDepthValue] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const [isObjectClose, setIsObjectClose] = useState(false);
  const PROXIMITY_THRESHOLD = 10; // 75cm threshold (update as needed)
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
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        try {
          wsRef.current.close();
        } catch (error) {
          console.error("❌ Error closing WebSocket:", error);
        }
      }
      wsRef.current = null;
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    connectionAttemptRef.current += 1;
    const currentAttempt = connectionAttemptRef.current;
    
    closeWebSocket();
    console.log(`🔄 Connecting WebSocket with language: ${targetLanguage}`);
    setIsConnected(false);
    
    const ws = new WebSocket(`ws://${SERVER_IP}:8000/ws/video?target=${targetLanguage}`);
    ws.onopen = () => {
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
          const isClose = result.depth < PROXIMITY_THRESHOLD;
          
          // Trigger warning speech only once per change.
          if (isClose && !isObjectClose) {
            const warningText = targetLanguage === 'hi'
              ? 'आप वस्तु के बहुत करीब हैं'
              : 'You are too close to the object';
            speakText(warningText);
          }
          setIsObjectClose(isClose);
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

        if (isStreaming.current && wsRef.current?.readyState === WebSocket.OPEN && photo?.base64) {
          wsRef.current.send(photo.base64);
        }
      } catch (err) {
        console.error("🚫 Frame capture error:", err);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  useEffect(() => {
    console.log(`📢 Language changed to: ${targetLanguage}`);
    connectWebSocket();
    return closeWebSocket;
  }, [targetLanguage, connectWebSocket, closeWebSocket]);

  const handleCameraPress = () => {
    if (detectionResult) {
      speakText(detectionResult);
    }
  };

  // console.log(`hasPermission state: ${hasPermission}`);

  // Show permission UI if not granted.
  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity 
          style={styles.permissionButton}
          activeOpacity={0.6}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>
            {targetLanguage === 'hi' ? 'अनुमति दें' : 'Grant Permission'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main camera view.
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
              {isObjectClose && (
                <Text style={styles.proximityWarning}>
                  {targetLanguage === 'hi'
                    ? 'आप वस्तु के बहुत करीब हैं'
                    : 'You are too close to the object'}
                </Text>
              )}
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cameraButton: {
    backgroundColor: 'rgba(0,0,0,0.74)',
    borderRadius: 50,
    padding: 15,
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
});