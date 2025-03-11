import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import { TRANSLATION_CACHE_PATH } from "../../lib/i18n";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const downloadTranslationPack = async (language: string) => {
    setDownloading(true);
    try {
      const packPath = `${TRANSLATION_CACHE_PATH}${language}/`;
      await FileSystem.makeDirectoryAsync(packPath, { intermediates: true });
      // Simulate download - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      await FileSystem.writeAsStringAsync(
        `${packPath}downloaded.json`,
        JSON.stringify({ downloaded: true })
      );
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const changeLanguage = async (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.language')}</Text>
      {downloading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <View style={styles.languageButtons}>
          <TouchableOpacity 
            style={[styles.button, i18n.language === 'en' && styles.activeButton]}
            onPress={() => changeLanguage('en')}
          >
            <Text style={styles.buttonText}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, i18n.language === 'hi' && styles.activeButton]}
            onPress={() => changeLanguage('hi')}
          >
            <Text style={styles.buttonText}>हिंदी</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  languageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    color: '#000',
  }
});