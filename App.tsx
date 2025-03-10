import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CameraScreen from './src/components/camera/Camera';
import SettingsScreen from './src/components/settings/Settings';
import EmergencyScreen from './src/components/emergency/Emergency';
import LocationScreen from './src/components/location/Location';
import ProfileScreen from './src/components/profile/Profile';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            switch (route.name) {
              case 'Settings':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              case 'Emergency':
                iconName = focused ? 'warning' : 'warning-outline';
                break;
              case 'Camera':
                iconName = focused ? 'camera' : 'camera-outline';
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
      >
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Tab.Screen 
          name="Emergency" 
          component={EmergencyScreen}
          options={{ title: 'Emergency' }}
        />
        <Tab.Screen 
          name="Camera" 
          component={CameraScreen}
          options={{ title: 'Camera' }}
        />
        <Tab.Screen 
          name="Location" 
          component={LocationScreen}
          options={{ title: 'Location' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
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
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  }
});