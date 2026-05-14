import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './screens/HomeScreen';
import TransferPhotosScreen from './screens/TransferPhotosScreen';
import CloudConnectionsScreen from './screens/CloudConnectionsScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import { Storage } from './utils/storage';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await Storage.getItem('authToken');
      setIsLoggedIn(!!token);
    } catch {
      setIsLoggedIn(false);
    }
  };

  if (isLoggedIn === null) {
    return (
      <View style={styles.splash}>
        <Ionicons name="cloud" size={64} color="#2563eb" />
        <Text style={styles.splashText}>CloudVault</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: any;
                if (route.name === 'Gallery') iconName = focused ? 'images' : 'images-outline';
                else if (route.name === 'Transfer') iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
                else if (route.name === 'Clouds') iconName = focused ? 'cloud' : 'cloud-outline';
                else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#2563eb',
              tabBarInactiveTintColor: '#64748b',
              tabBarStyle: {
                backgroundColor: '#1e293b',
                borderTopWidth: 0,
                height: 60,
                paddingBottom: 8,
              },
              headerShown: false,
            })}
          >
            <Tab.Screen name="Gallery" component={HomeScreen} />
            <Tab.Screen name="Transfer" component={TransferPhotosScreen} />
            <Tab.Screen name="Clouds" component={CloudConnectionsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  splash: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
  },
});
