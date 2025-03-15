import { CameraPictureOptions, CameraType, CameraView, useCameraPermissions } from "expo-camera";  
import { useState, useEffect, useRef } from "react";  
import { View, Text, Button, StyleSheet } from "react-native";
import { useTranslation } from "../../context/TranslationContext";  

const SERVER_IP = "192.168.43.22";

export default function CameraScreen() {  
  const { targetLanguage, setTargetLanguage } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();  
  const [detectionResult, setDetectionResult] = useState<string>("");
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);
  const isStreaming = useRef<boolean>(false);  
  const wsRef = useRef<WebSocket | null>(null);  

  function toggleCamera() {
    setFacing(current => current === "back" ? "front" : "back");
  }

  const reconnectWebSocket = () => {
    console.log("🔄 Reconnecting WebSocket due to language change...");
    if (wsRef.current) {
      wsRef.current.close();
    }
    connectWebSocket();
  };

  const connectWebSocket = () => {  
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    console.log(`🔄 Connecting WebSocket with language: ${targetLanguage}`);   
    const ws = new WebSocket(`ws://${SERVER_IP}:8000/ws/video?target=${targetLanguage}`);

    ws.onopen = () => {  
      console.log(`✅ Connected to WebSocket (${targetLanguage})`);  
      wsRef.current = ws;  
      isStreaming.current = true;  
      startStreaming();  
    };  

    ws.onerror = (error) => {  
      console.error("❌ WebSocket Error:", error);  
    };  

    ws.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data);
        if (result.translated_text) {
          setDetectionResult(result.translated_text);
          console.log(`📥 Received translation (${targetLanguage}):`, result.translated_text);
        }
      } catch (error) {
        console.error("⚠️ Parse Error:", error);
      }
    };

    ws.onclose = () => {  
      console.log("🔒 WebSocket Closed");  
      isStreaming.current = false;  
      wsRef.current = null;  
      setTimeout(connectWebSocket, 3000);
    };  

    wsRef.current = ws;  
  };  

  const startStreaming = async () => {  
    while (isStreaming.current) {  
      if (cameraRef.current && wsRef.current?.readyState === WebSocket.OPEN) {  
        try {  
          console.log("📸 Capturing frame...");  

          const pictureOptions: CameraPictureOptions = {
            base64: true,
            quality: 0.5,
            shutterSound: false,
          };

          const photo = await cameraRef.current.takePictureAsync(pictureOptions);  

          console.log("📤 Sending frame...");  
          if (photo?.base64) {
            wsRef.current.send(photo.base64);
          }
        } catch (err) {  
          console.error("🚫 Frame capture error:", err);  
        }  
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }  
  };  

  useEffect(() => {  
    setTargetLanguage(targetLanguage); // Register current language
    console.log(`📢 Language changed to: ${targetLanguage}`);
    connectWebSocket();
    
    return () => {
      console.log('🔒 Cleaning up WebSocket connection');
      isStreaming.current = false;
      if (wsRef.current) {
        wsRef.current.close();
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
    bottom: 4,
    left: 20,
    right: 20,
    textAlign: 'center',
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  }
});