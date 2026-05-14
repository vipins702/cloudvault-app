import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  AppState,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';
import { BACKEND_URL } from '../utils/constants';

export default function CloudConnectionsScreen() {
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [configValues, setConfigValues] = useState<{ [key: string]: string }>({});
  const [connecting, setConnecting] = useState(false);

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

  const handleConnectAPI = async () => {
    if (!activeProvider) return;
    
    // Validate inputs
    for (const field of activeProvider.fields) {
      if (!configValues[field.id]) {
        Alert.alert('Missing Info', `Please enter your ${field.label}`);
        return;
      }
    }

    setConnecting(true);
    try {
      const token = await Storage.getItem('authToken');
      const payload = {
        provider: activeProvider.id,
        name: activeProvider.name,
        token: JSON.stringify(configValues)
      };

      const res = await fetch(`${BACKEND_URL}/api/auth/link-cloud`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save connection');
      
      setModalVisible(false);
      setConfigValues({});
      syncConnections(true);
    } catch (e: any) {
      Alert.alert('Connection Error', e.message);
    } finally {
      setConnecting(false);
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
    { 
      id: 'google-photos', name: 'Google Photos', icon: 'logo-google', color: '#4285F4', 
      desc: 'Sync your Google Photos library', authType: 'oauth' 
    },
    { 
      id: 'vercel-blob', name: 'Vercel Blob', icon: 'triangle', color: '#ffffff', 
      desc: 'Enterprise high-speed storage', authType: 'api',
      fields: [{ id: 'token', label: 'Vercel API Token', secure: true }]
    },
    { 
      id: 'aws-s3', name: 'Amazon S3', icon: 'logo-amazon', color: '#FF9900', 
      desc: 'Secure industrial storage', authType: 'api',
      fields: [
        { id: 'accessKeyId', label: 'Access Key ID', secure: false },
        { id: 'secretAccessKey', label: 'Secret Access Key', secure: true },
        { id: 'bucket', label: 'Bucket Name', secure: false },
        { id: 'region', label: 'Region (e.g., us-east-1)', secure: false }
      ]
    },
    { 
      id: 'icloud', name: 'Apple iCloud', icon: 'cloud-done-outline', color: '#ffffff', 
      desc: 'Native iOS photo backup', authType: 'coming_soon' 
    },
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
                  } else if (provider.authType === 'oauth') {
                    connectGooglePhotos();
                  } else if (provider.authType === 'api') {
                    setActiveProvider(provider);
                    setConfigValues({});
                    setModalVisible(true);
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
                      <Ionicons name="shield-checkmark" size={14} color="#10b981" />
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

      {/* Config Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: activeProvider?.color + '20' }]}>
                <Ionicons name={activeProvider?.icon as any} size={24} color={activeProvider?.color === '#000000' ? '#fff' : activeProvider?.color} />
              </View>
              <Text style={styles.modalTitle}>Configure {activeProvider?.name}</Text>
              <Text style={styles.modalSubtitle}>Enter credentials to link this provider.</Text>
            </View>

            {activeProvider?.fields?.map((field: any) => (
              <View key={field.id} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter ${field.label}`}
                  placeholderTextColor="#475569"
                  secureTextEntry={field.secure}
                  value={configValues[field.id] || ''}
                  onChangeText={(val) => setConfigValues(prev => ({ ...prev, [field.id]: val }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancel} 
                onPress={() => setModalVisible(false)}
                disabled={connecting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSubmit, connecting && { opacity: 0.7 }]} 
                onPress={handleConnectAPI}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Connect & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 25 },
  header: { marginBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '500' },
  connCount: { fontSize: 12, color: '#3b82f6', marginTop: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  providerCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#1e293b', 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  cardActive: { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' },
  cardMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  infoBox: { marginLeft: 16, flex: 1 },
  providerName: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  providerDesc: { color: '#64748b', fontSize: 12, marginTop: 4, paddingRight: 10 },
  statusBox: { alignItems: 'center', justifyContent: 'center', paddingLeft: 10 },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  connectedText: { color: '#10b981', fontSize: 10, fontWeight: '900', marginLeft: 4, letterSpacing: 0.5 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 15, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 16 },
  refreshText: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 40, paddingHorizontal: 10, paddingBottom: 30 },
  footerText: { flex: 1, color: '#475569', fontSize: 11, marginLeft: 10, lineHeight: 16, fontWeight: '500' },
  
  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { 
    backgroundColor: '#1e293b', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30
  },
  modalHeader: { alignItems: 'center', marginBottom: 30 },
  modalIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  modalSubtitle: { color: '#94a3b8', fontSize: 14, marginTop: 8 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: { 
    backgroundColor: '#0f172a', 
    borderWidth: 1, 
    borderColor: '#334155', 
    borderRadius: 16, 
    padding: 16, 
    color: '#fff', 
    fontSize: 16 
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalCancel: { 
    flex: 1, 
    padding: 18, 
    borderRadius: 16, 
    backgroundColor: '#0f172a', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  modalCancelText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
  modalSubmit: { 
    flex: 2, 
    padding: 18, 
    borderRadius: 16, 
    backgroundColor: '#3b82f6', 
    alignItems: 'center' 
  },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
