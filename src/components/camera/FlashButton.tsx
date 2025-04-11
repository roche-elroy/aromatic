import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FlashButtonProps {
    isFlashOn: boolean;
    onToggleFlash: () => void;
}

export const FlashButton: React.FC<FlashButtonProps> = ({ isFlashOn, onToggleFlash }) => {
    return (
        <TouchableOpacity 
          onPress={onToggleFlash}
          style={styles.flashButton}
        >
          <Ionicons 
            name={isFlashOn ? 'flash' : 'flash-off'} 
            size={30} 
            color="white" 
          />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flashButton: {
        margin: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 30,
        padding: 10,
    },
})
