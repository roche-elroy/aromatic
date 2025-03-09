import { CameraPictureOptions, CameraView, useCameraPermissions } from "expo-camera";  
import { useState, useEffect, useRef } from "react";  
import { View, Text, Button, StyleSheet } from "react-native";  

const SERVER_IP = "192.168.43.22"; // Replace with your actual IP

export default function App() {  
  const [permission, requestPermission] = useCameraPermissions();  
  const [status, setStatus] = useState("🔄 Connecting...");  
  
  const cameraRef = useRef<CameraView>(null);
  const isStreaming = useRef<boolean>(false);  
  const wsRef = useRef<WebSocket | null>(null);  

  // 🌐 WebSocket Connection  
  const connectWebSocket = () => {  
    console.log("🔄 Attempting WebSocket connection...");  
    setStatus("🔄 Connecting...");  

    const ws = new WebSocket(`ws://${SERVER_IP}:8000/ws/video`);

    ws.onopen = () => {  
      console.log("✅ Connected to WebSocket");  
      setStatus("✅ Connected to server");  
      wsRef.current = ws;  
      isStreaming.current = true;  
      startStreaming();  
    };  

    ws.onerror = (error) => {  
      console.error("❌ WebSocket Error:", error);  
      setStatus("❌ WebSocket error");  
    };  

    ws.onclose = (event) => {  
      console.warn("🔒 WebSocket closed:", event.reason);  
      setStatus("🔒 Disconnected");  
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
      <Text style={styles.status}>{status}</Text>  
      <CameraView 
        ref={cameraRef} 
        style={styles.camera} 
        facing="back" 
        animateShutter={false}
      />  
    </View>  
  );  
}  

const styles = StyleSheet.create({  
  container: { 
    flex: 1 
  },
  status: { 
    fontSize: 16, 
    marginTop: 50, 
    color: "white", 
    position: "absolute", 
    top: 20, 
    left: 20 
  },  
  camera: StyleSheet.absoluteFillObject
});