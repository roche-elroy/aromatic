import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../context/TranslationContext';

export default function EmergencyScreen() {
    const { translateText, targetLanguage } = useTranslation();
    const [translations, setTranslations] = useState({
        title: 'Emergency Services',
        description: 'Call emergency services immediately',
        police: 'Police',
        ambulance: 'Ambulance',
        fire: 'Fire Department',
        call: 'Call'
    });

    useEffect(() => {
        const translateUI = async () => {
            try {
                const translated = {
                    title: await translateText('Emergency Services'),
                    description: await translateText('Call emergency services immediately'),
                    police: await translateText('Police'),
                    ambulance: await translateText('Ambulance'),
                    fire: await translateText('Fire Department'),
                    call: await translateText('Call')
                };
                setTranslations(translated);
            } catch (error) {
                console.error('Translation error:', error);
            }
        };

        translateUI();
    }, [targetLanguage, translateText]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{translations.title}</Text>
            <Text style={styles.description}>{translations.description}</Text>

            <View style={styles.servicesContainer}>
                <TouchableOpacity style={styles.serviceButton}>
                    <Ionicons name="shield-outline" size={32} color="#007AFF" />
                    <Text style={styles.serviceText}>{translations.police}</Text>
                    <Text style={styles.callText}>{translations.call} 100</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.serviceButton}>
                    <Ionicons name="medical-outline" size={32} color="#007AFF" />
                    <Text style={styles.serviceText}>{translations.ambulance}</Text>
                    <Text style={styles.callText}>{translations.call} 108</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.serviceButton}>
                    <Ionicons name="flame-outline" size={32} color="#007AFF" />
                    <Text style={styles.serviceText}>{translations.fire}</Text>
                    <Text style={styles.callText}>{translations.call} 101</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f0f0f0',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center'
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center'
    },
    servicesContainer: {
        gap: 20,
    },
    serviceButton: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    serviceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
    },
    callText: {
        fontSize: 14,
        color: '#007AFF',
        marginTop: 5,
    }
});