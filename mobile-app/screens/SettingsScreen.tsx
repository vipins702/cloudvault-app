import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';
import { BACKEND_URL } from '../utils/constants';

export default function SettingsScreen({ onLogout }: any) {
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // AI Duplicates State
  const [scanning, setScanning] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

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
      const data = await res.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setDuplicates(data);
        setShowDuplicatesModal(true);
      } else {
        Alert.alert('Scan Complete', 'Your vault is optimized. No duplicates found.');
      }
    } catch (e) {
      Alert.alert('Scan Failed', 'AI service is currently busy.');
    } finally {
      setScanning(false);
    }
  };

  const toggleDuplicateSelection = (id: string) => {
    const next = new Set(selectedToDelete);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedToDelete(next);
  };

  const deleteSelectedDuplicates = async () => {
    if (selectedToDelete.size === 0) return;
    
    Alert.alert('Clean Up', `Delete ${selectedToDelete.size} duplicate files permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setIsDeleting(true);
        try {
          const token = await Storage.getItem('authToken');
          const res = await fetch(`${BACKEND_URL}/api/files/delete`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileIds: Array.from(selectedToDelete) })
          });
          
          if (!res.ok) throw new Error('Failed to delete files');
          
          Alert.alert('Success', `Cleaned up ${selectedToDelete.size} duplicate files.`);
          setShowDuplicatesModal(false);
          setSelectedToDelete(new Set());
          setDuplicates([]);
        } catch (e: any) {
          Alert.alert('Error', e.message);
        } finally {
          setIsDeleting(false);
        }
      }}
    ]);
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
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#064e3b' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#34d399" />
              </View>
              <View>
                <Text style={styles.actionTitle}>Vault Encryption</Text>
                <Text style={styles.actionSubtitle}>AES-256 GCM Security</Text>
              </View>
            </View>
            <Text style={styles.statusText}>Active</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="notifications" size={22} color="#94a3b8" />
              <Text style={styles.toggleText}>Push Notifications</Text>
            </View>
            <Switch 
              value={notifications} 
              onValueChange={setNotifications} 
              trackColor={{ false: '#1e293b', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="cloud-offline" size={22} color="#94a3b8" />
              <Text style={styles.toggleText}>Auto-Sync on Launch</Text>
            </View>
            <Switch 
              value={autoSync} 
              onValueChange={setAutoSync} 
              trackColor={{ false: '#1e293b', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Sign Out Securely</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.version}>CloudVault SaaS v2.1.0 (Production)</Text>
      </ScrollView>

      {/* DUPLICATE RESOLVER MODAL */}
      <Modal visible={showDuplicatesModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDuplicatesModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>AI Duplicates</Text>
            <TouchableOpacity 
              onPress={deleteSelectedDuplicates} 
              disabled={selectedToDelete.size === 0 || isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#ef4444" size="small" />
              ) : (
                <Text style={[styles.modalActionText, selectedToDelete.size === 0 && { color: '#475569' }]}>
                  Delete ({selectedToDelete.size})
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalSubHeader}>
            <Ionicons name="information-circle" size={16} color="#3b82f6" />
            <Text style={styles.modalSubText}>
              Found {duplicates.length} duplicate files with exact byte matches. Select the copies you want to permanently delete.
            </Text>
          </View>

          <FlatList
            data={duplicates}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.duplicateList}
            renderItem={({ item }) => {
              const isSelected = selectedToDelete.has(item.id);
              return (
                <TouchableOpacity 
                  style={[styles.duplicateCard, isSelected && styles.duplicateCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => toggleDuplicateSelection(item.id)}
                >
                  <Image source={{ uri: item.storage_url }} style={styles.duplicateImg} />
                  <View style={styles.duplicateInfo}>
                    <Text style={styles.duplicateName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.duplicateSize}>{(item.size_bytes / 1024 / 1024).toFixed(2)} MB</Text>
                  </View>
                  <View style={styles.checkbox}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>
              )
            }}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 25, paddingTop: 10 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  
  profileCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', 
    marginHorizontal: 20, padding: 20, borderRadius: 24, marginBottom: 30,
    borderWidth: 1, borderColor: '#334155'
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  profileInfo: { marginLeft: 16, flex: 1 },
  userName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userEmail: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  proTag: { backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  proTagText: { color: '#60a5fa', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  section: { marginBottom: 30, paddingHorizontal: 20 },
  sectionTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  
  actionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e293b', padding: 16, borderRadius: 20, marginBottom: 12 },
  actionLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actionSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  statusText: { color: '#34d399', fontSize: 12, fontWeight: 'bold' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { color: '#e2e8f0', fontSize: 16, marginLeft: 16, fontWeight: '500' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 18, borderRadius: 20, marginTop: 10 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  version: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 20, marginBottom: 40 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalCloseBtn: { padding: 4 },
  modalCloseText: { color: '#94a3b8', fontSize: 16 },
  modalActionText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
  modalSubHeader: { flexDirection: 'row', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 16, margin: 20, borderRadius: 12, alignItems: 'center' },
  modalSubText: { color: '#3b82f6', fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 },
  
  duplicateList: { paddingHorizontal: 20, paddingBottom: 40 },
  duplicateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  duplicateCardSelected: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  duplicateImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#0f172a' },
  duplicateInfo: { flex: 1, marginLeft: 12 },
  duplicateName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  duplicateSize: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#475569', justifyContent: 'center', alignItems: 'center' },
});
