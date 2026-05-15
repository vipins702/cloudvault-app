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
  Alert,
  ScrollView,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
  const [isTagging, setIsTagging] = useState(false);

  // Upload State
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{uri: string, name: string, mimeType?: string, isImage: boolean} | null>(null);
  const [targetProvider, setTargetProvider] = useState('vercel-blob');
  const [providers, setProviders] = useState<string[]>([]);
  
  // FAB & Folder State
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [emptyFolders, setEmptyFolders] = useState<string[]>([]);
  
  // Gallery Filters & Sort
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'largest' | 'smallest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // View State
  const [viewTab, setViewTab] = useState<'photos' | 'albums'>('photos');
  const [smartAlbums, setSmartAlbums] = useState<any[]>([]);
  
  // AI Tools
  const [isDuplicatesVisible, setIsDuplicatesVisible] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  
  // Transfer State
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [transferTargetProvider, setTransferTargetProvider] = useState('vercel-blob');
  const [isTransferring, setIsTransferring] = useState(false);

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
        setProviders(Array.from(new Set(conns.map(c => c.provider))));
      }
    } catch (e) {
      console.error('Failed to load providers', e);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your gallery to upload photos.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.${asset.mimeType?.split('/')[1] || 'jpg'}`,
          mimeType: asset.mimeType || 'image/jpeg',
          isImage: true
        });
        setUploadModalVisible(true);
      }
    } catch (e: any) {
      console.error('ImagePicker Error:', e);
      Alert.alert('Error', 'Could not open image library: ' + e.message);
    }
  };

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isImage = asset.mimeType?.startsWith('image/') || false;
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
          isImage
        });
        setUploadModalVisible(true);
      }
    } catch (e) {
      console.log('Document picker error:', e);
    }
  };

  const handleAITagging = async () => {
    if (selectedFileIds.size === 0) return;
    setIsTagging(true);
    try {
      const ids = Array.from(selectedFileIds);
      let successCount = 0;
      const token = await Storage.getItem('authToken');
      for (const id of ids) {
        const response = await fetch(`${BACKEND_URL}/api/ai/tag/${id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        if (response.ok) successCount++;
      }
      if (successCount > 0) {
        Alert.alert('AI Tagging', `Successfully analyzed and tagged ${successCount} files!`);
        await loadGallery();
      } else {
        Alert.alert('Error', 'Failed to tag files.');
      }
    } catch (err) {
      console.error('AI Tagging failed:', err);
      Alert.alert('Error', 'An error occurred during AI tagging.');
    } finally {
      setIsTagging(false);
      setSelectionMode(false);
      setSelectedFileIds(new Set());
    }
  };

  const handleScanDuplicates = async () => {
    setIsScanning(true);
    setIsDuplicatesVisible(true);
    try {
      const token = await Storage.getItem('authToken');
      const response = await fetch(`${BACKEND_URL}/api/ai/duplicates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const groups = await response.json();
      setDuplicateGroups(groups);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const fetchSmartAlbums = async () => {
    try {
      const token = await Storage.getItem('authToken');
      const response = await fetch(`${BACKEND_URL}/api/ai/smart-albums`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSmartAlbums(data);
    } catch (err) {
      console.error('Failed to fetch albums:', err);
    }
  };

  useEffect(() => {
    if (viewTab === 'albums') fetchSmartAlbums();
  }, [viewTab]);

  const handleBulkTransfer = async () => {
    if (selectedFileIds.size === 0) return;
    setIsTransferring(true);
    try {
      const token = await Storage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/files/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileIds: Array.from(selectedFileIds),
          targetProviderId: transferTargetProvider
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Transfer failed');
      }
      
      Alert.alert('Transfer Success', `Directly moved ${selectedFileIds.size} assets to ${transferTargetProvider}.`);
      setIsTransferModalVisible(false);
      setSelectionMode(false);
      setSelectedFileIds(new Set());
      await loadGallery();
    } catch (e: any) {
      Alert.alert('Transfer Error', e.message);
    } finally {
      setIsTransferring(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const token = await Storage.getItem('authToken');
      // For now, we hit the general gallery load to refresh, but ideally we'd hit a /folders/create API
      // Google Photos uses Albums, so this would map to an album creation.
      const res = await fetch(`${BACKEND_URL}/api/folders/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newFolderName, provider: 'google-photos' }) // Default to google-photos for now
      });

      if (res.ok) {
        Alert.alert('Success', `Album "${newFolderName}" created on cloud.`);
      } else {
        // Fallback to local state if backend API isn't fully ready yet
        const folderPath = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim();
        setEmptyFolders([...emptyFolders, folderPath]);
      }
    } catch (e) {
      const folderPath = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim();
      setEmptyFolders([...emptyFolders, folderPath]);
    }
    
    setFolderModalVisible(false);
    setNewFolderName('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    try {
      const token = await Storage.getItem('authToken');
      let base64Data;
      if (Platform.OS === 'web') {
        const fetchRes = await fetch(selectedFile.uri);
        const blob = await fetchRes.blob();
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result?.toString().split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, {
          encoding: 'base64',
        });
      }

      const res = await fetch(`${BACKEND_URL}/api/files/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.mimeType,
          base64Data,
          targetProviderId: targetProvider,
          folder: currentPath || ''
        })
      });

      if (!res.ok) throw new Error('Upload failed');
      
      Alert.alert('Success', 'Asset uploaded securely to ' + targetProvider);
      setUploadModalVisible(false);
      setSelectedFile(null);
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
    
    // 1. Filter by provider and Search
    let providerFiltered = selectedProviderFilter 
      ? photos.filter(p => p.provider === selectedProviderFilter)
      : [...photos];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      providerFiltered = providerFiltered.filter(p => {
        const nameMatch = p.name && p.name.toLowerCase().includes(q);
        const tagMatch = p.tags && Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase().includes(q));
        return nameMatch || tagMatch;
      });
    }

    // 2. Sort the files
    providerFiltered.sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortOrder === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortOrder === 'largest') return (b.size || 0) - (a.size || 0);
      if (sortOrder === 'smallest') return (a.size || 0) - (b.size || 0);
      return 0;
    });

    // 3. Filter by current path
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
    
    emptyFolders.forEach(path => {
      if (currentPath) {
        const prefix = currentPath + '/';
        if (path.startsWith(prefix)) {
          const rel = path.slice(prefix.length);
          const pts = rel.split('/');
          if (pts.length === 1 && pts[0]) folders.add(pts[0]);
        }
      } else {
        const pts = path.split('/');
        if (pts.length === 1 && pts[0]) folders.add(pts[0]);
      }
    });
    
    return { visibleFiles: files, visibleFolders: Array.from(folders).sort() };
  }, [photos, currentPath, selectedProviderFilter, sortOrder, emptyFolders, searchQuery]);

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

    const isList = viewMode === 'list';
    
    return (
      <TouchableOpacity 
        style={[styles.item, isList && styles.itemList, isSelected && styles.itemSelected]}
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
          <View style={[styles.photoContent, isList && styles.photoContentList]}>
            {item.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) || item.contentType?.startsWith('image/') ? (
              <Image 
                source={{ uri: item.url }} 
                style={[styles.image, isList && styles.imageList, isSelected && { opacity: 0.6 }]} 
              />
            ) : (
              <View style={[styles.image, isList && styles.imageList, styles.docPlaceholder, isSelected && { opacity: 0.6 }]}>
                <Ionicons name={item.name?.toLowerCase().endsWith('.pdf') ? 'document-text' : 'document'} size={isList ? 32 : 48} color="#94a3b8" />
              </View>
            )}
            {!isList && <View style={styles.imageOverlay} />}
            {item.provider && !isList && (
              <View style={[styles.badge, { backgroundColor: getProviderBadge(item.provider).color }]}>
                <Text style={styles.badgeText}>{getProviderBadge(item.provider).letter}</Text>
              </View>
            )}
            {isList && (
              <View style={styles.listDetails}>
                <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.listDate}>
                  {new Date(item.date).toLocaleDateString()} • {item.size ? (item.size / 1024 / 1024).toFixed(2) + ' MB' : ''}
                </Text>
                <View style={[styles.listBadge, { backgroundColor: getProviderBadge(item.provider).color }]}>
                  <Ionicons name="cloud" size={10} color="#fff" />
                  <Text style={styles.listBadgeText}>{item.provider}</Text>
                </View>
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.tagContainer}>
                    {item.tags.slice(0, 3).map((t: string, i: number) => (
                      <View key={`tag-${i}`} style={styles.tagBadge}>
                        <Text style={styles.tagText}>#{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
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

  const handleNextPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = visibleFiles.findIndex((f: any) => f.id === selectedPhoto.id);
    if (currentIndex >= 0 && currentIndex < visibleFiles.length - 1) {
      setSelectedPhoto(visibleFiles[currentIndex + 1]);
    }
  };

  const handlePrevPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = visibleFiles.findIndex((f: any) => f.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(visibleFiles[currentIndex - 1]);
    }
  };

  const isFirstPhoto = selectedPhoto ? visibleFiles.findIndex((f: any) => f.id === selectedPhoto.id) === 0 : true;
  const isLastPhoto = selectedPhoto ? visibleFiles.findIndex((f: any) => f.id === selectedPhoto.id) === visibleFiles.length - 1 : true;

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
              <TouchableOpacity onPress={handleAITagging} disabled={isTagging} style={styles.actionBtn}>
                {isTagging ? (
                  <ActivityIndicator color="#a855f7" size="small" />
                ) : (
                  <Ionicons name="color-wand" size={22} color="#a855f7" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsTransferModalVisible(true)} style={styles.actionBtn}>
                <Ionicons name="swap-horizontal" size={22} color="#3b82f6" />
              </TouchableOpacity>
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
                {!currentPath ? (
                  <View style={styles.tabBar}>
                    <TouchableOpacity 
                      onPress={() => setViewTab('photos')}
                      style={[styles.tabItem, viewTab === 'photos' && styles.tabItemActive]}
                    >
                      <Text style={[styles.tabText, viewTab === 'photos' && styles.tabTextActive]}>Photos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setViewTab('albums')}
                      style={[styles.tabItem, viewTab === 'albums' && styles.tabItemActive]}
                    >
                      <Text style={[styles.tabText, viewTab === 'albums' && styles.tabTextActive]}>Smart Albums</Text>
                      {smartAlbums.length > 0 && <View style={styles.dot} />}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={styles.headerTitle}>{currentPath.split('/').pop()}</Text>
                    <Text style={styles.subtitle}>{visibleFiles.length} files • {visibleFolders.length} folders</Text>
                  </>
                )}
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => {
                  const orders: any = ['newest', 'oldest', 'largest', 'smallest'];
                  const next = orders[(orders.indexOf(sortOrder) + 1) % orders.length];
                  setSortOrder(next);
                }}
              >
                <Ionicons 
                  name={sortOrder === 'newest' ? 'calendar' : sortOrder === 'oldest' ? 'time' : sortOrder === 'largest' ? 'arrow-up' : 'arrow-down'} 
                  size={18} 
                  color="#94a3b8" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                <Ionicons name={viewMode === 'grid' ? 'grid' : 'list'} size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity onPress={loadGallery} style={styles.actionBtn}>
                <Ionicons name="refresh" size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setIsSearchActive(!isSearchActive)}>
                <Ionicons name="search" size={18} color={isSearchActive ? "#3b82f6" : "#94a3b8"} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Search Bar */}
      {isSearchActive && !selectionMode && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, tag (e.g. Beach, Document)..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

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
            <TouchableOpacity 
              onPress={handleScanDuplicates}
              style={[styles.filterChip, { backgroundColor: '#7c3aed' }]}
            >
              <Ionicons name="copy" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.filterChipText}>Duplicates</Text>
            </TouchableOpacity>
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
      ) : viewTab === 'albums' ? (
        <FlatList
          data={smartAlbums}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.albumList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.albumCard}
              onPress={() => {
                setSearchQuery(item.name);
                setIsSearchActive(true);
                setViewTab('photos');
              }}
            >
              <Image source={{ uri: item.cover_url }} style={styles.albumCover} />
              <View style={styles.albumInfo}>
                <Text style={styles.albumName}>{item.name}</Text>
                <Text style={styles.albumCount}>{item.count} items</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles-outline" size={40} color="#3b82f6" />
              </View>
              <Text style={styles.emptyTitle}>No Smart Albums</Text>
              <Text style={styles.emptyText}>Run AI Analysis on your gallery to auto-organize photos by tags like "Nature", "Beach", or "Documents".</Text>
              
              <TouchableOpacity 
                style={[styles.connectNowBtn, { marginTop: 30 }]}
                onPress={() => {
                  Alert.alert('AI Analysis', 'Start analyzing all photos in your gallery?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Analyze All', onPress: async () => {
                      setIsTagging(true);
                      try {
                        const token = await Storage.getItem('authToken');
                        for (const p of photos) {
                           if (p.tags && p.tags.length > 0) continue;
                           await fetch(`${BACKEND_URL}/api/ai/tag/${p.id}`, {
                             method: 'POST',
                             headers: { 'Authorization': `Bearer ${token}` }
                           });
                        }
                        await loadGallery();
                        await fetchSmartAlbums();
                        Alert.alert('Magic Complete', 'Your Smart Albums have been updated!');
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsTagging(false);
                      }
                    }}
                  ]);
                }}
              >
                {isTagging ? <ActivityIndicator color="#3b82f6" /> : <Text style={styles.connectNowText}>⚡ Run Magic Analysis</Text>}
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          key={viewMode}
          data={[...visibleFolders, ...visibleFiles]}
          renderItem={renderItem}
          numColumns={viewMode === 'list' ? 1 : COLUMN_COUNT}
          keyExtractor={(item, i) => typeof item === 'string' ? `f-${item}-${i}` : `${item.id}-${i}-${Math.random()}`}
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

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {/* Previous Button */}
            {!isFirstPhoto && (
              <TouchableOpacity style={styles.navBtnLeft} onPress={handlePrevPhoto}>
                <Ionicons name="chevron-back" size={32} color="#fff" />
              </TouchableOpacity>
            )}

            <Image 
              source={{ uri: selectedPhoto?.url }} 
              style={styles.fullImage} 
              resizeMode="contain"
            />

            {/* Next Button */}
            {!isLastPhoto && (
              <TouchableOpacity style={styles.navBtnRight} onPress={handleNextPhoto}>
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.viewerFooter}>
            <View style={styles.footerInfo}>
              <Text style={styles.fileName} numberOfLines={1}>{selectedPhoto?.name}</Text>
              
              {selectedPhoto?.tags && selectedPhoto.tags.length > 0 && (
                <View style={styles.tagContainer}>
                  {selectedPhoto.tags.map((t: string, i: number) => (
                    <View key={`tag-${i}`} style={styles.tagBadge}>
                      <Text style={styles.tagText}>#{t}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedPhoto?.metadata?.ocr_text && (
                <View style={[styles.ocrContainer, { marginTop: 12, marginBottom: 0 }]}>
                  <Text style={styles.ocrTitle}>
                    <Ionicons name="document-text" size={14} color="#60a5fa" /> EXTRACTED TEXT
                  </Text>
                  <Text style={styles.ocrText} numberOfLines={4}>{selectedPhoto.metadata.ocr_text}</Text>
                </View>
              )}

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
                    <Text style={styles.metaText}>{(selectedPhoto?.size / 1024 / 1024).toFixed(2)} MB</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB Overlay */}
      {fabMenuVisible && (
        <TouchableOpacity style={styles.fabOverlay} activeOpacity={1} onPress={() => setFabMenuVisible(false)}>
          <View style={styles.fabMenu}>
             <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setFabMenuVisible(false); setFolderModalVisible(true); }}>
               <View style={styles.fabMenuIcon}><Ionicons name="folder-open" size={20} color="#fff" /></View>
               <Text style={styles.fabMenuText}>New Folder</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setFabMenuVisible(false); pickDocument(); }}>
               <View style={styles.fabMenuIcon}><Ionicons name="document" size={20} color="#fff" /></View>
               <Text style={styles.fabMenuText}>Upload File</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setFabMenuVisible(false); pickImage(); }}>
               <View style={styles.fabMenuIcon}><Ionicons name="image" size={20} color="#fff" /></View>
               <Text style={styles.fabMenuText}>Upload Photo</Text>
             </TouchableOpacity>
             <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 8, width: '100%' }} />
             <TouchableOpacity style={[styles.fabMenuItem, { backgroundColor: '#7c3aed' }]} onPress={() => { setFabMenuVisible(false); handleScanDuplicates(); }}>
               <View style={[styles.fabMenuIcon, { backgroundColor: '#a78bfa' }]}><Ionicons name="sparkles" size={20} color="#fff" /></View>
               <Text style={styles.fabMenuText}>AI Duplicate Scan</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[styles.fabMenuItem, { backgroundColor: '#3b82f6' }]} onPress={() => { setFabMenuVisible(false); fetchSmartAlbums(); }}>
               <View style={[styles.fabMenuIcon, { backgroundColor: '#60a5fa' }]}><Ionicons name="albums" size={20} color="#fff" /></View>
               <Text style={styles.fabMenuText}>Smart AI Albums</Text>
             </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Main FAB */}
      {!selectionMode && (
        <TouchableOpacity style={styles.fab} onPress={() => setFabMenuVisible(!fabMenuVisible)}>
          <Ionicons name={fabMenuVisible ? "close" : "add"} size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Folder Modal */}
      <Modal visible={folderModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.folderModal}>
            <Text style={styles.modalTitle}>New Folder</Text>
            <Text style={styles.modalLabel}>Enter folder name</Text>
            <View style={styles.inputGroup}>
               <TextInput
                 style={styles.folderInput}
                 placeholder="e.g. Invoices 2024"
                 placeholderTextColor="#475569"
                 value={newFolderName}
                 onChangeText={setNewFolderName}
                 autoFocus
               />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setFolderModalVisible(false); setNewFolderName(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={createFolder}>
                <Text style={styles.modalSubmitText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

            {selectedFile && selectedFile.isImage ? (
              <Image 
                source={{ uri: selectedFile.uri }} 
                style={styles.uploadPreview} 
              />
            ) : selectedFile ? (
              <View style={[styles.uploadPreview, styles.docPlaceholder]}>
                <Ionicons name="document-text" size={64} color="#3b82f6" />
                <Text style={{color: '#fff', marginTop: 10}}>{selectedFile.name}</Text>
              </View>
            ) : null}

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
      {/* Duplicate Scanner Modal */}
      <Modal visible={isDuplicatesVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.dupModal}>
          <View style={styles.dupHeader}>
            <Text style={styles.dupTitle}>Possible Duplicates</Text>
            <TouchableOpacity onPress={() => setIsDuplicatesVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {isScanning ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={styles.loadingText}>Analyzing hash similarities...</Text>
            </View>
          ) : (
            <FlatList
              data={duplicateGroups}
              keyExtractor={(_, i) => `group-${i}`}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Ionicons name="shield-checkmark" size={64} color="#334155" />
                  <Text style={[styles.emptyTitle, { marginTop: 20 }]}>No Duplicates!</Text>
                  <Text style={styles.emptyText}>Your vault is perfectly organized.</Text>
                </View>
              }
              renderItem={({ item: group }) => (
                <View style={styles.dupGroup}>
                  <View style={styles.dupGroupHeader}>
                    <Text style={styles.dupGroupTitle}>{group.length} COPIES FOUND</Text>
                    <Text style={styles.dupGroupTitle}>{(group[0]?.size_bytes ? group[0].size_bytes / 1024 / 1024 : 0).toFixed(2)} MB EACH</Text>
                  </View>
                  {group.map((file: any) => (
                    <View key={file.id} style={styles.dupItem}>
                      <Image source={{ uri: file.storage_url }} style={styles.dupItemImg} />
                      <View style={styles.dupItemInfo}>
                        <Text style={styles.dupItemName} numberOfLines={1}>{file.name}</Text>
                        <Text style={styles.dupItemMeta}>{file.folder || 'Root'}</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => {
                          // Allow user to jump to this file or delete it
                          setSelectedPhoto({...file, url: file.storage_url, date: new Date().toISOString()});
                          setIsDuplicatesVisible(false);
                        }}
                      >
                        <Ionicons name="eye" size={20} color="#3b82f6" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Direct Transfer Modal */}
      <Modal visible={isTransferModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.uploadModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer {selectedFileIds.size} Assets</Text>
              <TouchableOpacity onPress={() => setIsTransferModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="infinite" size={20} color="#3b82f6" />
              <Text style={styles.infoText}>
                Moving assets server-to-server. This preserves your mobile data.
              </Text>
            </View>

            <Text style={styles.modalLabel}>Select Destination Cloud</Text>
            <View style={styles.providerSelect}>
              {providers.map(p => (
                <TouchableOpacity 
                  key={p}
                  style={[styles.providerBtn, transferTargetProvider === p && styles.providerBtnActive]}
                  onPress={() => setTransferTargetProvider(p)}
                >
                  <Ionicons 
                    name={p === 'aws-s3' ? 'logo-amazon' : p === 'google-photos' ? 'logo-google' : 'triangle'} 
                    size={20} 
                    color={transferTargetProvider === p ? '#fff' : '#64748b'} 
                  />
                  <Text style={[styles.providerText, transferTargetProvider === p && styles.providerTextActive]}>
                    {p === 'aws-s3' ? 'AWS S3' : p === 'google-photos' ? 'Photos' : 'Vercel'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.uploadBtn, isTransferring && styles.btnDisabled]} 
              onPress={handleBulkTransfer}
              disabled={isTransferring}
            >
              {isTransferring ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadBtnText}>Begin Cloud-to-Cloud Transfer</Text>
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
  itemList: {
    width: '100%',
    height: 80,
    flexDirection: 'row',
    marginBottom: 8
  },
  folderContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  folderIcon: { 
    width: 52, height: 52, borderRadius: 16, 
    backgroundColor: 'rgba(59,130,246,0.1)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  folderName: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 6 },
  photoContent: { flex: 1, position: 'relative' },
  photoContentList: { flexDirection: 'row', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  imageList: { width: 80, height: '100%', borderRadius: 8 },
  listDetails: { flex: 1, paddingHorizontal: 12, justifyContent: 'center' },
  listName: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  listDate: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  listBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  listBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
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
    ...Platform.select({
      ios: {
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.4)'
      }
    })  },
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
    justifyContent: 'center', alignItems: 'center'
  },
  viewerActions: { flexDirection: 'row', gap: 8 },
  viewerAction: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  navBtnLeft: {
    position: 'absolute', left: 16, zIndex: 20,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center'
  },
  navBtnRight: {
    position: 'absolute', right: 16, zIndex: 20,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center'
  },
  fullImage: { flex: 1, width: '100%', height: '100%' },
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
    ...Platform.select({
      ios: {
        shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12,
      },
      android: {
        elevation: 8
      },
      web: {
        boxShadow: '0px 8px 12px rgba(59, 130, 246, 0.4)'
      }
    })
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
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  docPlaceholder: { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  fabOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 },
  fabMenu: { position: 'absolute', bottom: 90, right: 20, alignItems: 'flex-end', gap: 12 },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  fabMenuIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  fabMenuText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  folderModal: { backgroundColor: '#1e293b', margin: 20, borderRadius: 24, padding: 24, width: '90%', alignSelf: 'center', marginBottom: Platform.OS === 'ios' ? 100 : 20 },
  folderInput: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  inputGroup: { marginBottom: 24 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', marginHorizontal: 20, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#334155' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  searchClear: { padding: 4 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagBadge: { backgroundColor: 'rgba(59,130,246,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  tagText: { color: '#60a5fa', fontSize: 10, fontWeight: '700' },
  ocrContainer: { backgroundColor: 'rgba(59,130,246,0.05)', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.1)' },
  ocrTitle: { color: '#60a5fa', fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  ocrText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  dupModal: { backgroundColor: '#0f172a', flex: 1, paddingTop: 60 },
  dupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  dupTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  dupGroup: { backgroundColor: '#1e293b', marginHorizontal: 20, marginBottom: 20, borderRadius: 20, padding: 16, borderLeftWidth: 4, borderLeftColor: '#7c3aed' },
  dupGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dupGroupTitle: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  dupItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 12, borderRadius: 12, marginBottom: 8 },
  dupItemImg: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  dupItemInfo: { flex: 1 },
  dupItemName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  dupItemMeta: { color: '#64748b', fontSize: 11 },
  tabBar: { flexDirection: 'row', gap: 16, marginTop: 8 },
  tabItem: { paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  tabTextActive: { color: '#fff' },
  dot: { position: 'absolute', top: -2, right: -8, width: 4, height: 4, borderRadius: 2, backgroundColor: '#3b82f6' },
  albumList: { padding: 16 },
  albumCard: { flex: 1, margin: 8, backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden', height: 200 },
  albumCover: { width: '100%', height: 140 },
  albumInfo: { padding: 12 },
  albumName: { color: '#fff', fontSize: 15, fontWeight: 'bold', textTransform: 'capitalize' },
  albumCount: { color: '#64748b', fontSize: 12, marginTop: 2 }
});
