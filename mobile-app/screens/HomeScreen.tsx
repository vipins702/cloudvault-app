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
  Alert,
  BlurView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DbService } from '../utils/db';
import { Storage } from '../utils/storage';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = (width - 4) / COLUMN_COUNT;

export default function HomeScreen() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    setLoading(true);
    try {
      const data = await DbService.fetchUnifiedGallery();
      setPhotos(data);
    } catch (e) {
      console.error('Gallery Load Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const { visibleFiles, visibleFolders } = useMemo(() => {
    const prefix = currentPath ? currentPath + '/' : '';
    const folders = new Set<string>();
    const files: any[] = [];
    photos.forEach(p => {
      const path = p.path || '';
      if (currentPath) {
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
  }, [photos, currentPath]);

  const renderItem = ({ item }: { item: any }) => {
    const isFolder = typeof item === 'string';
    return (
      <TouchableOpacity 
        style={styles.item}
        activeOpacity={0.8}
        onPress={() => isFolder ? setCurrentPath(currentPath ? `${currentPath}/${item}` : item) : setSelectedPhoto(item)}
      >
        {isFolder ? (
          <View style={styles.folderContent}>
            <Ionicons name="folder" size={52} color="#3b82f6" />
            <Text style={styles.folderName} numberOfLines={1}>{item}</Text>
          </View>
        ) : (
          <View style={styles.photoContent}>
            <Image source={{ uri: item.url }} style={styles.image} />
            <View style={styles.badge}><Text style={styles.badgeText}>{item.provider[0].toUpperCase()}</Text></View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Asset Explorer</Text>
          {currentPath ? (
            <TouchableOpacity onPress={() => setCurrentPath('')} style={styles.breadcrumb}>
              <Ionicons name="chevron-back" size={14} color="#60a5fa" />
              <Text style={styles.breadcrumbText}>Root / {currentPath}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.subtitle}>Unified Multi-Cloud Vault</Text>
          )}
        </View>
        <TouchableOpacity onPress={loadGallery} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Syncing Assets...</Text>
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
              <Ionicons name="cloud-offline-outline" size={64} color="#334155" />
              <Text style={styles.emptyText}>No assets found in this vault.</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <View style={styles.viewer}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: selectedPhoto?.url }} style={styles.fullImage} resizeMode="contain" />
          <View style={styles.viewerFooter}>
            <Text style={styles.fileName}>{selectedPhoto?.name}</Text>
            <Text style={styles.fileMeta}>{selectedPhoto?.provider} • {(selectedPhoto?.size / 1024).toFixed(1)} KB</Text>
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
    paddingVertical: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 2 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  breadcrumbText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  list: { padding: 1 },
  item: { width: ITEM_SIZE, height: ITEM_SIZE, margin: 0.5, backgroundColor: '#1e293b' },
  folderContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  folderName: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  photoContent: { flex: 1 },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(37, 99, 235, 0.9)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748b', marginTop: 15, fontWeight: '500' },
  empty: { marginTop: 100, alignItems: 'center' },
  emptyText: { color: '#475569', marginTop: 20, fontSize: 16 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 25 },
  fullImage: { width: '100%', height: '70%' },
  viewerFooter: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center', padding: 20 },
  fileName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fileMeta: { color: '#64748b', fontSize: 14, marginTop: 5 }
});
