import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Linking,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';
import { BACKEND_URL } from '../utils/constants';

export default function CloudConnectionsScreen() {
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    syncConnections();
    
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url.includes('cloudvault://auth')) {
        const queryString = url.split('?')[1];
        if (queryString) {
          const params = queryString.split('&').reduce((acc: any, curr) => {
            const [key, val] = curr.split('=');
            acc[decodeURIComponent(key)] = decodeURIComponent(val);
            return acc;
          }, {});

          if (params.token && params.provider) {
            handleAuthSuccess(params.provider, params.token);
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  const syncConnections = async () => {
    setLoading(true);
    try {
      const token = await Storage.getItem('authToken');
      if (token) {
        const res = await fetch(`${BACKEND_URL}/api/connections`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const rows = await res.json();
        
        if (Array.isArray(rows)) {
          setConnectedProviders(rows.map((r: any) => r.provider));
        } else {
          console.error('Connections fetch returned non-array:', rows);
          setConnectedProviders([]);
        }
      }
    } catch (e) {
      console.error('Connection Sync Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = async (provider: string, cloudToken: string) => {
    setLoading(true);
    try {
      const authToken = await Storage.getItem('authToken');
      
      const response = await fetch(`${BACKEND_URL}/api/auth/link-cloud`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          provider, 
          token: cloudToken,
          name: provider === 'google-photos' ? 'My Google Photos' : 'Vercel Primary'
        })
      });

      if (!response.ok) throw new Error('Backend link failed');

      await syncConnections();
      Alert.alert('Integration Successful', `Your ${provider} vault is now part of your unified storage network.`);
    } catch (e) {
      Alert.alert('Handshake Error', 'Failed to link your cloud provider.');
    } finally {
      setLoading(false);
    }
  };

  const cloudProviders = [
    { id: 'google-photos', name: 'Google Photos', icon: 'logo-google', color: '#4285F4', desc: 'Sync your Google Photos library' },
    { id: 'vercel-blob', name: 'Vercel Blob', icon: 'triangle', color: '#000000', desc: 'Enterprise high-speed storage' },
    { id: 'icloud', name: 'Apple iCloud', icon: 'cloud-done-outline', color: '#000000', desc: 'Native iOS photo backup' },
    { id: 'aws-s3', name: 'Amazon S3', icon: 'logo-amazon', color: '#FF9900', desc: 'Secure industrial storage' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Cloud Fabric</Text>
          <Text style={styles.subtitle}>Unified Storage Management Pipeline</Text>
        </View>

        {loading && connectedProviders.length === 0 ? (
          <ActivityIndicator color="#2563eb" style={{ marginTop: 50 }} />
        ) : (
          cloudProviders.map((provider) => {
            const isConnected = connectedProviders.includes(provider.id);
            return (
              <TouchableOpacity 
                key={provider.id} 
                activeOpacity={0.7}
                style={[styles.providerCard, isConnected && styles.cardActive]}
                onPress={() => {
                  if (provider.id === 'google-photos') {
                    Linking.openURL(`${BACKEND_URL}/auth/google`);
                  } else {
                    Alert.alert('Integration Notice', `${provider.name} integration is currently being optimized for your region.`);
                  }
                }}
              >
                <View style={styles.cardMain}>
                  <View style={[styles.iconBox, { backgroundColor: provider.color + '20' }]}>
                    <Ionicons name={provider.icon as any} size={24} color={provider.color === '#000000' ? '#fff' : provider.color} />
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.providerName}>{provider.name}</Text>
                    <Text style={styles.providerDesc}>{provider.desc}</Text>
                  </View>
                </View>
                
                <View style={styles.statusBox}>
                  {isConnected ? (
                    <View style={styles.connectedBadge}>
                      <Ionicons name="checkmark-shield" size={14} color="#10b981" />
                      <Text style={styles.connectedText}>LINKED</Text>
                    </View>
                  ) : (
                    <Ionicons name="add-circle-outline" size={24} color="#475569" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.footer}>
          <Ionicons name="lock-closed" size={14} color="#475569" />
          <Text style={styles.footerText}>All connections are secured with AES-256 GCM encryption on the SaaS master backend.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 25 },
  header: { marginBottom: 35 },
  title: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '500' },
  providerCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#1e293b', 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  cardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#0f172a',
    borderWidth: 2
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoBox: { flex: 1 },
  providerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  providerDesc: { color: '#64748b', fontSize: 12, marginTop: 4 },
  statusBox: { marginLeft: 10 },
  connectedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8 
  },
  connectedText: { color: '#10b981', fontSize: 10, fontWeight: '900', marginLeft: 4 },
  footer: { marginTop: 40, alignItems: 'center', paddingHorizontal: 20 },
  footerText: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 }
});
