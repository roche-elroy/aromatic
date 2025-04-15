import { CameraPictureOptions, CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { AppState, AppStateStatus } from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Button, Alert, Linking, Platform } from "react-native";
import * as Speech from 'expo-speech';
import { useTranslation } from "../../context/TranslationContext";
import { useSpeech } from '../../hooks/useSpeech';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SERVER_IP } from "../../lib/constants";
import { Camera } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { TrackedObjects } from './TrackedObjects';

import { styles } from "./CameraStyles";

export default function CameraScreen() {  
  const [permission, requestPermission] = useCameraPermissions();
  const { targetLanguage, translateText } = useTranslation();
  const [facing, setFacing] = useState<CameraType>("back");
  const [detectionResult, setDetectionResult] = useState<string>("");
  const [depthValue, setDepthValue] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isObjectClose, setIsObjectClose] = useState(false);
  const PROXIMITY_THRESHOLD = 0.1;
  const cameraRef = useRef<CameraView>(null);
  const isStreaming = useRef<boolean>(false);  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptRef = useRef<number>(0);
  const speakText = useSpeech();
  const appState = useRef(AppState.currentState);
  const [isActive, setIsActive] = useState(true);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [boundingBox, setBoundingBox] = useState<any>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const shouldProcessFrames = useRef<boolean>(false);
  const [trackingResults, setTrackingResults] = useState<any[]>([]);

  const handlePermissions = async () => {
    const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
    
    if (status === 'denied' && !canAskAgain) {
      // If permission is denied and can't ask again, redirect to settings
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in your device settings to use this feature.',
        [
          { 
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          }
        ]
      );
      return false;
    } else if (status !== 'granted') {
      // First time asking or can ask again
      const { status: newStatus } = await requestPermission();
      if (newStatus !== 'granted') {
        // If user denies, show settings alert
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to use this feature.',
          [
            { 
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    handlePermissions();
  }, []);

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
        
        if (result.tracking_results) {
          console.log(`🎯 Detected ${result.tracking_results.length} objects`);
          
          // Enhance the tracking results with depth information if available
          interface TrackingResult {
            class: string;
            depth?: number;
            unit?: string;
            [key: string]: any; // For any other properties that might be present
          }

          interface EnhancedTrackingResult extends TrackingResult {
            displayName: string;
          }

          interface ServerResult {
            tracking_results: TrackingResult[];
            depth: number | null;
            unit?: string;
          }

                    const enhancedTracking: EnhancedTrackingResult[] = result.tracking_results.map((obj: TrackingResult) => {
                      // Check if this object has depth information
                      const depthInfo: string = result.depth !== null ? 
                        `${result.depth}${result.unit || 'cm'}` : 
                        (obj.depth ? `${obj.depth}${obj.unit || 'cm'}` : '');
                      
                      // Build enhanced object info
                      return {
                        ...obj,
                        // Add depth display if available
                        displayName: depthInfo ? 
                          `${obj.class} (${depthInfo})` : 
                          obj.class
                      };
                    });
          
          setTrackingResults(enhancedTracking);
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
        
        if (result.bounding_box) {
          setBoundingBox(result.bounding_box);
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
        setDepthValue(null);
        setIsObjectClose(false);
        setTrackingResults([]);
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
          shouldProcessFrames.current
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

  const handleObjectTap = async (info: string) => {
    console.log('👆 Object tapped:', info);
    if (isScreenFocused) {
      const translatedInfo = await translateText(info);
      speakText(translatedInfo);
    }
  };

  // Function to format depth info for an object
  const formatObjectDepth = (obj: any) => {
    if (!obj) return '';
    
    // Check if depth exists in the object directly
    if (obj.depth) {
      return `${obj.depth}${obj.unit || 'm'}`;
    }
    
    return '';
  };

  // Function to get positions of all tracked objects with depth
  const getObjectPositionsWithDepth = () => {
    if (!trackingResults.length) return '';
    
    const positions = trackingResults.map(obj => {
      const className = obj.class.split(' (')[0]; // Remove any position info already in class name
      const depthInfo = formatObjectDepth(obj);
      const positionText = depthInfo ? 
        `${className} is on the ${obj.class.match(/\(([^)]+)\)/)?.[1] || 'center'} at ${depthInfo}` :
        `${className} is on the ${obj.class.match(/\(([^)]+)\)/)?.[1] || 'center'}`;
      
      return positionText;
    });
    
    return positions.join(', ');
  };

  // Main camera view
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
          {/* Render TrackedObjects first (lower z-index) */}
          {trackingResults.length > 0 && (
            <TrackedObjects
              objects={trackingResults}
              screenWidth={screenWidth}
              screenHeight={screenHeight}
              onTap={handleObjectTap}
            />
          )}

          {/* Status messages */}
          {!isConnected && (
            <Text style={[styles.connectionStatus, { zIndex: 99 }]}>
              {targetLanguage === 'hi' ? 'पुन: कनेक्ट हो रहा है...' : 'Reconnecting...'}
            </Text>
          )}

          {/* Detection results */}
          {(detectionResult || depthValue) && (
            <View style={styles.detectionContainer}>
              <Text style={styles.detectionText}>
                {`${detectionResult}`}
              </Text>
              {isObjectClose && (
                <Text style={styles.proximityWarning}>
                  {targetLanguage === 'hi'
                    ? 'आप वस्तु के बहुत करीब हैं'
                    : 'You are too close to the object'}
                </Text>
              )}
            </View>
          )}

          {/* Control panel on top */}
          <View style={styles.controlPanel}>
            <TouchableOpacity 
              onPress={handleCameraFlip}
              onLongPress={handleCameraLongPress}
              delayLongPress={500}
              style={styles.sideButton}
            >
              <Ionicons 
                name="camera-reverse" 
                size={28} 
                color="white" 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={async () => {
                const positions = getObjectPositionsWithDepth();
                if (positions) {
                  const translatedPositions = await translateText(positions);
                  speakText(translatedPositions);
                } else {
                  // If no objects detected
                  const noObjectsMessage = targetLanguage === 'hi' ? 
                    'कोई वस्तु नहीं मिली' : 
                    'No objects detected';
                  speakText(noObjectsMessage);
                }
              }}
              style={styles.centerButton}
            >
              <MaterialCommunityIcons 
                name="crosshairs-gps" 
                size={40} 
                color="white" 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleTorchToggle}
              onLongPress={handleTorchLongPress}
              delayLongPress={500}
              style={styles.sideButton}
            >
              <Ionicons 
                name={isTorchOn ? 'flashlight' : 'flashlight-outline'} 
                size={28} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        </CameraView>
      </TouchableOpacity>
    </View>
  );  
}

