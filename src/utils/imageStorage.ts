import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

interface StoredImage {
  name: string;
  uri: string;
  timestamp: number;
}

export const ImageStorage = {
  async saveImage(personName: string, uri: string): Promise<void> {
    try {
      // Create a permanent copy in app's document directory
      const fileName = `${Date.now()}_${personName}.jpg`;
      const newPath = `${FileSystem.documentDirectory}images/${fileName}`;
      
      // Ensure directory exists
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}images/`, {
        intermediates: true
      });
      
      // Copy image to permanent storage
      await FileSystem.copyAsync({
        from: uri,
        to: newPath
      });

      // Get existing stored images
      const existingImages = await this.getStoredImages();
      
      // Add new image to storage
      const newImage: StoredImage = {
        name: personName,
        uri: newPath,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(
        'storedImages',
        JSON.stringify([...existingImages, newImage])
      );
    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  },

  async getStoredImages(): Promise<StoredImage[]> {
    try {
      const images = await AsyncStorage.getItem('storedImages');
      return images ? JSON.parse(images) : [];
    } catch (error) {
      console.error('Error getting stored images:', error);
      return [];
    }
  },

  async clearStoredImages(): Promise<void> {
    try {
      await AsyncStorage.removeItem('storedImages');
      // Also remove files from filesystem
      await FileSystem.deleteAsync(`${FileSystem.documentDirectory}images/`, { idempotent: true });
    } catch (error) {
      console.error('Error clearing stored images:', error);
      throw error;
    }
  },

  async getProcessedNames(): Promise<string[]> {
    try {
      const names = await AsyncStorage.getItem('processedNames');
      return names ? JSON.parse(names) : [];
    } catch (error) {
      console.error('Error getting processed names:', error);
      return [];
    }
  },

  async addProcessedName(name: string): Promise<void> {
    try {
      const names = await this.getProcessedNames();
      if (!names.includes(name)) {
        await AsyncStorage.setItem(
          'processedNames',
          JSON.stringify([...names, name])
        );
      }
    } catch (error) {
      console.error('Error adding processed name:', error);
    }
  },

  async deleteProcessedName(name: string): Promise<void> {
    try {
      const names = await this.getProcessedNames();
      const updatedNames = names.filter(n => n !== name);
      await AsyncStorage.setItem('processedNames', JSON.stringify(updatedNames));
    } catch (error) {
      console.error('Error deleting processed name:', error);
      throw error;
    }
  },

  async deleteUnnamedLandmarks(): Promise<void> {
    try {
      const names = await this.getProcessedNames();
      const filteredNames = names.filter(name => name && name.trim() !== '');
      await AsyncStorage.setItem('processedNames', JSON.stringify(filteredNames));
    } catch (error) {
      console.error('Error deleting unnamed landmarks:', error);
      throw error;
    }
  }
};