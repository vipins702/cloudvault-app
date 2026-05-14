import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { DbService } from '../utils/db';
import { Storage } from '../utils/storage';
import { BACKEND_URL } from '../utils/constants';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GAP = 2;
const ITEM_SIZE = (width - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

export default function HomeScreen() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Bulk Selection State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Upload State
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [targetProvider, setTargetProvider] = useState('vercel-blob');
  const [providers, setProviders] = useState<string[]>([]);
  
  // Gallery Filters
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string | null>(null);

  useEffect(() => {
    loadGallery();
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const token = await Storage.getItem('authToken');
      const connRes = await fetch(`${BACKEND_URL}/api/connections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const conns = await connRes.json();
      if (Array.isArray(conns)) {
        setProviders(conns.map(c => c.provider));
      }
    } catch (e) {
      console.error('Failed to load providers', e);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
      setUploadModalVisible(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedImageUri) return;
    setIsUploading(true);

    try {
      const token = await Storage.getItem('authToken');
      
      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(selectedImageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileName = selectedImageUri.split('/').pop() || `upload_${Date.now()}.jpg`;

      const res = await fetch(`${BACKEND_URL}/api/files/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName,
          contentType: 'image/jpeg',
          base64Data,
          targetProviderId: targetProvider,
          folder: currentPath || ''
        })
      });

      if (!res.ok) throw new Error('Upload failed');
      
      Alert.alert('Success', 'File uploaded securely to ' + targetProvider);
      setUploadModalVisible(false);
      setSelectedImageUri(null);
      await loadGallery();
    } catch (e: any) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const loadGallery = async () => {
    setLoading(true);
    setSelectionMode(false);
    setSelectedFileIds(new Set());
    try {
      const data = await DbService.fetchUnifiedGallery();
      setPhotos(data);
    } catch (e) {
      console.error('Gallery Load Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedFileIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFileIds(next);
    if (next.size === 0) setSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedFileIds.size === 0) return;
    Alert.alert('Delete Assets', `Are you sure you want to delete ${selectedFileIds.size} files across your clouds? This cannot be undone.`, [
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
              body: JSON.stringify({ fileIds: Array.from(selectedFileIds) })
            });
            if (!res.ok) throw new Error('Deletion failed');
            await loadGallery(); // refresh
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setIsDeleting(false);
          }
      }}
    ]);
  };

  const { visibleFiles, visibleFolders } = useMemo(() => {
    const folders = new Set<string>();
    const files: any[] = [];
    
    // 1. Filter by provider
    const providerFiltered = selectedProviderFilter 
      ? photos.filter(p => p.provider === selectedProviderFilter)
      : photos;

    // 2. Filter by current path
    providerFiltered.forEach(p => {
      const path = p.path || '';
      if (currentPath) {
        const prefix = currentPath + '/';
        if (path.startsWith(prefix)) {
          const rel = path.slice(prefix.length);
          const pts = rel.split('/');
          if (pts.length > 1) folders.add(pts[0]);
          else files.push(p);
        }
      } else {
        const pts = path.split('/');
        if (pts.length > 1) folders.add(pts[0]);
        else files.push(p);
      }
    });
    return { visibleFiles: files, visibleFolders: Array.from(folders).sort() };
  }, [photos, currentPath, selectedProviderFilter]);

  const getProviderBadge = (provider: string) => {
    const map: Record<string, { color: string; letter: string }> = {
      'google-photos': { color: '#4285F4', letter: 'G' },
      'vercel-blob': { color: '#000', letter: 'V' },
      'aws-s3': { color: '#FF9900', letter: 'S' },
      'icloud': { color: '#999', letter: 'i' },
    };
    return map[provider] || { color: '#3b82f6', letter: '?' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const isFolder = typeof item === 'string';
    const isSelected = !isFolder && selectedFileIds.has(item.id);

    return (
      <TouchableOpacity 
        style={[styles.item, isSelected && styles.itemSelected]}
        activeOpacity={0.85}
        onLongPress={() => {
          if (!isFolder) {
            setSelectionMode(true);
            toggleSelection(item.id);
          }
        }}
        onPress={() => {
          if (selectionMode && !isFolder) {
            toggleSelection(item.id);
          } else if (isFolder) {
            setCurrentPath(currentPath ? `${currentPath}/${item}` : item);
          } else {
            setSelectedPhoto(item);
          }
        }}
      >
        {isFolder ? (
          <View style={styles.folderContent}>
            <View style={styles.folderIcon}>
              <Ionicons name="folder" size={28} color="#3b82f6" />
            </View>
            <Text style={styles.folderName} numberOfLines={1}>{item}</Text>
          </View>
        ) : (
          <View style={styles.photoContent}>
            <Image source={{ uri: item.url }} style={[styles.image, isSelected && { opacity: 0.6 }]} />
            <View style={styles.imageOverlay} />
            {item.provider && (
              <View style={[styles.badge, { backgroundColor: getProviderBadge(item.provider).color }]}>
                <Text style={styles.badgeText}>{getProviderBadge(item.provider).letter}</Text>
              </View>
            )}
            {selectionMode && (
              <View style={styles.checkboxOverlay}>
                <Ionicons 
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={isSelected ? "#3b82f6" : "rgba(255,255,255,0.5)"} 
                />
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, selectionMode && styles.headerSelectionMode]}>
        {selectionMode ? (
          <>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedFileIds(new Set()); }} style={styles.backBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{selectedFileIds.size} Selected</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleBulkDelete} disabled={isDeleting} style={styles.actionBtn}>
                {isDeleting ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <Ionicons name="trash" size={22} color="#ef4444" />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.headerLeft}>
              {currentPath ? (
                <TouchableOpacity onPress={() => setCurrentPath('')} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={20} color="#3b82f6" />
                </TouchableOpacity>
              ) : null}
              <View>
                <Text style={styles.headerTitle}>
                  {currentPath ? currentPath.split('/').pop() : 'Gallery'}
                </Text>
                <Text style={styles.subtitle}>
                  {currentPath 
                    ? `${visibleFiles.length} files • ${visibleFolders.length} folders`
                    : `${photos.length} assets across all clouds`
                  }
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                <Ionicons name={viewMode === 'grid' ? 'grid' : 'list'} size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity onPress={loadGallery} style={styles.actionBtn}>
                <Ionicons name="refresh" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Provider Filters */}
      {!loading && !selectionMode && providers.length > 0 && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity 
              style={[styles.filterChip, selectedProviderFilter === null && styles.filterChipActive]}
              onPress={() => setSelectedProviderFilter(null)}
            >
              <Text style={[styles.filterChipText, selectedProviderFilter === null && styles.filterChipTextActive]}>All Assets</Text>
            </TouchableOpacity>
            {providers.map(p => (
              <TouchableOpacity 
                key={p}
                style={[styles.filterChip, selectedProviderFilter === p && styles.filterChipActive]}
                onPress={() => setSelectedProviderFilter(p)}
              >
                <Ionicons 
                  name={p === 'aws-s3' ? 'logo-amazon' : p === 'google-photos' ? 'logo-google' : p === 'google-drive' ? 'logo-google' : p === 'dropbox' ? 'logo-dropbox' : 'triangle'} 
                  size={14} 
                  color={selectedProviderFilter === p ? '#fff' : '#64748b'} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.filterChipText, selectedProviderFilter === p && styles.filterChipTextActive]}>
                  {p === 'aws-s3' ? 'AWS S3' : p === 'google-photos' ? 'Photos' : p === 'google-drive' ? 'Drive' : p === 'dropbox' ? 'Dropbox' : 'Vercel'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Syncing vault assets...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={[...visibleFolders, ...visibleFiles]}
          renderItem={renderItem}
          numColumns={COLUMN_COUNT}
          keyExtractor={(item, i) => typeof item === 'string' ? `f-${item}-${i}` : item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cloud-offline-outline" size={48} color="#334155" />
              </View>
              <Text style={styles.emptyTitle}>No Assets Found</Text>
              <Text style={styles.emptyText}>Connect a cloud provider to start viewing your photos here.</Text>
            </View>
          }
        />
      )}

      {/* Full-screen Photo Viewer */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <View style={styles.viewer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPhoto(null)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.viewerActions}>
              <TouchableOpacity style={styles.viewerAction}>
                <Ionicons name="share-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewerAction}>
                <Ionicons name="download-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Image source={{ uri: selectedPhoto?.url }} style={styles.fullImage} resizeMode="contain" />

          <View style={styles.viewerFooter}>
            <View style={styles.footerInfo}>
              <Text style={styles.fileName} numberOfLines={1}>{selectedPhoto?.name}</Text>
              <View style={styles.metaRow}>
                {selectedPhoto?.provider && (
                  <View style={styles.metaBadge}>
                    <Ionicons name="cloud" size={10} color="#3b82f6" />
                    <Text style={styles.metaText}>{selectedPhoto?.provider}</Text>
                  </View>
                )}
                {selectedPhoto?.size && (
                  <View style={styles.metaBadge}>
                    <Ionicons name="document" size={10} color="#64748b" />
                    <Text style={styles.metaText}>{(selectedPhoto?.size / 1024).toFixed(1)} KB</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload FAB */}
      {!selectionMode && (
        <TouchableOpacity style={styles.fab} onPress={pickImage}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Upload Settings Modal */}
      <Modal visible={uploadModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.uploadModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Asset</Text>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedImageUri && (
              <Image source={{ uri: selectedImageUri }} style={styles.uploadPreview} />
            )}

            <Text style={styles.modalLabel}>Select Target Cloud</Text>
            <View style={styles.providerSelect}>
              {providers.length === 0 ? (
                <Text style={styles.emptyText}>No clouds connected. Link one in Settings.</Text>
              ) : (
                providers.map(p => (
                  <TouchableOpacity 
                    key={p}
                    style={[styles.providerBtn, targetProvider === p && styles.providerBtnActive]}
                    onPress={() => setTargetProvider(p)}
                  >
                    <Ionicons 
                      name={p === 'aws-s3' ? 'logo-amazon' : p === 'google-photos' ? 'logo-google' : 'triangle'} 
                      size={20} 
                      color={targetProvider === p ? '#fff' : '#64748b'} 
                    />
                    <Text style={[styles.providerText, targetProvider === p && styles.providerTextActive]}>
                      {p === 'aws-s3' ? 'AWS S3' : p === 'google-photos' ? 'Google Photos' : 'Vercel Blob'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <TouchableOpacity 
              style={[styles.uploadBtn, (isUploading || providers.length === 0) && styles.btnDisabled]} 
              onPress={handleUpload}
              disabled={isUploading || providers.length === 0}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadBtnText}>Upload Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  headerSelectionMode: {
    backgroundColor: '#3b82f6',
    borderBottomColor: '#2563eb'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { 
    width: 36, height: 36, borderRadius: 12, 
    backgroundColor: 'rgba(59,130,246,0.1)', 
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 12 
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: '#475569', fontSize: 12, marginTop: 2, fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { 
    width: 38, height: 38, borderRadius: 12, 
    backgroundColor: '#1e293b', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155'
  },
  filterBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb'
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: '#fff'
  },
  list: { padding: GAP / 2 },
  item: { 
    width: ITEM_SIZE, height: ITEM_SIZE, 
    margin: GAP / 2, 
    borderRadius: 8, 
    overflow: 'hidden', 
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  itemSelected: {
    borderColor: '#3b82f6',
    transform: [{ scale: 0.95 }]
  },
  folderContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  folderIcon: { 
    width: 52, height: 52, borderRadius: 16, 
    backgroundColor: 'rgba(59,130,246,0.1)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  folderName: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 6 },
  photoContent: { flex: 1, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, 
    backgroundColor: 'transparent'
  },
  checkboxOverlay: {
    position: 'absolute', top: 6, left: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  badge: { 
    position: 'absolute', bottom: 6, right: 6, 
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingBox: { alignItems: 'center' },
  loadingText: { color: '#475569', marginTop: 16, fontWeight: '600', fontSize: 14 },
  empty: { marginTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { 
    width: 80, height: 80, borderRadius: 24, 
    backgroundColor: '#1e293b', 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 20 
  },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyText: { color: '#475569', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  // Full-screen viewer
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerHeader: { 
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingHorizontal: 16, paddingBottom: 12
  },
  closeBtn: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', alignItems: 'center',
    backdropFilter: 'blur(10px)' as any
  },
  viewerActions: { flexDirection: 'row', gap: 8 },
  viewerAction: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  fullImage: { width: '100%', height: '100%' },
  viewerFooter: { 
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  footerInfo: {},
  fileName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  metaRow: { flexDirection: 'row', marginTop: 8, gap: 10 },
  metaBadge: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 
  },
  metaText: { color: '#94a3b8', fontSize: 11, marginLeft: 4, fontWeight: '600' },
  // FAB & Upload Modal
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  uploadModal: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  uploadPreview: {
    width: '100%', height: 180, borderRadius: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#334155'
  },
  modalLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  providerSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  providerBtn: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#0f172a', 
    paddingHorizontal: 16, paddingVertical: 12, 
    borderRadius: 12, borderWidth: 1, borderColor: '#334155' 
  },
  providerBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
  providerText: { color: '#64748b', fontWeight: 'bold', marginLeft: 8 },
  providerTextActive: { color: '#fff' },
  uploadBtn: { 
    backgroundColor: '#3b82f6', padding: 16, borderRadius: 16, alignItems: 'center' 
  },
  btnDisabled: { backgroundColor: '#334155', opacity: 0.7 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
