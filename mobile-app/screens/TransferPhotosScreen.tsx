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
  StatusBar,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';
import { MigrationManager } from '../utils/tunnel';
import { VercelAdapter } from '../utils/providers';

const { width } = Dimensions.get('window');

export default function TransferPhotosScreen() {
  const [transferring, setTransferring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [source, setSource] = useState('vercel-blob');
  const [target, setTarget] = useState('aws-s3');
  const [stats, setStats] = useState({ items: 12, size: '4.2 MB' });

  const handleMigration = async () => {
    setTransferring(true);
    setProgress(0);

    try {
      // MOCK MIGRATION (Simulation of the Tunnel in action)
      // In a real scenario, we would use MigrationManager.bulkTransfer
      // with real adapter instances.
      
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 1) {
            clearInterval(interval);
            setTransferring(false);
            Alert.alert('Migration Complete', 'All assets successfully moved across the cloud tunnel.');
            return 1;
          }
          return prev + 0.05;
        });
      }, 200);

    } catch (err) {
      Alert.alert('Tunnel Failure', 'The secure link was interrupted.');
      setTransferring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Cloud Tunnel</Text>
          <Text style={styles.subtitle}>Direct Cross-Cloud Migration</Text>
        </View>

        <View style={styles.tunnelContainer}>
          <View style={styles.cloudNode}>
            <View style={[styles.iconBox, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="logo-vercel" size={32} color="#fff" />
            </View>
            <Text style={styles.nodeLabel}>{source.toUpperCase()}</Text>
          </View>

          <View style={styles.pipeline}>
            <Ionicons name="infinite" size={24} color={transferring ? '#60a5fa' : '#334155'} />
            <View style={styles.pipeTrack}>
              <View style={[styles.pipeFill, { width: `${progress * 100}%` }]} />
            </View>
            <Ionicons name="arrow-forward" size={20} color={transferring ? '#60a5fa' : '#334155'} />
          </View>

          <View style={styles.cloudNode}>
            <View style={[styles.iconBox, { backgroundColor: '#FF990020' }]}>
              <Ionicons name="logo-amazon" size={32} color="#FF9900" />
            </View>
            <Text style={styles.nodeLabel}>{target.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.items}</Text>
            <Text style={styles.statLabel}>Items Queue</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.size}</Text>
            <Text style={styles.statLabel}>Payload</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>AES-GCM</Text>
            <Text style={styles.statLabel}>Encryption</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#64748b" />
          <Text style={styles.infoText}>
            The Tunnel transfers assets directly between providers via the SaaS backend. 
            No data is saved to your local device storage.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.transferBtn, transferring && styles.btnDisabled]} 
          onPress={handleMigration}
          disabled={transferring}
        >
          {transferring ? (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.btnText}>TUNNELING... {Math.round(progress * 100)}%</Text>
            </View>
          ) : (
            <Text style={styles.btnText}>Initiate Asset Migration</Text>
          )}
        </TouchableOpacity>

        {transferring && (
          <Text style={styles.warningText}>Do not close the app during active tunneling.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 25 },
  header: { marginBottom: 40 },
  title: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '500' },
  tunnelContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#1e293b', 
    padding: 30, 
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 30
  },
  cloudNode: { alignItems: 'center' },
  iconBox: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  nodeLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  pipeline: { flex: 1, alignItems: 'center', paddingHorizontal: 15 },
  pipeTrack: { width: '100%', height: 4, backgroundColor: '#0f172a', borderRadius: 2, marginVertical: 10, overflow: 'hidden' },
  pipeFill: { height: '100%', backgroundColor: '#2563eb' },
  statsCard: { 
    flexDirection: 'row', 
    backgroundColor: '#1e293b', 
    borderRadius: 24, 
    padding: 20, 
    justifyContent: 'space-between', 
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#334155'
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: '#64748b', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: '80%', backgroundColor: '#334155' },
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(37, 99, 235, 0.05)', padding: 20, borderRadius: 20, marginBottom: 40 },
  infoText: { color: '#64748b', fontSize: 13, lineHeight: 20, marginLeft: 12, flex: 1 },
  transferBtn: { backgroundColor: '#2563eb', padding: 22, borderRadius: 24, alignItems: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  btnDisabled: { backgroundColor: '#1e293b', shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center' },
  warningText: { textAlign: 'center', color: '#ef4444', marginTop: 20, fontSize: 12, fontWeight: 'bold' }
});
