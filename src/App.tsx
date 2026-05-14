import { useMemo, useState, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { AuthPage } from '@/components/AuthPage';
import { DeleteModal } from '@/components/DeleteModal';
import { UploadModal } from '@/components/UploadModal';
import { StorageManager } from '@/components/StorageManager';
import { MoveModal } from '@/components/MoveModal';
import { TenantDashboard } from '@/components/TenantDashboard';
import { SuperadminCMS } from '@/components/SuperadminCMS';
import { ImageViewer } from '@/components/ImageViewer';
import { LandingPage } from '@/components/LandingPage';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { BrandingSettings } from '@/components/BrandingSettings';
import {
  X, Search, LayoutGrid, Image as ImageIcon, Video, Folder,
  Trash2, Upload, Plus, CheckSquare, ChevronLeft,
  ChevronRight, Info, Cloud, HardDrive, Clock, Hash, Eye,
  LogOut, Sparkles, Download, Move, Menu, Palette, Loader2
} from 'lucide-react';
import JSZip from 'jszip';
import {
  validateSession, logout, getPersistedToken, clearPersistedToken,
  getTenantFiles, getTenantFileCount, getTenantConnections,
  getTenantStats, getAuditLogs, renameFile, moveFiles,
  getAllTenants, getGlobalAuditLogs, getGlobalStats
} from '@/lib/tenant-db';
import { createSaaSAPI, SaaSAPI } from '@/lib/saas-api';
import type { User, Tenant, Session, FileRecord, StorageConnectionRecord, AuditEntry } from '@/types/schema';
import type { StorageConnection, StorageFile, Photo, MediaType } from '@/types/storage';

// ─── Helpers ───
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getMediaType(ct: string): MediaType {
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  return 'other';
}

function fileToPhoto(f: FileRecord): Photo {
  return {
    id: f.id,
    src: f.storageUrl,
    name: f.name,
    folder: f.folder || 'Uncategorized',
    path: f.storageKey,
    size: f.sizeBytes,
    date: f.uploadedAt,
    type: getMediaType(f.contentType),
    connectionId: f.connectionId,
    tags: f.tags || [],
    metadata: f.metadata,
    contentType: f.contentType,
    createdAt: f.uploadedAt
  };
}


// ─── Demo Photos ───
const DEMO: Photo[] = [
  { id: 'd1', src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80', name: 'Mountain Lake', folder: 'Nature', path: 'Nature/Mountain Lake.jpg', size: 245000, date: '2024-06-15', type: 'image', tags: [], contentType: 'image/jpeg', createdAt: '2024-06-15' },
  { id: 'd2', src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80', name: 'Golden Valley', folder: 'Nature', path: 'Nature/Golden Valley.jpg', size: 312000, date: '2024-06-10', type: 'image', tags: [], contentType: 'image/jpeg', createdAt: '2024-06-10' },
  { id: 'd3', src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80', name: 'Lake Reflections', folder: 'Travel', path: 'Travel/Lake Reflections.jpg', size: 198000, date: '2024-05-28', type: 'image', tags: [], contentType: 'image/jpeg', createdAt: '2024-05-28' },
  { id: 'd4', src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80', name: 'Forest Path', folder: 'Nature', path: 'Nature/Forest Path.jpg', size: 287000, date: '2024-05-20', type: 'image', tags: [], contentType: 'image/jpeg', createdAt: '2024-05-20' },
  { id: 'd5', src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', name: 'Tropical Beach', folder: 'Travel', path: 'Travel/Tropical Beach.jpg', size: 176000, date: '2024-04-15', type: 'image', tags: [], contentType: 'image/jpeg', createdAt: '2024-04-15' },
  { id: 'd6', src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80', name: 'Starry Night', folder: 'Night', path: 'Night/Starry Night.jpg', size: 342000, date: '2024-04-01', type: 'image', tags: [], contentType: 'image/jpeg', createdAt: '2024-04-01' },
  // Root files
  { id: 'd7', src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&q=80', name: 'Autumn Colors', folder: 'Nature', path: 'Autumn Colors.jpg', size: 215000, date: '2024-03-20', type: 'image', tags: [], contentType: 'image/jpeg', createdAt: '2024-03-20' },
  { id: 'd8', src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80', name: 'Misty Morning', folder: 'Nature', path: 'Misty Morning.jpg', size: 189000, date: '2024-03-15', type: 'image', tags: [], contentType: 'image/jpeg', createdAt: '2024-03-15' },
];

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════

export function App() {
  // Auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'authed' | 'unauthed'>('loading');
  const [showAuth, setShowAuth] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // App State
  const [activeConn, setActiveConn] = useState<StorageConnectionRecord | null>(null); // Active connection record from DB
  const [api, setApi] = useState<SaaSAPI | null>(null);
  const [photos, setPhotos] = useState<Photo[]>(DEMO);
  const [query, setQuery] = useState('');
  const [sortBy] = useState<'date' | 'name' | 'size'>('date');
  const [mediaFilter] = useState<MediaType | 'all'>('all');
  const [currentPath, setCurrentPath] = useState(''); // Current folder path

  // Selection & Detail
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailPhoto, setDetailPhoto] = useState<Photo | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; index: number }>({ isOpen: false, index: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Pagination
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalFiles, setTotalFiles] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 10000; // Load up to 10,000 images at once (was 50)

  // UI Panels
  const [activities, setActivities] = useState<AuditEntry[]>([]);
  const [isDemo, setIsDemo] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Settings & Modals
  const [uploadOpen, setUploadOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<Photo[]>([]); // For delete modal
  const [moveOpen, setMoveOpen] = useState(false); // For bulk move
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Superadmin
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [globalActivities, setGlobalActivities] = useState<AuditEntry[]>([]);
  const [globalStats, setGlobalStats] = useState({ totalTenants: 0, totalUsers: 0, totalStorage: 0, activeConnections: 0 });

  // Rename
  const [renameTarget, setRenameTarget] = useState<Photo | null>(null);
  const [newNameInput, setNewNameInput] = useState('');

  // Connections List (for sidebar)
  const [userConnections, setUserConnections] = useState<StorageConnection[]>([]);

  // Branding & Theme
  const [branding, setBranding] = useState<{
    companyName: string;
    logoUrl: string;
    theme: 'light' | 'dark';
    font: 'sans' | 'serif' | 'mono';
  }>(() => {
    const saved = localStorage.getItem('pixelvault_branding');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse branding settings:', e);
      }
    }
    return {
      companyName: 'PixelVault',
      logoUrl: '',
      theme: 'dark',
      font: 'sans'
    };
  });

  // Apply theme and save branding
  useEffect(() => {
    localStorage.setItem('pixelvault_branding', JSON.stringify(branding));
    document.documentElement.setAttribute('data-theme', branding.theme);
    // Optionally apply font class to body
    document.body.className = `font-${branding.font}`;
  }, [branding]);

  // ─── Superadmin Helpers ───
  const handleSuperadminFetch = useCallback(async () => {
    if (currentUser?.role !== 'superadmin') return;
    const tenants = await getAllTenants();
    const logs = await getGlobalAuditLogs();
    const stats = await getGlobalStats();
    setAllTenants(tenants);
    setGlobalActivities(logs);
    setGlobalStats(stats);
  }, [currentUser]);

  // ─── Initialization ───
  useEffect(() => {
    async function init() {
      const token = getPersistedToken();
      if (!token) {
        setAuthState('unauthed');
        return;
      }
      const res = await validateSession(token);
      if (res) {
        setCurrentUser(res.user);
        setCurrentTenant(res.tenant);
        setCurrentSession(res.session);

        if (res.user.role !== 'superadmin') {
          // Load Tenant Data
          const conns = await getTenantConnections(res.tenant.id);
          setUserConnections(conns);

          // Find active connection
          const active = conns.find(c => c.isActive);
          if (active) {
            setActiveConn(active as unknown as StorageConnectionRecord);
            setApi(createSaaSAPI({ tenantId: res.tenant.id, userId: res.user.id, connection: active as unknown as StorageConnectionRecord }));
          }

          // ─── Data focused work is now moved to the currentPath effect ───

          // Load Stats
          await getTenantStats(res.tenant.id);

          // Redirect to Dashboard
          setShowLanding(false);
        } else {
          // Superadmin
          setShowLanding(false);
          handleSuperadminFetch();
        }

        setAuthState('authed');
      } else {
        clearPersistedToken();
        setAuthState('unauthed');
      }
    }
    init();
  }, [handleSuperadminFetch]);

  // ─── Folder Navigation Side Effect ───
  useEffect(() => {
    if (!currentTenant || authState !== 'authed' || currentUser?.role === 'superadmin') return;

    async function loadFolder() {
      if (!currentTenant) return;
      const tId = currentTenant.id;
      setIsLoadingMore(true);
      console.log(`[App] loadFolder(path: "${currentPath}") starting...`);
      try {
        const folderParam = currentPath || undefined;
        const count = await getTenantFileCount(tId, folderParam);
        setTotalFiles(count);

        const files = await getTenantFiles(tId, PAGE_SIZE, 0, folderParam);
        console.log(`[App] loadFolder(path: "${currentPath}") loaded ${files.length} files. Total: ${count}`);
        if (files.length > 0) {
          setPhotos(files.map(f => fileToPhoto({ ...f, tenantId: tId } as any)));
          setIsDemo(false);
          setOffset(files.length);
          setHasMore(files.length < count);
        } else {
          setPhotos([]);
          setOffset(0);
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to load folder:', err);
      } finally {
        setIsLoadingMore(false);
      }
    }

    loadFolder();
  }, [currentPath, currentTenant, authState, currentUser?.role]);




  const refreshActivities = useCallback(async () => {
    if (currentTenant) {
      const logs = await getAuditLogs(currentTenant.id);
      setActivities(logs);
    }
  }, [currentTenant]);

  // ─── Auth handlers ───
  const handleAuthenticated = (user: User, tenant: Tenant | null, session: Session) => {
    setCurrentUser(user);
    if (tenant) setCurrentTenant(tenant);
    setCurrentSession(session);
    setAuthState('authed');
    setShowAuth(false);
    setShowLanding(false);

    if (user.role === 'superadmin') {
      handleSuperadminFetch();
    } else if (tenant) {
      // Check if new tenant needs onboarding
      if (tenant.createdAt === tenant.updatedAt) { // heuristic for new tenant
        setOnboardingOpen(true);
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (currentSession) {
        await logout(currentSession.token);
      }
    } catch (err) {
      console.error('[App] Logout server error (ignoring to clear local state):', err);
    } finally {
      clearPersistedToken();
      setCurrentUser(null);
      setCurrentTenant(null);
      setCurrentSession(null);
      setAuthState('unauthed');
      setShowLanding(true); // Redirect to landing page on logout
      setPhotos(DEMO);
      setIsDemo(true);
      setActiveConn(null);
      setApi(null);
      setSidebarOpen(false); // Close sidebar for clean landing
      setShowAuth(false);
    }
  };

  // ─── Storage Manager callbacks (bridge old StorageManager) ───
  const handleFilesLoaded = useCallback(async (files: StorageFile[], conn: StorageConnection) => {
    if (!currentTenant || !currentUser) return;

    console.log('[App] Files loaded for connection:', conn.name, 'ID:', conn.id);

    // Update Connection State
    const connRecord = {
      ...conn,
      tenantId: currentTenant.id,
      credentialsEncrypted: JSON.stringify(conn.credentials)
    } as unknown as StorageConnectionRecord;

    setActiveConn(connRecord);
    setPhotos(files.map(f => fileToPhoto({
      ...f,
      id: f.id,
      tenantId: currentTenant.id,
      connectionId: conn.id,
      storageKey: f.path || f.id,
      storageUrl: f.url,
      sizeBytes: f.size,
      folder: (f.path && f.path.split('/').filter(Boolean).length > 1)
        ? f.path.split('/').filter(Boolean)[0]
        : (conn.name || 'Root'),
    } as any)));

    setIsDemo(false);
    setStorageOpen(false);

    // Refresh connections list
    const updatedConns = await getTenantConnections(currentTenant.id);
    setUserConnections(updatedConns);

    // Create API instance
    const apiInstance = createSaaSAPI({
      tenantId: currentTenant.id,
      userId: currentUser.id,
      connection: connRecord,
    });
    setApi(apiInstance);

    await getTenantConnections(currentTenant.id);
  }, [currentTenant, currentUser]);


  // ─── DELETE ───
  const handleDelete = useCallback(async (ids: string[], urls: string[]): Promise<{ success: boolean; error?: string }> => {
    if (isDemo || !api) {
      setPhotos(prev => prev.filter(p => !ids.includes(p.id)));
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      return { success: true };
    }

    const result = await api.deleteFiles(ids, urls);
    if (result.success) {
      setPhotos(prev => prev.filter(p => !ids.includes(p.id)));
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));

      // Update pagination state
      setTotalFiles(prev => Math.max(0, prev - ids.length));
      setOffset(prev => Math.max(0, prev - ids.length));

      deselectAll();
      setRenameTarget(null);
      refreshActivities();
    }
    return {
      success: result.success,
      error: result.error || result.data?.failed?.join(', '),
    };
  }, [isDemo, api, refreshActivities]);

  // ─── Pagination ───
  const handleLoadMore = async () => {
    if (!currentTenant || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    console.log(`[App] handleLoadMore starting. current offset: ${offset}, total: ${totalFiles}, query: ${currentPath}`);
    try {
      const folderParam = currentPath || undefined;
      const nextBatch = await getTenantFiles(currentTenant.id, PAGE_SIZE, offset, folderParam);
      console.log(`[App] handleLoadMore got ${nextBatch.length} more files`);
      if (nextBatch.length > 0) {
        const nextPhotos = nextBatch.map(f => fileToPhoto({ ...f, tenantId: currentTenant.id } as any));
        setPhotos(prev => {
          console.log(`[App] Updating photos state. prev: ${prev.length}, adding: ${nextPhotos.length}`);
          return [...prev, ...nextPhotos];
        });
        setOffset(prev => prev + nextBatch.length);
        setHasMore(offset + nextBatch.length < totalFiles);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more files:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // ─── Upload callback ───
  const handleFilesUploaded = useCallback((files: FileRecord[]) => {
    const newPhotos = files.map(fileToPhoto);
    setPhotos(prev => [...newPhotos, ...prev]);
    setTotalFiles(prev => prev + files.length);
    setOffset(prev => prev + files.length);
  }, []);

  // ─── RENAME ───
  const handleRename = async () => {
    if (!renameTarget || !newNameInput.trim() || !currentTenant) return;
    const newName = newNameInput.trim();

    // Optimistic update
    setPhotos(prev => prev.map(p => p.id === renameTarget.id ? { ...p, name: newName } : p));

    // DB update
    await renameFile(currentTenant.id, renameTarget.id, newName, currentUser?.id);

    setRenameTarget(null);
    setNewNameInput('');
    refreshActivities();
  };

  // ─── DOWNLOAD ───
  const handleDownload = async (photo: Photo) => {
    try {
      // If it's a blob URL or public URL, try to fetch it
      const response = await fetch(photo.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: just open in new tab
      window.open(photo.src, '_blank');
    }
  };

  // ─── BULK DOWNLOAD (ZIP) ───
  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    const targets = photos.filter(p => selectedIds.includes(p.id));

    setIsExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();

      for (let i = 0; i < targets.length; i++) {
        const photo = targets[i];
        try {
          const response = await fetch(photo.src);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();

          // Add to zip
          const fileName = photo.name.includes('.') ? photo.name : `${photo.name}.${photo.contentType.split('/')[1] || 'jpg'}`;
          zip.file(fileName, blob);
        } catch (err) {
          console.error(`Failed to fetch ${photo.name} for ZIP:`, err);
        }

        // Update progress
        setExportProgress(((i + 1) / targets.length) * 100);
      }

      const content = await zip.generateAsync({ type: 'blob' });

      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pixelvault-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Bulk export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // ─── MOVE ───
  const handleMove = async (newFolder: string, targetConnId?: string) => {
    if (!currentTenant || !api) return;

    const targetIds = selectedIds.length > 0 ? selectedIds : (detailPhoto ? [detailPhoto.id] : []);
    if (targetIds.length === 0) return;

    const isCrossProvider = targetConnId && targetConnId !== activeConn?.id;

    if (isCrossProvider) {
      // ─── CROSS-PROVIDER TRANSFER ───
      const targetConnRecord = userConnections.find(c => c.id === targetConnId);
      if (!targetConnRecord) return;

      const targetApi = createSaaSAPI({
        tenantId: currentTenant.id,
        userId: currentUser?.id || 'anonymous',
        connection: targetConnRecord
      });

      // Sequential transfer (simpler for progress/errors)
      for (const id of targetIds) {
        const photo = photos.find(p => p.id === id);
        if (!photo) continue;

        try {
          // 1. Download from source
          const blob = await api.downloadAsBlob(photo.src);
          // 2. Upload to target
          const uploadRes = await targetApi.uploadFile(new File([blob], photo.name, { type: photo.contentType }), newFolder);

          if (uploadRes.success && uploadRes.data) {
            // 3. Delete from source
            await api.deleteFiles([id], [photo.src]);

            // 4. Update local state
            setPhotos(prev => prev.map(p => p.id === id ? {
              ...(uploadRes.data as any), // Use the new record data
              src: uploadRes.data?.storageUrl, // Ensure mapping back to Photo interface
              date: uploadRes.data?.uploadedAt.split('T')[0],
              type: getMediaType(uploadRes.data?.contentType || 'image/jpeg')
            } : p));
          }
        } catch (err) {
          console.error(`Failed to transfer file ${id}:`, err);
        }
      }
    } else {
      // ─── LOCAL METADATA MOVE ───
      setPhotos(prev => prev.map(p =>
        targetIds.includes(p.id) ? { ...p, folder: newFolder, path: `${newFolder}/${p.name}` } : p
      ));
      await moveFiles(currentTenant.id, targetIds, newFolder, currentUser?.id);
    }

    setMoveOpen(false);
    setSelectedIds([]);
    refreshActivities();
  };

  // ─── Derived ───
  const folders = useMemo(() => {
    const set = new Set<string>();
    photos.forEach(p => set.add(p.folder));
    return Array.from(set).sort();
  }, [photos]);

  const { visibleFiles, visibleFolders } = useMemo(() => {
    let arr = photos.slice();

    // 1. Filter by Connection if selected
    // if (selectedConnId) arr = arr.filter(p => p.connectionId === selectedConnId); 
    // ^ Disabled for now to show unified view by default, or could enable

    // 2. Filter by Search Query (Global Search overrides folder view)
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const folderMatch = p.folder.toLowerCase().includes(q);
        const tagMatch = p.tags.some(t => t.toLowerCase().includes(q));

        // Find connection name for this photo
        const connName = userConnections.find(c => c.id === p.connectionId)?.name.toLowerCase() || '';
        const providerMatch = connName.includes(q);

        return nameMatch || folderMatch || tagMatch || providerMatch;
      });

      // Sort
      if (sortBy === 'name') arr.sort((a, b) => a.name.localeCompare(b.name));
      if (sortBy === 'date') arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sortBy === 'size') arr.sort((a, b) => b.size - a.size);

      return { visibleFiles: arr, visibleFolders: [] };
    }

    // 3. Filter by Media Type
    if (mediaFilter !== 'all') arr = arr.filter(p => p.type === mediaFilter);

    // 4. Folder Navigation Logic
    const prefix = currentPath ? currentPath + '/' : '';
    const relevantItems = arr.filter(p => {
      // If we are at root (empty path), show items with NO folder (or 'Root') 
      // AND items that are in immediate folders (handled by visibleFolders)
      if (!currentPath) return true;
      return p.path.startsWith(prefix);
    });

    const folders = new Set<string>();
    const files: Photo[] = [];

    relevantItems.forEach(p => {
      // Remove the current path prefix
      const relativePath = p.path.startsWith(prefix) ? p.path.slice(prefix.length) : p.path;
      // If splitting by / gives > 1 part, it is in a subfolder relative to here
      const parts = relativePath.split('/');

      if (parts.length > 1) {
        // It's in a subfolder
        folders.add(parts[0]);
      } else {
        // It's a file in this folder
        // HOWEVER: Only show files if they actually match the path precisely.
        // The logic above `startsWith` captures everything recursive. 
        // We only want immediate children.
        files.push(p);
      }
    });

    // Sort Files
    if (sortBy === 'name') files.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'date') files.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sortBy === 'size') files.sort((a, b) => b.size - a.size);

    return {
      visibleFiles: files,
      visibleFolders: Array.from(folders).sort()
    };
  }, [photos, mediaFilter, query, sortBy, currentPath]);

  const stats = useMemo(() => ({
    count: photos.length,
    images: photos.filter(p => p.type === 'image').length,
    videos: photos.filter(p => p.type === 'video').length,
    totalSize: photos.reduce((s, p) => s + p.size, 0),
  }), [photos]);

  const toggleSelect = (id: string, shiftKey: boolean = false) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(id);

      if (shiftKey && lastSelectedId && lastSelectedId !== id) {
        const lastIdx = visibleFiles.findIndex(p => p.id === lastSelectedId);
        const currIdx = visibleFiles.findIndex(p => p.id === id);

        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          const rangeIds = visibleFiles.slice(start, end + 1).map(p => p.id);

          // If the clicked item is already selected, we are deselecting the range
          if (isSelected) {
            return prev.filter(x => !rangeIds.includes(x));
          } else {
            return Array.from(new Set([...prev, ...rangeIds]));
          }
        }
      }

      setLastSelectedId(id);
      return isSelected ? prev.filter(x => x !== id) : [...prev, id];
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === visibleFiles.length && visibleFiles.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleFiles.map(p => p.id));
    }
  };

  const deselectAll = () => {
    setSelectedIds([]);
    setLastSelectedId(null);
  };

  // ─── Top-Level state machine ───

  // 1. Loading Splash
  if (authState === 'loading') {
    return (
      <div className="h-screen w-full bg-surface-dark flex flex-col items-center justify-center bg-gradient-mesh bg-noise gap-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 shadow-glow-brand flex items-center justify-center animate-pulse">
          <Sparkles className="w-8 h-8 text-brand-400 animate-spin-slow" />
        </div>
        <div className="text-center">
          <div className="text-lg font-black tracking-tight text-white mb-1">PixelVault</div>
          <div className="text-xs text-text-tertiary font-bold uppercase tracking-widest px-3 py-1 bg-surface-light border border-white/5 rounded-full">Initializing Studio</div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Flows (Landing vs Auth)
  if (authState === 'unauthed') {
    if (showLanding && !showAuth) {
      return (
        <LandingPage
          onGetStarted={() => { setShowLanding(false); setShowAuth(true); }}
          onLogin={() => { setShowLanding(false); setShowAuth(true); }}
        />
      );
    }
    return (
      <AuthPage
        onAuthenticated={handleAuthenticated}
        onBack={() => { setShowLanding(true); setShowAuth(false); }}
      />
    );
  }

  // 3. Superadmin Experience
  if (currentUser?.role === 'superadmin') {
    return (
      <SuperadminCMS
        currentUser={currentUser}
        tenants={allTenants}
        globalLogs={globalActivities}
        stats={globalStats}
        onManageTenant={(t: Tenant) => {
          // Quick hack for impersonation demo: just switch tenant state
          setCurrentTenant(t);
          // Re-fetch everything for this tenant
          getTenantConnections(t.id).then(conns => setUserConnections(conns));
          getTenantFiles(t.id).then(files => setPhotos(files.map(f => fileToPhoto({ ...f, tenantId: t.id } as any))));
        }}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Main Dashboard Shell (Authenticated)
  return (
    <div className="flex h-screen bg-surface-dark text-text-primary overflow-hidden font-sans selection:bg-brand-500/30 bg-gradient-mesh bg-noise relative">

      {/* ─── MOBILE BACKDROP ─── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[15] lg:hidden transition-all duration-300 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 glass border-r border-border/50 flex flex-col transition-all duration-500 ease-premium z-[30] lg:z-20 shadow-2xl lg:shadow-none",
        sidebarOpen ? "translate-x-0 w-72 lg:w-64" : "-translate-x-full lg:translate-x-0 lg:w-20"
      )}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/25 animate-glow-border overflow-hidden">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-4 h-4 text-white/90" />
            )}
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in">
              <div className="font-black text-base tracking-tight">{branding.companyName}</div>
              <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">Cloud Studio</div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2.5 space-y-0.5 mt-3">
          <button
            onClick={() => setCurrentPath('')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
              !currentPath
                ? "bg-brand-500/10 text-brand-400 shadow-sm shadow-brand-500/5 border border-brand-500/10"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-light/50"
            )}
          >
            <LayoutGrid className="w-5 h-5" />
            {sidebarOpen && <span className="font-semibold text-sm">Dashboard</span>}
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-light/50 transition-all group">
            <ImageIcon className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
            {sidebarOpen && <span className="font-semibold text-sm">Photos</span>}
          </button>

          <div className="pt-5 pb-2">
            {sidebarOpen && <p className="px-3 text-[10px] font-bold text-text-tertiary uppercase tracking-[0.15em] mb-3">My Cloud</p>}
            {userConnections.map(conn => (
              <button
                key={conn.id}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-light/50 transition-all mb-0.5"
                title={conn.name}
              >
                <Cloud className={cn("w-4 h-4 transition-colors", conn.isActive ? "text-emerald-400" : "text-text-tertiary")} />
                {sidebarOpen && (
                  <div className="flex-1 text-left truncate flex items-center gap-2">
                    <span className="text-sm">{conn.name}</span>
                    {conn.isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-glow-emerald" />}
                  </div>
                )}
              </button>
            ))}
            <button
              onClick={() => setStorageOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-text-tertiary hover:text-brand-400 hover:bg-brand-500/5 transition-all mt-1 group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              {sidebarOpen && <span className="text-sm font-medium">Connect Storage</span>}
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white uppercase shadow-lg shadow-brand-500/20 ring-2 ring-surface">
              {currentUser ? (currentUser.name || 'User').substring(0, 2) : 'G'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{currentUser?.name || 'Guest'}</div>
                <div className="text-[11px] text-text-tertiary truncate">{currentTenant?.name || 'Personal'}</div>
              </div>
            )}
            <button onClick={handleLogout} className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sidebar Toggle (Desktop Only) */}
        <div className="hidden lg:block absolute top-1/2 -right-3.5 transform -translate-y-1/2 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-7 h-7 rounded-full bg-surface-light border border-border/50 flex items-center justify-center text-text-tertiary hover:text-brand-400 hover:border-brand-500/30 shadow-premium transition-all hover:scale-110 active:scale-95"
          >
            {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* ═══ CONTENT AREA ═══ */}
      <main className="flex-1 flex flex-col min-w-0 relative">

        {/* ═══ FROSTED GLASS TOP BAR ═══ */}
        <header className="h-16 px-4 sm:px-6 border-b border-border/30 flex items-center justify-between shrink-0 glass sticky top-0 z-[25]">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-text-tertiary hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-4 w-full animate-slide-in-down">
              <button onClick={deselectAll} className="p-2 -ml-2 rounded-lg hover:bg-surface-light transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>

              <div className="flex items-center gap-3">
                <span className="font-bold text-text-primary whitespace-nowrap">{selectedIds.length} selected</span>
                <button
                  onClick={toggleSelectAll}
                  className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 text-text-tertiary transition-all"
                >
                  {selectedIds.length === visibleFiles.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="h-6 w-px bg-border mx-2" />

              <div className="flex items-center gap-2">
                {isExporting ? (
                  <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                    <span className="text-xs font-bold text-brand-400 uppercase tracking-widest whitespace-nowrap">
                      Exporting {Math.round(exportProgress)}%
                    </span>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setDeleteTargets(photos.filter(p => selectedIds.includes(p.id)))} className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-400 text-sm font-semibold flex items-center gap-2 transition-colors border border-red-500/10 active-press">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                    <button onClick={() => setMoveOpen(true)} className="px-3.5 py-1.5 rounded-lg bg-surface-lighter hover:bg-surface-muted text-text-primary text-sm font-semibold flex items-center gap-2 transition-colors border border-border/50 active-press">
                      <Move className="w-3.5 h-3.5" /> Move
                    </button>
                    <button onClick={handleBulkDownload} className="px-3.5 py-1.5 rounded-lg bg-surface-lighter hover:bg-surface-muted text-text-primary text-sm font-semibold flex items-center gap-2 transition-colors border border-border/50 active-press">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </>
                )}
              </div>

              <div className="ml-auto text-[10px] text-text-tertiary font-mono tracking-wider">
                Shift+Click for range
              </div>
            </div>
          ) : (
            <>
              {/* Premium Search Bar */}
              <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative w-full group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-brand-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search photos, videos..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full bg-surface-light border border-border/50 focus:border-brand-500/40 rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all shadow-premium-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button onClick={() => setBrandingOpen(true)} className="p-2 text-text-tertiary hover:text-brand-400 hover:bg-brand-500/5 rounded-lg transition-all" title="Theme Settings">
                  <Palette className="w-5 h-5" />
                </button>
                <button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-brand-500/20 transition-all hover:shadow-brand-500/30 active-press">
                  <Upload className="w-4 h-4" />
                  <span className="hidden xs:inline">Upload</span>
                </button>
              </div>
            </>
          )}
        </header>

        {/* Dashboard / Folder View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {!currentPath && !query && (
            <TenantDashboard
              tenant={currentTenant!}
              user={currentUser!}
              stats={stats}
              activeConn={activeConn}
              health={null}
              recentActivities={activities}
              // @ts-ignore
              folders={folders}
              currentPath={currentPath}
              onNavigateFolder={setCurrentPath}
              onUpload={() => setUploadOpen(true)}
              onConnect={() => setStorageOpen(true)}
            />
          )}

          {(currentPath || query) && (
            <div className="space-y-6">

              {/* Breadcrumbs (if in folder view) */}
              {currentPath && (
                <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                  <button onClick={() => setCurrentPath('')} className="hover:text-white transition-colors flex items-center gap-1">
                    <LayoutGrid className="w-4 h-4" /> Home
                  </button>
                  {currentPath.split('/').map((part, i, arr) => {
                    const path = arr.slice(0, i + 1).join('/');
                    return (
                      <div key={path} className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-text-secondary/40" />
                        <button
                          onClick={() => setCurrentPath(path)}
                          className={cn("hover:text-white transition-colors", i === arr.length - 1 && "font-bold text-white pointer-events-none")}
                        >
                          {part}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Folder Grid (Subfolders) */}
              {visibleFolders.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-text-secondary/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Folder className="w-4 h-4" /> Folders
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {visibleFolders.map(folderName => (
                      <button
                        key={folderName}
                        onClick={() => setCurrentPath(currentPath ? `${currentPath}/${folderName}` : folderName)}
                        className="group p-4 rounded-2xl bg-surface-lighter border border-border hover:border-brand-500/30 hover:bg-surface transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-3 group-hover:scale-110 transition-transform">
                          <Folder className="w-5 h-5 fill-brand-500/20" />
                        </div>
                        <div className="font-bold text-white truncate">{folderName}</div>
                        <div className="text-xs text-text-secondary mt-0.5">Folder</div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* File Grid */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-text-secondary/60 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Files ({visibleFiles.length})
                  </h3>
                  {/* Sorting / View Controls could go here */}
                </div>

                {visibleFiles.length === 0 ? (
                  <div className="py-12 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-lighter flex items-center justify-center mb-4 text-text-secondary/20">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <p className="text-text-secondary">No files in this folder.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {visibleFiles.map((photo, index) => {
                        const isSelected = selectedIds.includes(photo.id);
                        return (
                          <div
                            key={photo.id}
                            className={cn(
                              "group relative aspect-square rounded-xl overflow-hidden bg-surface-lighter border transition-all duration-300 cursor-pointer shadow-card",
                              isSelected
                                ? "border-brand-500 ring-2 ring-brand-500/25 shadow-glow-brand scale-[0.98]"
                                : "border-border/30 hover:border-border hover:shadow-premium"
                            )}
                          >
                            {/* Selection Checkbox */}
                            <div
                              onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id, e.shiftKey); }}
                              className={cn(
                                "absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200",
                                isSelected
                                  ? "bg-brand-500 border-brand-500 text-white shadow-glow-brand scale-100"
                                  : "bg-black/30 backdrop-blur-sm border border-white/20 hover:border-white/50 text-transparent opacity-0 group-hover:opacity-100"
                              )}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </div>

                            {/* Image Preview */}
                            <div
                              onClick={(e) => {
                                if (e.shiftKey || e.ctrlKey || selectedIds.length > 0) {
                                  toggleSelect(photo.id, e.shiftKey);
                                } else {
                                  setViewerState({ isOpen: true, index });
                                }
                              }}
                              className="w-full h-full"
                            >
                              {photo.type === 'image' ? (
                                <img src={photo.src} alt={photo.name} className="w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.08]" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-surface-light">
                                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                                    <Video className="w-6 h-6 text-purple-400" />
                                  </div>
                                </div>
                              )}

                              {/* Overlay Gradient */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                              {/* Photo Info */}
                              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 transition-all duration-300 text-white opacity-0 group-hover:opacity-100">
                                <p className="text-xs font-bold truncate drop-shadow-lg">{photo.name}</p>
                                <p className="text-[10px] text-white/60 mt-0.5 font-medium">{formatSize(photo.size)}</p>
                              </div>
                            </div>

                            {/* Info Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setDetailPhoto(photo); }}
                              className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/30 backdrop-blur-md text-white/50 hover:text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Load More Button */}
                    {hasMore && (
                      <div className="mt-12 flex justify-center pb-8 animate-fade-in">
                        <button
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          className="group relative px-8 py-3.5 rounded-2xl bg-surface-lighter border border-border/50 hover:border-brand-500/30 hover:bg-surface text-sm font-bold text-text-primary transition-all flex items-center gap-3 disabled:opacity-50 active-press shadow-premium overflow-hidden"
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                          {isLoadingMore ? (
                            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                          ) : (
                            <div className="w-5 h-5 rounded-lg bg-brand-500/10 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
                              <Plus className="w-3.5 h-3.5 text-brand-400" />
                            </div>
                          )}
                          <span className="relative">Load More Assets</span>
                          <span className="text-[10px] text-text-tertiary font-mono bg-white/5 px-2 py-0.5 rounded-md ml-1">
                            {photos.length} / {totalFiles}
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      {/* ═══ DETAIL PANEL (Responsive Overlay) ═══ */}
      {detailPhoto && (
        <>
          {/* Mobile Detail Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[35] lg:hidden"
            onClick={() => setDetailPhoto(null)}
          />
          <aside className="fixed inset-y-0 right-0 w-full sm:w-96 lg:relative lg:w-80 glass border-l border-border/30 flex flex-col flex-shrink-0 animate-slide-in-right z-[40] lg:z-20 shadow-2xl lg:shadow-none bg-surface-dark lg:bg-transparent">
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h3 className="font-black text-xs uppercase tracking-widest text-text-tertiary">Asset Details</h3>
              <button
                onClick={() => setDetailPhoto(null)}
                className="p-1.5 rounded-lg hover:bg-surface-light text-text-tertiary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Detail content scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 select-none">
              <div className="rounded-xl overflow-hidden bg-surface-lighter aspect-video shadow-card">
                {detailPhoto.type === 'image' ? (
                  <img src={detailPhoto.src} alt={detailPhoto.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Video className="w-8 h-8 text-text-tertiary" /></div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-text-primary">{detailPhoto.name}</h4>
                <p className="text-xs text-text-tertiary mt-1">{detailPhoto.folder}</p>
              </div>
              <div className="space-y-1.5 pt-1">
                {[
                  { label: 'Size', value: formatSize(detailPhoto.size), icon: <HardDrive className="w-3.5 h-3.5" /> },
                  { label: 'Date', value: new Date(detailPhoto.date).toLocaleDateString(), icon: <Clock className="w-3.5 h-3.5" /> },
                  { label: 'Type', value: detailPhoto.type.toUpperCase(), icon: <Hash className="w-3.5 h-3.5" /> },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-light/50 border border-border/20">
                    <span className="text-text-tertiary">{item.icon}</span>
                    <span className="text-xs text-text-tertiary w-14">{item.label}</span>
                    <span className="text-xs text-text-primary/70 font-medium flex-1 text-right">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-3">
                <button
                  onClick={() => setViewerState({ isOpen: true, index: visibleFiles.findIndex(p => p.id === detailPhoto.id) })}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-brand-400 bg-brand-500/10 rounded-xl hover:bg-brand-500/15 transition-all border border-brand-500/10 active-press"
                >
                  <Eye className="w-3.5 h-3.5" /> Open Viewer
                </button>
                <button
                  onClick={() => setDeleteTargets([detailPhoto])}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-red-400 bg-red-500/10 rounded-xl hover:bg-red-500/15 transition-all border border-red-500/10 active-press"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete permanently
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ═══ MODALS ═══ */}
      {uploadOpen && (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onFilesUploaded={handleFilesUploaded}
          api={api}
          isDemo={isDemo}
          existingFiles={photos}
        />
      )}

      {storageOpen && (
        <StorageManager
          open={storageOpen}
          onClose={() => setStorageOpen(false)}
          onFilesLoaded={handleFilesLoaded}
          tenantId={currentTenant?.id || ''}
        />
      )}

      {deleteTargets.length > 0 && (
        <DeleteModal
          photos={deleteTargets}
          isDemo={isDemo}
          onConfirmDelete={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}

      {moveOpen && (
        <MoveModal
          photos={selectedIds.length > 0 ? photos.filter(p => selectedIds.includes(p.id)) : (detailPhoto ? [detailPhoto] : [])}
          existingFolders={folders}
          initialFolder={currentPath}
          connections={userConnections}
          activeConnId={activeConn?.id}
          onConfirm={handleMove}
          onClose={() => setMoveOpen(false)}
        />
      )}

      {brandingOpen && (
        <BrandingSettings
          open={brandingOpen}
          onClose={() => setBrandingOpen(false)}
          branding={branding}
          onUpdate={(updates) => setBranding(prev => ({ ...prev, ...updates }))}
        />
      )}

      {onboardingOpen && (
        <OnboardingFlow
          onComplete={() => setOnboardingOpen(false)}
          onLogout={handleLogout}
        />
      )}

      {/* ═══ IMAGE VIEWER ═══ */}
      {viewerState.isOpen && (
        <ImageViewer
          images={visibleFiles} // Pass currently visible files for context navigation
          initialIndex={viewerState.index}
          onClose={() => setViewerState({ ...viewerState, isOpen: false })}
          onDelete={(photo) => {
            // Optional: Allow delete from viewer
            setViewerState({ ...viewerState, isOpen: false });
            setDeleteTargets([photo]);
          }}
        />
      )}

    </div>
  );
}
