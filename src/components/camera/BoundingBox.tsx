import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface BoundingBoxProps {
  box: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label?: string;
  };
  screenWidth: number;
  screenHeight: number;
}

export const BoundingBox: React.FC<BoundingBoxProps> = ({ box, screenWidth, screenHeight }) => {
  // Scale coordinates to screen dimensions
  const scaleX = screenWidth;
  const scaleY = screenHeight;

  const style = StyleSheet.create({
    box: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: '#00ff00',
      left: box.x1 * scaleX,
      top: box.y1 * scaleY,
      width: (box.x2 - box.x1) * scaleX,
      height: (box.y2 - box.y1) * scaleY,
    },
    label: {
      position: 'absolute',
      top: (box.y1 * scaleY) - 20,
      left: box.x1 * scaleX,
      backgroundColor: '#00ff00',
      padding: 2,
      color: 'white',
      fontSize: 12,
    }
  });

  return (
    <>
      <View style={style.box} />
      {box.label && <Text style={style.label}>{box.label}</Text>}
    </>
  );
};