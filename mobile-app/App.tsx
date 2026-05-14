import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './screens/HomeScreen';
import TransferPhotosScreen from './screens/TransferPhotosScreen';
import CloudConnectionsScreen from './screens/CloudConnectionsScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import SplashScreen from './screens/SplashScreen';
import { Storage } from './utils/storage';

const Tab = createBottomTabNavigator();

const darkTheme = {
  dark: true,
  colors: {
    primary: '#3b82f6',
    background: '#0f172a',
    card: '#0f172a',
    text: '#fff',
    border: '#1e293b',
    notification: '#ef4444',
  },
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await Storage.getItem('authToken');
      // Add a slight delay for splash screen effect
      setTimeout(() => {
        setIsLoggedIn(!!token);
      }, 1500);
    } catch {
      setIsLoggedIn(false);
    }
  };

  if (isLoggedIn === null) {
    return <SplashScreen />;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={darkTheme}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: any;
                if (route.name === 'Gallery') iconName = focused ? 'images' : 'images-outline';
                else if (route.name === 'Transfer') iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
                else if (route.name === 'Clouds') iconName = focused ? 'cloud' : 'cloud-outline';
                else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
                return (
                  <View style={focused ? styles.activeIconContainer : undefined}>
                    <Ionicons name={iconName} size={22} color={color} />
                  </View>
                );
              },
              tabBarActiveTintColor: '#3b82f6',
              tabBarInactiveTintColor: '#475569',
              tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 0.3,
                marginTop: -2,
              },
              tabBarStyle: {
                backgroundColor: '#0c1222',
                borderTopWidth: 1,
                borderTopColor: '#1e293b',
                height: Platform.OS === 'ios' ? 88 : 65,
                paddingTop: 8,
                paddingBottom: Platform.OS === 'ios' ? 28 : 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 20,
              },
              headerShown: false,
            })}
          >
            <Tab.Screen name="Gallery" component={HomeScreen} />
            <Tab.Screen name="Transfer" component={TransferPhotosScreen} />
            <Tab.Screen name="Clouds" component={CloudConnectionsScreen} />
            <Tab.Screen 
              name="Settings" 
              children={() => <SettingsScreen onLogout={() => setIsLoggedIn(false)} />}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  activeIconContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
});
