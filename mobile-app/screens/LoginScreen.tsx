import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  StatusBar, ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';
import { BACKEND_URL } from '../utils/constants';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Access Denied', 'Please enter your vault credentials.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Identity verification failed');

      await Storage.setItem('authToken', data.token);
      await Storage.setItem('user', JSON.stringify(data.user));
      onLogin();
    } catch (err: any) {
      Alert.alert('Identity Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.headerDecor}>
        <View style={styles.glow} />
      </View>

      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="infinite" size={32} color="#fff" />
          </View>
        </View>
        
        <Text style={styles.logoText}>CloudVault</Text>
        <Text style={styles.subtitleText}>Unified Multi-Cloud Intelligence</Text>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#475569" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Vault Email"
            placeholderTextColor="#475569"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#475569" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Master Password"
            placeholderTextColor="#475569"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Authenticate</Text>
          )}
        </TouchableOpacity>

        <View style={styles.demoBox}>
          <Text style={styles.demoText}>Demo: admin@cloudvault.com / admin123</Text>
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={12} color="#10b981" />
          <Text style={styles.footerText}>AES-256 GCM END-TO-END ENCRYPTED</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', padding: 24 },
  headerDecor: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, overflow: 'hidden' },
  glow: { 
    position: 'absolute', 
    top: -100, 
    left: '10%', 
    width: '80%', 
    height: 400, 
    backgroundColor: '#2563eb', 
    opacity: 0.15, 
    borderRadius: 200,
    transform: [{ scaleX: 1.5 }],
    filter: 'blur(80px)' as any
  },
  card: {
    backgroundColor: '#0f172a',
    padding: 30,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#1e293b',
    ...Platform.select({
      ios: {
        shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 40,
      },
      android: { elevation: 10 },
      web: { boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.4)' }
    })
  },
  logoContainer: { alignItems: 'center', marginBottom: 15 },
  logoCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 20, 
    backgroundColor: '#2563eb', 
    justifyContent: 'center', 
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 15
      },
      web: { boxShadow: '0px 8px 15px rgba(37, 99, 235, 0.5)' }
    })
  },
  logoText: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -1 },
  subtitleText: { color: '#64748b', textAlign: 'center', marginBottom: 35, fontSize: 13, fontWeight: '500' },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#020617', 
    borderRadius: 16, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#1e293b' 
  },
  inputIcon: { marginLeft: 16 },
  input: {
    flex: 1,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
      },
      web: { boxShadow: '0px 4px 8px rgba(37, 99, 235, 0.3)' }
    })
  },
  buttonDisabled: { 
    backgroundColor: '#1e293b',
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      web: { boxShadow: 'none' }
    })
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  demoBox: { marginTop: 20, padding: 10, backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: 10 },
  demoText: { color: '#60a5fa', fontSize: 11, textAlign: 'center', fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  footerText: { color: '#334155', fontSize: 10, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },
});
