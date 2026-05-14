import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';
import { BACKEND_URL } from '../utils/constants';

export default function SettingsScreen({ onLogout }: any) {
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userStr = await Storage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive',
        onPress: async () => {
          await Storage.removeItem('authToken');
          await Storage.removeItem('user');
          if (onLogout) onLogout();
        }
      }
    ]);
  };

  const runDuplicateScan = async () => {
    setScanning(true);
    try {
      const token = await Storage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/ai/duplicates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const duplicates = await res.json();
      
      if (duplicates.length > 0) {
        Alert.alert('Scan Complete', `AI found ${duplicates.length} duplicate assets. Would you like to review them?`, [
          { text: 'Later' },
          { text: 'Review', onPress: () => {} }
        ]);
      } else {
        Alert.alert('Scan Complete', 'Your vault is optimized. No duplicates found.');
      }
    } catch (e) {
      Alert.alert('Scan Failed', 'AI service is currently busy.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account Settings</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.substring(0, 2).toUpperCase() || 'CV'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || 'Cloud User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@cloudvault.com'}</Text>
          </View>
          <View style={styles.proTag}><Text style={styles.proTagText}>PRO</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI & Security</Text>
          <TouchableOpacity style={styles.actionCard} onPress={runDuplicateScan} disabled={scanning}>
            <View style={styles.actionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#1e3a8a' }]}>
                {scanning ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="sparkles" size={20} color="#60a5fa" />}
              </View>
              <View>
                <Text style={styles.actionTitle}>Duplicate Asset Scan</Text>
                <Text style={styles.actionSubtitle}>Find and merge identical photos</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#4b5563" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <SettingsToggle icon="notifications" title="Real-time Alerts" value={notifications} onValueChange={setNotifications} />
          <SettingsToggle icon="sync" title="Background Upload" value={autoSync} onValueChange={setAutoSync} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Sign Out of Vault</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>CloudVault v2.5.1 Enterprise</Text>
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsToggle({ icon, title, value, onValueChange }: any) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <View style={styles.iconCircle}><Ionicons name={icon} size={18} color="#2563eb" /></View>
        <Text style={styles.toggleText}>{title}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#334155', true: '#2563eb' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 25, paddingTop: 40 },
  headerTitle: { color: '#fff', fontSize: 32, fontWeight: '800' },
  profileCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1e293b', 
    marginHorizontal: 20, 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#334155'
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  profileInfo: { marginLeft: 15, flex: 1 },
  userName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userEmail: { color: '#64748b', fontSize: 13, marginTop: 2 },
  proTag: { backgroundColor: '#facc15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  proTagText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  section: { paddingHorizontal: 25, marginBottom: 35 },
  sectionTitle: { color: '#475569', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
  actionCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#1e293b', 
    padding: 16, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actionSubtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { color: '#fff', fontSize: 16, marginLeft: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 15, justifyContent: 'center' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  version: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 10 },
});
