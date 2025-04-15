import { useState, useEffect } from 'react';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type RootTabParamList = {
  Settings: undefined;
  Emergency: undefined;
  Camera: undefined;
  Location: undefined;
  Profile: undefined;
};

const screens: (keyof RootTabParamList)[] = ['Settings', 'Emergency', 'Camera', 'Location', 'Profile'];

export const useCircularNavigation = (navigation: BottomTabNavigationProp<RootTabParamList>) => {
  const [currentIndex, setCurrentIndex] = useState(2); // Start with Camera (index 2)

  useEffect(() => {
    // Update current index when navigation state changes
    const unsubscribe = navigation.addListener('state', (e) => {
      const currentRoute = e.data.state.routes[e.data.state.index].name;
      const newIndex = screens.indexOf(currentRoute as keyof RootTabParamList);
      if (newIndex !== -1) {
        setCurrentIndex(newIndex);
      }
    });

    return unsubscribe;
  }, [navigation]);

  const navigateCircular = (direction: 'left' | 'right') => {
    let newIndex;
    if (direction === 'right') {
      newIndex = (currentIndex + 1) % screens.length;
    } else {
      newIndex = (currentIndex - 1 + screens.length) % screens.length;
    }
    setCurrentIndex(newIndex);
    navigation.navigate(screens[newIndex]);
    return screens[newIndex];
  };

  return { 
    navigateCircular, 
    currentScreen: screens[currentIndex] 
  };
};