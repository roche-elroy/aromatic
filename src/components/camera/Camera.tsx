import { CameraPictureOptions, CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect, useRef } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import SpeechComponent from "../speech/Speech";

const SERVER_IP = "192.168.1.7"; // Replace with your actual server IP

export default function CameraScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState("🔄 Connecting...");
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);
  const isStreaming = useRef<boolean>(false);
  const [translatedText, setTranslatedText] = useState("");

  // Separate WebSocket Refs
  const wsVideoRef = useRef<WebSocket | null>(null);
  const wsTranslateRef = useRef<WebSocket | null>(null);

  function toggleCamera() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  /** 📌 Connects WebSocket for Video Streaming */
  const connectVideoWebSocket = () => {
    console.log("🔄 Connecting to Video WebSocket...");
    setStatus("🔄 Connecting to server...");

    const ws = new WebSocket(`ws://${SERVER_IP}:8000/ws/video`);

    ws.onopen = () => {
      console.log("✅ Connected to Video WebSocket");
      setStatus("✅ Connected to server");
      wsVideoRef.current = ws;
      isStreaming.current = true;
      startStreaming();
    };

    ws.onerror = (error) => {
      console.error("❌ Video WebSocket Error:", error);
      setStatus("❌ Video WebSocket error");
    };

    ws.onclose = (event) => {
      console.warn("🔒 Video WebSocket closed:", event.reason);
      setStatus("🔒 Disconnected");
      isStreaming.current = false;
      wsVideoRef.current = null;
      setTimeout(connectVideoWebSocket, 3000); // Retry connection
    };
  };

  /** 📌 Starts Streaming Video to WebSocket */
  const startStreaming = async () => {
    while (isStreaming.current) {
      if (cameraRef.current && wsVideoRef.current?.readyState === WebSocket.OPEN) {
        try {
          console.log("📸 Capturing frame...");

          const pictureOptions: CameraPictureOptions = {
            base64: true,
            quality: 0.5,
            shutterSound: false,
          };

          const photo = await cameraRef.current.takePictureAsync(pictureOptions);

          if (photo?.base64) {
            console.log("📤 Sending frame...");
            wsVideoRef.current.send(photo.base64);
          }
        } catch (err) {
          console.error("🚫 Frame capture error:", err);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 200)); // Delay for next frame
    }
  };

  /** 📌 Connects WebSocket for Translation */
  const connectTranslationWebSocket = () => {
    console.log("🔄 Connecting to Translation WebSocket...");
    setStatus("🔄 Connecting to translation server...");

    const ws = new WebSocket(`ws://${SERVER_IP}:8000/ws/translate`);

    ws.onopen = () => {
      console.log("✅ Connected to Translation WebSocket");
      setStatus("✅ Connected to translation server");
      wsTranslateRef.current = ws;
    };
    console.log("FE");

    ws.onmessage = (event) => {
      console.log("FE");
      console.log("📩 WebSocket message received:", event.data);
      try {
        const parsedData = JSON.parse(event.data);
        console.log("✅ Parsed message:", parsedData);
        setTranslatedText(parsedData.translated_text);
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error, event.data);
      }
    };
    
    ws.onerror = (error) => {
      console.error("❌ Translation WebSocket Error:", error);
      setStatus("❌ Translation WebSocket error");
    };

    ws.onclose = (event) => {
      console.warn("🔒 Translation WebSocket closed:", event.reason);
      setStatus("🔒 Translation server disconnected");
      wsTranslateRef.current = null;
      setTimeout(connectTranslationWebSocket, 5000); // Retry connection
    };
  };

  useEffect(() => {
    connectVideoWebSocket();
    connectTranslationWebSocket();

    return () => {
      isStreaming.current = false;
      wsVideoRef.current?.close();
      wsTranslateRef.current?.close();
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
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} animateShutter={false}>
        <View style={styles.buttonContainer}>
          <Button title="Toggle Camera" onPress={toggleCamera} />
        </View>
        <Text style={styles.overlayText}>{t("camera.tapToScan")}</Text>
        <Text style={styles.overlayText}>{translatedText}</Text>
      </CameraView>
      {translatedText && <SpeechComponent text={translatedText} />} 
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  status: {
    fontSize: 16,
    marginTop: 50,
    color: "white",
    position: "absolute",
    top: 20,
    left: 20,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  overlayText: {
    fontSize: 10,
  },
  camera: StyleSheet.absoluteFillObject,
});
