import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LocationScreen(){
    return(
        <View style={styles.container}>
            <Text style={styles.title}>Location Screen</Text>
            <Text style={styles.description}>This is the location screen.</Text>
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