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
  Image,
  TextInput
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

  // Admin CMS State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [activeProvider, setActiveProvider] = useState('openai');
  const [llmConfig, setLlmConfig] = useState<any>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userStr = await Storage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
  };

  const fetchAdminSettings = async () => {
    try {
      const token = await Storage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.active_llm_provider) {
        setActiveProvider(data.active_llm_provider);
        setLlmConfig(data.llm_config || {});
        setShowAdminModal(true);
      } else {
        Alert.alert('Error', 'Failed to load admin settings');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const saveAdminSettings = async () => {
    setIsSavingSettings(true);
    try {
      const token = await Storage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/admin/settings`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          active_llm_provider: activeProvider,
          llm_config: llmConfig
        })
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      
      Alert.alert('Success', 'AI Model Configuration updated!');
      setShowAdminModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSavingSettings(false);
    }
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

        {user?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin CMS</Text>
            <TouchableOpacity style={styles.actionCard} onPress={fetchAdminSettings}>
              <View style={styles.actionLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#b91c1c' }]}>
                  <Ionicons name="construct" size={20} color="#fca5a5" />
                </View>
                <View>
                  <Text style={styles.actionTitle}>AI Model Configuration</Text>
                  <Text style={styles.actionSubtitle}>Switch providers and keys</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
        )}

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
              <Ionicons name="cellular-outline" size={22} color="#94a3b8" />
              <Text style={styles.toggleText}>Cellular Uploads</Text>
            </View>
            <Switch 
              value={true} 
              onValueChange={() => {}} 
              trackColor={{ false: '#1e293b', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="finger-print-outline" size={22} color="#94a3b8" />
              <Text style={styles.toggleText}>Biometric App Lock</Text>
            </View>
            <Switch 
              value={false} 
              onValueChange={() => {}} 
              trackColor={{ false: '#1e293b', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="image-outline" size={22} color="#94a3b8" />
              <Text style={styles.toggleText}>High Quality Preview</Text>
            </View>
            <Switch 
              value={true} 
              onValueChange={() => {}} 
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
                    <Text style={styles.duplicateName} numberOfLines={1}>{item?.name}</Text>
                    <Text style={styles.duplicateSize}>{(item?.size_bytes ? item.size_bytes / 1024 / 1024 : 0).toFixed(2)} MB</Text>
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

      {/* ADMIN CMS MODAL */}
      <Modal visible={showAdminModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdminModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Model Config</Text>
            <TouchableOpacity onPress={saveAdminSettings} disabled={isSavingSettings}>
              {isSavingSettings ? (
                <ActivityIndicator color="#3b82f6" size="small" />
              ) : (
                <Text style={[styles.modalActionText, { color: '#3b82f6' }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalSubTitle}>Active Provider</Text>
            
            {['openai', 'gemini', 'groq'].map(prov => (
              <TouchableOpacity 
                key={prov}
                style={[styles.providerOption, activeProvider === prov && styles.providerOptionSelected]}
                onPress={() => setActiveProvider(prov)}
              >
                <View style={styles.radio}>
                  {activeProvider === prov && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.providerLabel}>{prov.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.modalSubTitle, { marginTop: 20 }]}>API Credentials</Text>
            
            <Text style={styles.inputLabel}>OpenAI API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="sk-..."
              placeholderTextColor="#475569"
              value={llmConfig.openai_api_key || ''}
              onChangeText={text => setLlmConfig({...llmConfig, openai_api_key: text})}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Gemini API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="AIzaSy..."
              placeholderTextColor="#475569"
              value={llmConfig.gemini_api_key || ''}
              onChangeText={text => setLlmConfig({...llmConfig, gemini_api_key: text})}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Groq API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="gsk_..."
              placeholderTextColor="#475569"
              value={llmConfig.groq_api_key || ''}
              onChangeText={text => setLlmConfig({...llmConfig, groq_api_key: text})}
              secureTextEntry
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b13' },
  header: { padding: 25, paddingTop: 10 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  
  profileCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', 
    marginHorizontal: 20, padding: 20, borderRadius: 24, marginBottom: 30,
    borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#c084fc', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  profileInfo: { marginLeft: 16, flex: 1 },
  userName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userEmail: { color: '#64748b', fontSize: 13, marginTop: 4 },
  proTag: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  proTagText: { color: '#fbbf24', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  section: { marginBottom: 30, paddingHorizontal: 20 },
  sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.5 },
  
  actionCard: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: '#0f172a', padding: 16, borderRadius: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#1e293b'
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actionSubtitle: { color: '#64748b', fontSize: 12, marginTop: 4 },
  statusText: { color: '#10b981', fontSize: 12, fontWeight: 'bold' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { color: '#e2e8f0', fontSize: 16, marginLeft: 16, fontWeight: '500' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 18, borderRadius: 20, marginTop: 10 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  version: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 20, marginBottom: 40 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#060b13' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalCloseBtn: { padding: 4 },
  modalCloseText: { color: '#64748b', fontSize: 16 },
  modalActionText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
  modalSubHeader: { flexDirection: 'row', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 16, margin: 20, borderRadius: 12, alignItems: 'center' },
  modalSubText: { color: '#60a5fa', fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 },
  
  duplicateList: { paddingHorizontal: 20, paddingBottom: 40 },
  duplicateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  duplicateCardSelected: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  duplicateImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#060b13' },
  duplicateInfo: { flex: 1, marginLeft: 12 },
  duplicateName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  duplicateSize: { color: '#64748b', fontSize: 12, marginTop: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  
  // Admin CMS Styles
  modalSubTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  providerOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  providerOptionSelected: { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#334155', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' },
  providerLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  inputLabel: { color: '#64748b', fontSize: 12, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' },
});
