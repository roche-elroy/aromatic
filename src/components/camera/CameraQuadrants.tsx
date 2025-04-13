import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

interface QuadrantProps {
  isActive?: boolean;
  onPress?: () => void;
}

const Quadrant: React.FC<QuadrantProps> = ({ isActive, onPress }) => (
  <TouchableOpacity 
    style={[styles.quadrant, isActive && styles.activeQuadrant]}
    onPress={onPress}
    activeOpacity={0.7}
  />
);

interface CameraQuadrantsProps {
  activeQuadrant: 'left' | 'right' | null;
  onQuadrantPress: (quadrant: 'left' | 'right') => void;
}

export const CameraQuadrants: React.FC<CameraQuadrantsProps> = ({ 
  activeQuadrant,
  onQuadrantPress
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Quadrant 
          isActive={activeQuadrant === 'left'} 
          onPress={() => onQuadrantPress('left')}
        />
        <Quadrant 
          isActive={activeQuadrant === 'right'} 
          onPress={() => onQuadrantPress('right')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  quadrant: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activeQuadrant: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});