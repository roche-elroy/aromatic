import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { TranslationProvider, useTranslation } from './src/context/TranslationContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CameraScreen from './src/components/camera/Camera';
import SettingsScreen from './src/components/settings/Settings';
import EmergencyScreen from './src/components/emergency/Emergency';
import LocationScreen from './src/components/location/Location';
import ProfileScreen from './src/components/profile/Profile';
import { useState as useStateEffect } from 'react';
import "./src/lib/i18n";
import { BiometricAuth } from './src/components/auth/BiometricAuth';
import { speak } from './src/utils/speech';

//comment the below line to show errors
import { LogBox } from 'react-native';
LogBox.ignoreAllLogs(); //Ignore all log notifications

const Tab = createBottomTabNavigator();

function AppContent() {
  const { translateText, targetLanguage } = useTranslation();
  const [translations, setTranslations] = useStateEffect({
    settings: 'Settings',
    emergency: 'Emergency',
    camera: 'Camera',
    location: 'Location',
    profile: 'Profile'
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Announce screen changes
  const handleScreenChange = async (screenName: string) => {
    const translatedText = await translateText(`${screenName} screen`);
    await speak(translatedText, targetLanguage);
  };

  useEffect(() => {
    const translateLabels = async () => {
      const translated = {
        settings: await translateText('Settings'),
        emergency: await translateText('Emergency'),
        camera: await translateText('Camera'),
        location: await translateText('Location'),
        profile: await translateText('Profile')
      };
      setTranslations(translated);
    };

    translateLabels();
  }, [targetLanguage, translateText]);

  if (!isAuthenticated) {
    return <BiometricAuth onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Camera"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            switch (route.name) {
              case 'Camera':
                iconName = focused ? 'camera' : 'camera-outline';
                break;
              case 'Settings':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              case 'Emergency':
                iconName = focused ? 'warning' : 'warning-outline';
                break;
              case 'Location':
                iconName = focused ? 'location' : 'location-outline';
                break;
              case 'Profile':
                iconName = focused ? 'person' : 'person-outline';
                break;
              default:
                iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: styles.tabBar,
          headerStyle: styles.header,
          headerTintColor: '#fff',
          headerTitleStyle: styles.headerTitle,
        })}
        screenListeners={{
          focus: (e) => {
            const routeName = e.target?.split('-')[0];
            if (routeName) {
              handleScreenChange(routeName);
            }
          }
        }}
      >
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: translations.settings }}
        />
        <Tab.Screen 
          name="Emergency" 
          component={EmergencyScreen}
          options={{ title: translations.emergency }}
        />
        <Tab.Screen 
          name="Camera" 
          component={CameraScreen}
          options={{ title: translations.camera }}
        />
        <Tab.Screen 
          name="Location" 
          component={LocationScreen}
          options={{ title: translations.location }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: translations.profile }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <TranslationProvider>
      <AppContent />
    </TranslationProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  header: {
    backgroundColor: '#000',
  },
  headerTitle: {
    fontSize: 18,
  }
});