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
  }
};