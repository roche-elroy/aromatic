import React from 'react';
import { View, Text } from 'react-native';

interface TrackedObject {
  id: number;
  class: string;
  bbox: [number, number, number, number];
  confidence: number;
}

interface TrackedObjectsProps {
  objects: TrackedObject[];
  screenWidth: number;
  screenHeight: number;
  onTap?: (info: string) => void;
}

export const TrackedObjects = ({ objects, screenWidth, screenHeight, onTap }: TrackedObjectsProps) => {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 120 }}>
      {objects?.map((obj) => {
        const [x1, y1, x2, y2] = obj.bbox;
        const width = (x2 - x1) * screenWidth;
        const height = (y2 - y1) * screenHeight;
        const left = x1 * screenWidth;
        const top = y1 * screenHeight;

        // Don't render boxes that would overlap with control panel
        if (top + height > screenHeight - 140) {
          return null;
        }

        return (
          <View
            key={obj.id}
            style={{
              position: 'absolute',
              width,
              height,
              left,
              top,
              borderWidth: 2,
              borderColor: '#00FF00',
              backgroundColor: 'transparent',
              zIndex: 1,
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -30,
                left: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: 4,
                borderRadius: 4,
                maxWidth: width + 40,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 'bold',
                }}
                numberOfLines={1}
              >
                {`${obj.class} (${Math.round(obj.confidence * 100)}%)`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};