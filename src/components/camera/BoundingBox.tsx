import React from 'react';
import { View, StyleSheet } from 'react-native';

interface BoundingBoxProps {
  box: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  screenWidth: number;
  screenHeight: number;
}

export const BoundingBox: React.FC<BoundingBoxProps> = ({ box, screenWidth, screenHeight }) => {
  const styles = StyleSheet.create({
    box: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: '#00ff00',
      backgroundColor: 'transparent',
      left: box.x1,
      top: box.y1,
      width: box.x2 - box.x1,
      height: box.y2 - box.y1,
    }
  });

  return <View style={styles.box} />;
};