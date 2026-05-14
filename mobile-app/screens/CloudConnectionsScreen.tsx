import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
  AppState,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';
import { BACKEND_URL } from '../utils/constants';

export default function CloudConnectionsScreen() {
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const syncConnections = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    syncConnections();

    // Auto-refresh when app comes back to foreground (after OAuth in browser)
    const handleAppState = (nextState: string) => {
      if (nextState === 'active') {
        syncConnections(true);
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppState);

    // Also refresh when a URL event comes in (deep link fallback)
    const handleDeepLink = (event: { url: string }) => {
      syncConnections(true);
    };
    const linkSub = Linking.addEventListener('url', handleDeepLink);

    return () => {
      appStateSub.remove();
      linkSub.remove();
    };
  }, [syncConnections]);

  const connectGooglePhotos = async () => {
    try {
      const authToken = await Storage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Login Required', 'Please log in first before connecting cloud services.');
        return;
      }
      // Pass JWT token so the backend can save the connection automatically
      const authUrl = `${BACKEND_URL}/auth/google?token=${encodeURIComponent(authToken)}`;
      await Linking.openURL(authUrl);
    } catch (e) {
      Alert.alert('Error', 'Could not open authentication page.');
    }
  };

  const disconnectProvider = async (providerId: string) => {
    Alert.alert(
      'Disconnect Provider',
      'Are you sure you want to unlink this cloud service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await Storage.getItem('authToken');
              await fetch(`${BACKEND_URL}/api/connections/${providerId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              await syncConnections(true);
              Alert.alert('Disconnected', 'Cloud provider has been unlinked.');
            } catch (e) {
              Alert.alert('Error', 'Failed to disconnect provider.');
            }
          }
        }
      ]
    );
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
          <View style={styles.headerRow}>
            <Text style={styles.title}>Cloud Fabric</Text>
            {refreshing && <ActivityIndicator color="#3b82f6" size="small" />}
          </View>
          <Text style={styles.subtitle}>Unified Storage Management Pipeline</Text>
          <Text style={styles.connCount}>
            {connectedProviders.length} of {cloudProviders.length} services linked
          </Text>
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
                  if (isConnected) {
                    disconnectProvider(provider.id);
                  } else if (provider.id === 'google-photos') {
                    connectGooglePhotos();
                  } else {
                    Alert.alert('Coming Soon', `${provider.name} integration is currently being optimized for your region.`);
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

        <TouchableOpacity style={styles.refreshBtn} onPress={() => syncConnections(true)}>
          <Ionicons name="refresh" size={16} color="#3b82f6" />
          <Text style={styles.refreshText}>Refresh Connections</Text>
        </TouchableOpacity>

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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '500' },
  connCount: { fontSize: 12, color: '#3b82f6', marginTop: 6, fontWeight: '700' },
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
    borderColor: '#10b981',
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
  refreshBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(59, 130, 246, 0.05)'
  },
  refreshText: { color: '#3b82f6', fontSize: 13, fontWeight: '700', marginLeft: 8 },
  footer: { marginTop: 30, alignItems: 'center', paddingHorizontal: 20 },
  footerText: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 }
});

