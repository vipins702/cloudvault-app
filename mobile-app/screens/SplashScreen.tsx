import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * SplashScreen - App loading state
 */
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>☁️</Text>
        <Text style={styles.logoText}>CloudVault</Text>
      </View>

      {/* Loading */}
      <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />

      {/* Subtitle */}
      <Text style={styles.subtitle}>Transfer Photos Anywhere</Text>

      {/* Features */}
      <View style={styles.features}>
        <Feature text="iCloud → Google Photos" />
        <Feature text="One-tap transfers" />
        <Feature text="Secure backup" />
      </View>
    </View>
  );
}

function Feature({ text }: any) {
  return (
    <View style={styles.feature}>
      <Ionicons name="checkmark" size={16} color="#10b981" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  loader: {
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 40,
  },
  features: {
    alignItems: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#d1d5db',
    fontSize: 14,
    marginLeft: 8,
  },
});
