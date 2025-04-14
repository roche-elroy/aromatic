import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  onTap?: (objectInfo: string) => void;
}

export const TrackedObjects = ({ objects, screenWidth, screenHeight, onTap }: TrackedObjectsProps) => {
  useEffect(() => {
    console.log('🎯 Tracked Objects:', objects.map(obj => ({
      id: obj.id,
      class: obj.class,
      position: getObjectPosition(obj.bbox, screenWidth)
    })));
  }, [objects]);

  const getObjectPosition = (bbox: number[], screenWidth: number): 'left' | 'center' | 'right' => {
    const [x1] = bbox;
    const centerX = x1 * screenWidth;
    const third = screenWidth / 3;

    if (centerX < third) return 'left';
    if (centerX > third * 2) return 'right';
    return 'center';
  };

  const handleTap = (obj: TrackedObject) => {
    const position = getObjectPosition(obj.bbox, screenWidth);
    const info = `${obj.class} number ${obj.id} is on the ${position}`;
    console.log('🔊 Speaking:', info);
    onTap?.(info);
  };

  return (
    <>
      {objects?.map((obj) => {
        const [x1, y1, x2, y2] = obj.bbox;
        const width = (x2 - x1) * screenWidth;
        const height = (y2 - y1) * screenHeight;
        const left = x1 * screenWidth;
        const top = y1 * screenHeight;
        const position = getObjectPosition(obj.bbox, screenWidth);

        return (
          <View
            key={obj.id}
            style={[
              styles.boundingBox,
              {
                width,
                height,
                left,
                top,
              },
            ]}
            onTouchEnd={() => handleTap(obj)}
          >
            <Text style={styles.label}>
              {`${obj.class} #${obj.id} (${position})`}
            </Text>
          </View>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
  },
  label: {
    backgroundColor: 'rgba(0, 255, 0, 0.7)',
    color: 'white',
    fontSize: 12,
    padding: 4,
    position: 'absolute',
    top: -24,
    left: 0,
  },
});