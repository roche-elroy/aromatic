import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen(){
    return(
        <View style={styles.container}>
            <Text style={styles.title}>Settings Screen</Text>
            <Text style={styles.description}>This is the Settings screen.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    description: {
        fontSize: 16,
        color: '#555',
    },
});