import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background glow */}
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />

      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBg}>
            <Ionicons name="infinite" size={40} color="#fff" />
          </View>
        </View>

        <Text style={styles.logoText}>CloudVault</Text>
        <Text style={styles.tagline}>Unified Multi-Cloud Intelligence</Text>

        {/* Animated loader */}
        <Animated.View style={[styles.loaderContainer, { opacity: pulseAnim }]}>
          <View style={styles.loaderDot} />
          <View style={[styles.loaderDot, { marginHorizontal: 8 }]} />
          <View style={styles.loaderDot} />
        </Animated.View>

        {/* Features */}
        <View style={styles.features}>
          <Feature icon="shield-checkmark" text="AES-256 Encrypted" />
          <Feature icon="swap-horizontal" text="Cross-Cloud Transfers" />
          <Feature icon="sparkles" text="AI Duplicate Detection" />
        </View>
      </Animated.View>

      <Text style={styles.version}>v2.5.1 Enterprise</Text>
    </View>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon as any} size={14} color="#3b82f6" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  glowOuter: {
    position: 'absolute',
    top: '20%',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#1e3a8a',
    opacity: 0.08,
  },
  glowInner: {
    position: 'absolute',
    top: '30%',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: '#2563eb',
    opacity: 0.1,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 14,
    color: '#475569',
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loaderContainer: {
    flexDirection: 'row',
    marginTop: 40,
    marginBottom: 50,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  features: {
    alignItems: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  featureText: {
    color: '#94a3b8',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '600',
  },
  version: {
    position: 'absolute',
    bottom: 40,
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
