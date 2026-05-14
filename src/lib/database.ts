import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StorageConnection, StorageFile, StorageProvider } from '@/types/storage';

interface PhotoDB extends DBSchema {
  connections: {
    key: string;
    value: StorageConnection;
    indexes: { 'by-provider': StorageProvider };
  };
  files: {
    key: string;
    value: StorageFile & { connectionId: string; syncedAt: string };
    indexes: { 'by-connection': string; 'by-date': string };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'PhotoViewerDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PhotoDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<PhotoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PhotoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Connections store
        const connectionStore = db.createObjectStore('connections', { keyPath: 'id' });
        connectionStore.createIndex('by-provider', 'provider');
        
        // Files store (cached files from storage)
        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
        fileStore.createIndex('by-connection', 'connectionId');
        fileStore.createIndex('by-date', 'uploadedAt');
        
        // Settings store
        db.createObjectStore('settings', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

// Connection CRUD
export async function saveConnection(connection: StorageConnection): Promise<void> {
  const db = await getDB();
  await db.put('connections', {
    ...connection,
    updatedAt: new Date().toISOString(),
  });
}

export async function getConnection(id: string): Promise<StorageConnection | undefined> {
  const db = await getDB();
  return db.get('connections', id);
}

export async function getAllConnections(): Promise<StorageConnection[]> {
  const db = await getDB();
  return db.getAll('connections');
}

export async function deleteConnection(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('connections', id);
  // Also delete associated files
  const tx = db.transaction('files', 'readwrite');
  const index = tx.store.index('by-connection');
  const files = await index.getAll(id);
  await Promise.all(files.map(f => tx.store.delete(f.id)));
  await tx.done;
}

export async function setActiveConnection(id: string | null): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('connections', 'readwrite');
  const store = tx.store;
  
  // Deactivate all
  const all = await store.getAll();
  await Promise.all(
    all.map(c => store.put({ ...c, isActive: c.id === id }))
  );
  await tx.done;
}

export async function getActiveConnection(): Promise<StorageConnection | undefined> {
  const db = await getDB();
  const all = await db.getAll('connections');
  return all.find(c => c.isActive);
}

// File caching
export async function cacheFiles(connectionId: string, files: StorageFile[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('files', 'readwrite');
  const syncedAt = new Date().toISOString();
  
  await Promise.all(
    files.map(file => 
      tx.store.put({
        ...file,
        connectionId,
        syncedAt,
      })
    )
  );
  await tx.done;
  
  // Update connection lastSyncAt
  const conn = await db.get('connections', connectionId);
  if (conn) {
    await db.put('connections', {
      ...conn,
      lastSyncAt: syncedAt,
      metadata: {
        ...conn.metadata,
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
      }
    });
  }
}

export async function getCachedFiles(connectionId: string): Promise<(StorageFile & { syncedAt: string })[]> {
  const db = await getDB();
  const index = db.transaction('files').store.index('by-connection');
  return index.getAll(connectionId);
}

export async function clearCachedFiles(connectionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('files', 'readwrite');
  const index = tx.store.index('by-connection');
  const files = await index.getAll(connectionId);
  await Promise.all(files.map(f => tx.store.delete(f.id)));
  await tx.done;
}

// Delete a single cached file by ID
export async function deleteCachedFile(fileId: string): Promise<void> {
  const db = await getDB();
  await db.delete('files', fileId);
}

// Delete multiple cached files by IDs
export async function deleteCachedFiles(fileIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('files', 'readwrite');
  await Promise.all(fileIds.map(id => tx.store.delete(id)));
  await tx.done;
}

// Auth helpers
export async function setPasscode(code: string): Promise<void> {
  await setSetting('passcode', code);
}

export async function getPasscode(): Promise<string | undefined> {
  return getSetting<string>('passcode');
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSetting<string>('session');
  if (!session) return false;
  // Session expires after 24 hours
  const ts = parseInt(session, 10);
  return Date.now() - ts < 24 * 60 * 60 * 1000;
}

export async function setSession(): Promise<void> {
  await setSetting('session', String(Date.now()));
}

export async function clearSession(): Promise<void> {
  await setSetting('session', null);
}

// Settings
export async function getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  const db = await getDB();
  const value = await db.get('settings', key);
  return value?.data ?? defaultValue;
}

export async function setSetting(key: string, data: any): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, data });
}
