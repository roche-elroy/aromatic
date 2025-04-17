import fs from 'react-native-fs';
import { Platform } from 'react-native';

export const loadDescriptors = async (personName: string) => {
    try {
        const descriptorPath = Platform.select({
            android: `${fs.DocumentDirectoryPath}/descriptors/${personName}_descriptors.pkl`,
            ios: `${fs.DocumentDirectoryPath}/descriptors/${personName}_descriptors.pkl`,
            default: `A:/aromatic/src/components/descriptors/${personName}_descriptors.pkl`,
        });

        if (await fs.exists(descriptorPath)) {
            const data = await fs.readFile(descriptorPath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error(`Error loading descriptors for ${personName}:`, error);
        return null;
    }
};