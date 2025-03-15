import { CameraPictureOptions, CameraType, CameraView, useCameraPermissions } from "expo-camera";  
import { useState, useEffect, useRef } from "react";  
import { View, Text, Button, StyleSheet } from "react-native";
import { useTranslation } from "../../context/TranslationContext";  

const SERVER_IP = "192.168.43.22";

export default function CameraScreen() {  
  const { targetLanguage } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();  
  const [detectionResult, setDetectionResult] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);
  const isStreaming = useRef<boolean>(false);  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  function toggleCamera() {
    setFacing(current => current === "back" ? "front" : "back");
  }

  const connectWebSocket = () => {  
    // Clear any existing timeouts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    // Close existing connection
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      isStreaming.current = false;
      wsRef.current.close();
      wsRef.current = null;
    }

    console.log(`🔄 Connecting WebSocket with language: ${targetLanguage}`);   
    const ws = new WebSocket(
      `ws://${SERVER_IP}:8000/ws/video?target=${targetLanguage}`
    );

    ws.onopen = () => {  
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
      } catch (error) {
        console.error("⚠️ Parse Error:", error);
      }
    };

    ws.onclose = () => {  
      console.log("🔒 WebSocket Closed");  
      isStreaming.current = false;  
      wsRef.current = null;
      setIsConnected(false);
      
      // Attempt reconnection after 1 second
      reconnectTimeout.current = setTimeout(connectWebSocket, 1000);
    };  
  };  

  const startStreaming = async () => {  
    while (isStreaming.current) {  
      if (cameraRef.current && wsRef.current?.readyState === WebSocket.OPEN) {  
        try {  
          const pictureOptions: CameraPictureOptions = {
            base64: true,
            quality: 0.5,
            shutterSound: false,
          };

          const photo = await cameraRef.current.takePictureAsync(pictureOptions);  

          if (photo?.base64 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(photo.base64);
          }
        } catch (err) {  
          console.error("🚫 Frame capture error:", err);  
        }  
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }  
  };  

  // Handle language changes
  useEffect(() => {
    console.log(`📢 Language changed to: ${targetLanguage}`);
    connectWebSocket();
    
    return () => {
      console.log('🔒 Cleaning up WebSocket connection');
      isStreaming.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [targetLanguage]);

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
      <CameraView 
        ref={cameraRef} 
        style={styles.camera} 
        facing={facing}
        animateShutter={false}
      >
        {!isConnected && (
          <Text style={styles.connectionStatus}>Reconnecting...</Text>
        )}
        {detectionResult && (
          <Text style={styles.detectionText}>{detectionResult}</Text>
        )}
        <View style={styles.buttonContainer}>
          <Button title="Toggle Camera" onPress={toggleCamera} />
        </View>
      </CameraView>  
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
    top: 40,
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
  }
});