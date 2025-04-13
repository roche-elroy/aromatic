import { CameraPictureOptions, CameraType, CameraView, PermissionStatus } from "expo-camera";
import { AppState, AppStateStatus } from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import * as Speech from 'expo-speech';
import { useTranslation } from "../../context/TranslationContext";
import { useSpeech } from '../../hooks/useSpeech';
import { useCamera } from '../../permissions/useCamera';
import { Ionicons } from '@expo/vector-icons';
import { SERVER_IP } from "../../lib/constants";
import { Camera } from 'expo-camera';
import { CameraQuadrants } from './CameraQuadrants';
import { getQuadrant, getQuadrantDescription, Quadrant } from '../../utils/quadrantDetection';
import { BoundingBox } from './BoundingBox';
import { useFocusEffect } from '@react-navigation/native';

import { styles } from "./CameraStyles";

export default function CameraScreen() {  
  const { targetLanguage, translateText } = useTranslation();
  const { hasPermission, requestPermission } = useCamera();
  const [detectionResult, setDetectionResult] = useState<string>("");
  const [depthValue, setDepthValue] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const [isObjectClose, setIsObjectClose] = useState(false);
  const PROXIMITY_THRESHOLD = 0.1; // 75cm threshold (update as needed)
  const cameraRef = useRef<CameraView>(null);
  const isStreaming = useRef<boolean>(false);  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptRef = useRef<number>(0);
  const speakText = useSpeech();
  const appState = useRef(AppState.currentState);
  const [isActive, setIsActive] = useState(true);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [activeQuadrant, setActiveQuadrant] = useState<Quadrant>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [boundingBox, setBoundingBox] = useState<any>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const shouldProcessFrames = useRef<boolean>(false);

  function toggleCamera() {
    setFacing(current => current === "back" ? "front" : "back");
  }

  const handleTorchToggle = async () => {
    setIsTorchOn(prev => !prev);
    const message = isTorchOn ? 'Torch turned off' : 'Torch turned on';
    await speakText(await translateText(message));
  };

  const handleTorchLongPress = async () => {
    const message = isTorchOn ? 'Torch is currently on' : 'Torch is currently off';
    await speakText(await translateText(message));
  };

  const handleCameraFlip = async () => {
    toggleCamera();
    const message = facing === 'back' ? 'Switched to front camera' : 'Switched to back camera';
    await speakText(await translateText(message));
  };

  const handleCameraLongPress = async () => {
    const message = facing === 'back' ? 'Using back camera' : 'Using front camera';
    await speakText(await translateText(message));
  };

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
        console.log("📥 Received server response:", result);
        
        if (result.bounding_box) {
          setBoundingBox(result.bounding_box);
          const quadrant = getQuadrant(result.bounding_box, screenWidth);
          setActiveQuadrant(quadrant);
        }
        if (result.translated_text) {
          setDetectionResult(result.translated_text);
        }
        if (result.depth !== undefined) {
          setDepthValue(result.depth);
          const isClose = result.depth < PROXIMITY_THRESHOLD;
          
          if (isClose && !isObjectClose) {
            const warningText = targetLanguage === 'hi'
              ? 'आप वस्तु के बहुत करीब हैं'
              : 'You are too close to the object';
            speakText(warningText);
          }
          setIsObjectClose(isClose);
        }
      } catch (error) {
        console.error("⚠️ Parse Error:", error, "Raw data:", event.data);
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

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      shouldProcessFrames.current = true;
      console.log('📸 Camera screen focused, enabling processing');

      if (!wsRef.current && isActive) {
        console.log(`📢 Connecting WebSocket: ${targetLanguage}`);
        connectWebSocket();
      }

      return () => {
        setIsScreenFocused(false);
        shouldProcessFrames.current = false;
        console.log('📸 Camera screen unfocused, disabling processing');
        // Don't close websocket, just stop processing
        Speech.stop();
        setDetectionResult("");
        setBoundingBox(null);
        setActiveQuadrant(null);
        setDepthValue(null);
        setIsObjectClose(false);
      };
    }, [targetLanguage, isActive])
  );

  const startStreaming = async () => {
    while (
      isActive && 
      isStreaming.current && 
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      try {
        // Only process frames if we're on camera screen
        if (!shouldProcessFrames.current) {
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }

        if (!cameraRef.current) {
          console.log("📸 No camera reference available");
          continue;
        }

        const pictureOptions: CameraPictureOptions = {
          base64: true,
          quality: 0.5,
          shutterSound: false,
        };

        const photo = await cameraRef.current.takePictureAsync(pictureOptions);
        console.log("📸 Frame captured, size:", photo?.base64?.length || 0);

        if (
          isActive && 
          isStreaming.current && 
          wsRef.current?.readyState === WebSocket.OPEN && 
          photo?.base64 &&
          shouldProcessFrames.current // Add this check
        ) {
          wsRef.current.send(JSON.stringify({
            frame: photo.base64,
            shouldProcess: true
          }));
          console.log("📤 Frame sent to server");
        }
      } catch (err) {
        console.error("🚫 Frame capture error:", err);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) && 
      nextAppState === 'active'
    ) {
      // App came to foreground
      setIsActive(true);
      connectWebSocket();
    } else if (
      appState.current === 'active' && 
      nextAppState.match(/inactive|background/)
    ) {
      // App went to background
      setIsActive(false);
      closeWebSocket();
    }

    appState.current = nextAppState;
  };

  useEffect(() => {
    if (isActive) {
      console.log(`📢 Language changed to: ${targetLanguage}`);
      connectWebSocket();
      return closeWebSocket;
    } else {
      closeWebSocket();
    }
  }, [targetLanguage, isActive, connectWebSocket, closeWebSocket]);

  const handleCameraPress = () => {
    if (detectionResult && isScreenFocused) {
      speakText(detectionResult);
    }
  };

  const handleQuadrantPress = (quadrant: 'left' | 'right') => {
    if (!isScreenFocused) return;
    const desc = getQuadrantDescription(quadrant, targetLanguage);
    if (desc) {
      speakText(desc);
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
          enableTorch={isTorchOn}
          animateShutter={false}
        >
          <CameraQuadrants 
            activeQuadrant={activeQuadrant} 
            onQuadrantPress={handleQuadrantPress}
          />
          {boundingBox && (
            <BoundingBox 
              box={boundingBox}
              screenWidth={screenWidth}
              screenHeight={screenHeight}
            />
          )}
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
          <View style={styles.centerButtonContainer}>
            <TouchableOpacity 
              onPress={handleCameraFlip}
              onLongPress={handleCameraLongPress}
              delayLongPress={500}
              style={styles.cameraButton}
            >
              <Ionicons 
                name="camera-reverse" 
                size={30} 
                color="white" 
              />
            </TouchableOpacity>
            <View style={styles.flashButtonContainer}>
              <TouchableOpacity 
                onPress={handleTorchToggle}
                onLongPress={handleTorchLongPress}
                delayLongPress={500}
                style={styles.flashButton}
              >
                <Ionicons 
                  name={isTorchOn ? 'flashlight' : 'flashlight-outline'} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </TouchableOpacity>
    </View>  
  );  
}

