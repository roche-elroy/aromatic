import { CameraPictureOptions, CameraType, CameraView, useCameraPermissions } from "expo-camera";  
import { useState, useEffect, useRef } from "react";  
import { View, Text, Button, StyleSheet } from "react-native";
import { useTranslation } from "../../context/TranslationContext";  

const SERVER_IP = "192.168.43.22"; // Replace with your actual IP

export default function CameraScreen() {  
  const { sourceLanguage, targetLanguage } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<string>("");  
  // const [status, setStatus] = useState("🔄 Connecting...");  
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);
  const isStreaming = useRef<boolean>(false);  
  const wsRef = useRef<WebSocket | null>(null);  

  function toggleCamera(){
    setFacing(current => current === "back" ? "front" : "back");
  }

  // 🌐 WebSocket Connection  
  const connectWebSocket = () => {  
    console.log("🔄 Attempting WebSocket connection...");  
    // setStatus("🔄 Connecting...");  

    const ws = new WebSocket(`ws://${SERVER_IP}:8000/ws/video?source=${sourceLanguage}&target=${targetLanguage}`);

    ws.onopen = () => {  
      console.log("✅ Connected to WebSocket");  
      // setStatus("✅ Connected to server");  
      wsRef.current = ws;  
      isStreaming.current = true;  
      startStreaming();  
    };  

    ws.onerror = (error) => {  
      console.error("❌ WebSocket Error:", error);  
      // setStatus("❌ WebSocket error");  
    }; 
    
    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.text) {
          console.log("📥 Detection:", response.text);
        }
        if (response.translated_text) {
          console.log("📥 Translation:", response.translated_text);
          setDetectionResult(response.translated_text); // Show translated text
        }
        if (response.image) {
          setProcessedImage(`data:image/jpeg;base64,${response.image}`);
        }
      } catch (error) {
        console.error("⚠️ Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = (event) => {  
      console.warn("🔒 WebSocket closed:", event.reason);  
      // setStatus("🔒 Disconnected");  
      isStreaming.current = false;  
      wsRef.current = null;  
      setTimeout(connectWebSocket, 3000); // Retry after 3s  
    };  

    wsRef.current = ws;  
  };  

  // 📸 Frame Capture & Streaming  
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
    connectWebSocket();  
    return () => {  
      isStreaming.current = false;  
      wsRef.current?.close();  
    };  
  }, []);  

  if (!permission?.granted) {  
    return (  
      <View style={styles.container}>  
        <Text>No access to camera</Text>  
        <Button title="Grant Permission" onPress={requestPermission} />  
      </View>  
    );  
  }  

  return (  
    <View style={styles.container}>  
      {/* <Text style={styles.status}>{status}</Text>   */}
      <CameraView 
        ref={cameraRef} 
        style={styles.camera} 
        facing={facing} 
        animateShutter={false}>
          <View style={styles.buttonContainer}>
            <Button title="Toggle Camera" onPress={toggleCamera} />
          </View>
        {/* <Text style={styles.overlayText}>{t('camera.tapToScan')}</Text> */}
      </CameraView>  
    </View>  
  );  
}  

const styles = StyleSheet.create({  
  container: { 
    flex: 1 
  },
  // status: { 
  //   fontSize: 16, 
  //   marginTop: 50, 
  //   color: "white", 
  //   position: "absolute", 
  //   top: 20, 
  //   left: 20 
  // },  
  buttonContainer: { 
    position: "absolute", 
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center"
  },
  overlayText: {
      fontSize: 10
  },
  camera: StyleSheet.absoluteFillObject
});


