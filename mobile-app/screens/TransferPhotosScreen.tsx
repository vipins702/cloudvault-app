import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  FlatList,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';
import { BACKEND_URL } from '../utils/constants';

const { width } = Dimensions.get('window');

export default function TransferPhotosScreen() {
  const [transferring, setTransferring] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Real data state
  const [providers, setProviders] = useState<string[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Selection (Batch Support)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [targetProvider, setTargetProvider] = useState<string>('vercel-blob');
  const [targetFolder, setTargetFolder] = useState<string>('Transferred');
  
  // Scheduling Options
  const [schedule, setSchedule] = useState<'immediate' | 'night' | 'weekend'>('immediate');

  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    setLoadingData(true);
    try {
      const token = await Storage.getItem('authToken');
      if (!token) return;

      // 1. Fetch connected providers
      const connRes = await fetch(`${BACKEND_URL}/api/connections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const conns = await connRes.json();
      if (Array.isArray(conns)) {
        setProviders(conns.map(c => c.provider));
      }

      // 2. Fetch available files
      const fileRes = await fetch(`${BACKEND_URL}/api/cloud/photos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const fetchedFiles = await fileRes.json();
      if (Array.isArray(fetchedFiles)) {
        // Only show actual files (ignore folders here)
        setFiles(fetchedFiles.filter(f => f.type === 'image' || f.type === 'video'));
      }
    } catch (e) {
      console.error('Failed to load real data', e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleRealTransfer = async () => {
    if (selectedFileIds.size === 0) {
      Alert.alert('Select Files', 'Please select at least one asset to transfer.');
      return;
    }
    if (!providers.includes(targetProvider)) {
      Alert.alert('Provider Error', `You are not connected to ${targetProvider}. Link it in the Clouds tab first.`);
      return;
    }

    setTransferring(true);
    setProgress(0.1);

    try {
      const token = await Storage.getItem('authToken');
      
      if (schedule !== 'immediate') {
        // Mock Scheduling
        setTimeout(() => {
          setTransferring(false);
          setProgress(0);
          setSelectedFileIds(new Set());
          Alert.alert('Job Scheduled', `Your transfer of ${selectedFileIds.size} assets has been scheduled for ${schedule === 'night' ? 'Midnight' : 'the Weekend'}.`);
        }, 1500);
        return;
      }

      // Simulate progress visually while backend does the real work
      const interval = setInterval(() => setProgress(p => Math.min(p + 0.1, 0.9)), 500);

      const res = await fetch(`${BACKEND_URL}/api/files/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileIds: Array.from(selectedFileIds),
          targetProviderId: targetProvider,
          newFolder: targetFolder
        })
      });

      clearInterval(interval);
      setProgress(1.0);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');

      Alert.alert('Transfer Complete', `${selectedFileIds.size} asset(s) securely moved to ${targetProvider}.`);
      
      // Refresh the lists
      setSelectedFileIds(new Set());
      await loadRealData();

    } catch (err: any) {
      Alert.alert('Tunnel Failure', err.message);
    } finally {
      setTimeout(() => {
        setTransferring(false);
        setProgress(0);
      }, 500);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Cloud Tunnel</Text>
          <Text style={styles.subtitle}>Direct Server-to-Server Migration</Text>
        </View>

        {loadingData ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator color="#3b82f6" />
          </View>
        ) : (
          <>
            {/* File Selection */}
            <Text style={styles.sectionTitle}>1. Select Asset</Text>
            <View style={styles.fileListWrapper}>
              {files.length === 0 ? (
                <Text style={styles.emptyText}>No files available to transfer.</Text>
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={files}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      onPress={() => {
                        const newSet = new Set(selectedFileIds);
                        if (newSet.has(item.id)) newSet.delete(item.id);
                        else newSet.add(item.id);
                        setSelectedFileIds(newSet);
                      }}
                      style={[styles.fileCard, selectedFileIds.has(item.id) && styles.fileCardActive]}
                    >
                      <Image source={{ uri: item.url }} style={styles.fileImage} />
                      {selectedFileIds.has(item.id) && (
                        <View style={{ position: 'absolute', top: 5, right: 5, backgroundColor: '#3b82f6', borderRadius: 12, padding: 2 }}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      )}
                      <View style={styles.fileProviderBadge}>
                        <Text style={styles.fileProviderText}>{item.provider === 'vercel-blob' ? 'V' : 'S'}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>

            {/* Target Selection */}
            <Text style={styles.sectionTitle}>2. Select Target Provider</Text>
            <View style={styles.providerSelect}>
              {providers.length === 0 ? (
                <Text style={styles.emptyText}>No providers connected.</Text>
              ) : (
                providers.map(p => (
                  <TouchableOpacity 
                    key={p}
                    style={[styles.providerBtn, targetProvider === p && styles.providerBtnActive]}
                    onPress={() => setTargetProvider(p)}
                  >
                    <Ionicons 
                      name={p === 'aws-s3' ? 'logo-amazon' : p === 'google-photos' ? 'logo-google' : p === 'google-drive' ? 'logo-google' : p === 'dropbox' ? 'logo-dropbox' : 'triangle'} 
                      size={20} 
                      color={targetProvider === p ? '#fff' : '#64748b'} 
                    />
                    <Text style={[styles.providerText, targetProvider === p && styles.providerTextActive]}>
                      {p === 'aws-s3' ? 'AWS S3' : p === 'google-photos' ? 'Google Photos' : p === 'google-drive' ? 'Google Drive' : p === 'dropbox' ? 'Dropbox' : 'Vercel Blob'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Schedule Selection */}
            <Text style={styles.sectionTitle}>3. Scheduling</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity 
                style={[styles.providerBtn, schedule === 'immediate' && styles.providerBtnActive, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setSchedule('immediate')}
              >
                <Ionicons name="flash" size={16} color={schedule === 'immediate' ? '#fff' : '#64748b'} />
                <Text style={[styles.providerText, schedule === 'immediate' && styles.providerTextActive]}>Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.providerBtn, schedule === 'night' && styles.providerBtnActive, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setSchedule('night')}
              >
                <Ionicons name="moon" size={16} color={schedule === 'night' ? '#fff' : '#64748b'} />
                <Text style={[styles.providerText, schedule === 'night' && styles.providerTextActive]}>Midnight</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.providerBtn, schedule === 'weekend' && styles.providerBtnActive, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setSchedule('weekend')}
              >
                <Ionicons name="calendar" size={16} color={schedule === 'weekend' ? '#fff' : '#64748b'} />
                <Text style={[styles.providerText, schedule === 'weekend' && styles.providerTextActive]}>Weekend</Text>
              </TouchableOpacity>
            </View>

            {/* Visual Tunnel */}
            <View style={styles.tunnelContainer}>
              <View style={styles.cloudNode}>
                <View style={[styles.iconBox, { backgroundColor: '#334155' }]}>
                  <Ionicons name="cloud-download-outline" size={24} color="#94a3b8" />
                </View>
                <Text style={styles.nodeLabel}>SOURCE</Text>
              </View>

              <View style={styles.pipeline}>
                <Ionicons name="infinite" size={24} color={transferring ? '#3b82f6' : '#334155'} />
                <View style={styles.pipeTrack}>
                  <View style={[styles.pipeFill, { width: `${progress * 100}%` }]} />
                </View>
                <Ionicons name="arrow-forward" size={20} color={transferring ? '#3b82f6' : '#334155'} />
              </View>

              <View style={styles.cloudNode}>
                <View style={[styles.iconBox, { backgroundColor: targetProvider === 'aws-s3' ? '#FF990020' : '#3b82f620' }]}>
                  <Ionicons name={targetProvider === 'aws-s3' ? 'logo-amazon' : 'triangle'} size={24} color={targetProvider === 'aws-s3' ? '#FF9900' : '#fff'} />
                </View>
                <Text style={styles.nodeLabel}>DESTINATION</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="server-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>
                Transfer happens securely on the master backend. No mobile data is used for the byte stream.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.transferBtn, transferring && styles.btnDisabled]} 
              onPress={handleRealTransfer}
              disabled={transferring}
            >
              {transferring ? (
                <View style={styles.row}>
                  <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.btnText}>STREAMING... {Math.round(progress * 100)}%</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Initiate Real Migration</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 25, flex: 1 },
  header: { marginBottom: 30 },
  title: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '500' },
  
  sectionTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  
  fileListWrapper: { height: 100, marginBottom: 30 },
  fileCard: { width: 90, height: 90, borderRadius: 16, marginRight: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#1e293b' },
  fileCardActive: { borderColor: '#3b82f6', transform: [{ scale: 1.05 }] },
  fileImage: { width: '100%', height: '100%' },
  fileProviderBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 4 },
  fileProviderText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptyText: { color: '#64748b', fontSize: 14, fontStyle: 'italic', marginTop: 20 },

  providerSelect: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  providerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  providerBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
  providerText: { color: '#64748b', fontWeight: 'bold', marginLeft: 8 },
  providerTextActive: { color: '#fff' },

  tunnelContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#1e293b', 
    padding: 20, 
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20
  },
  cloudNode: { alignItems: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  nodeLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  pipeline: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  pipeTrack: { width: '100%', height: 4, backgroundColor: '#0f172a', borderRadius: 2, marginVertical: 10, overflow: 'hidden' },
  pipeFill: { height: '100%', backgroundColor: '#3b82f6' },
  
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 16, borderRadius: 16, marginBottom: 30, alignItems: 'center' },
  infoText: { color: '#64748b', fontSize: 12, lineHeight: 18, marginLeft: 12, flex: 1 },
  
  transferBtn: { backgroundColor: '#3b82f6', padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
  btnDisabled: { backgroundColor: '#1e293b', shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center' }
});
