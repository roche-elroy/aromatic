import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './CameraStyles';

interface FlashButtonProps {
    isFlashOn: boolean;
    onToggleFlash: () => void;
    onLongPress: () => void;
    style?: any;
}

export const FlashButton: React.FC<FlashButtonProps> = ({ 
    isFlashOn, 
    onToggleFlash,
    onLongPress,
    style 
}) => {
    return (
        <TouchableOpacity 
            onPress={onToggleFlash}
            onLongPress={onLongPress}
            delayLongPress={500}
            style={[styles.flashButton, style]}
        >
            <Ionicons 
                name={isFlashOn ? 'flash' : 'flash-off'} 
                size={24} 
                color="white" 
            />
        </TouchableOpacity>
    );
};
