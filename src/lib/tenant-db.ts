/// <reference types="vite/client" />
import { openDB, IDBPDatabase } from 'idb';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import {
  Tenant, User, Session, StorageConnectionRecord,
  FileRecord, AlbumRecord, SignupRequest, LoginRequest, AuthResponse,
  PLAN_LIMITS, AuditEntry
} from '../types/schema';
import { StorageConnection } from '../types/storage';

// ----------------------------------------------------------------------
// CONFIGURATION & UTILS
// ----------------------------------------------------------------------

const DB_NAME = 'pixelvault-db';
const DB_VERSION = 1;
const STORAGE_KEY_DB_URL = 'pixelvault_db_url';
const STORAGE_KEY_SESSION = 'pixelvault_session_token';

let sqlInstance: NeonQueryFunction<false, false> | null = null;
let schemaSyncAttempted = false;
let isSchemaSyncing = false;

// Map snake_case database rows to camelCase TS objects
function mapRow<T>(row: any): T {
  if (!row) return row;
  const newRow: any = {};
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newRow[camelKey] = row[key];
  }
  // JSON fields parsing
  if (typeof newRow.metadata === 'string') newRow.metadata = JSON.parse(newRow.metadata);
  if (typeof newRow.settings === 'string') newRow.settings = JSON.parse(newRow.settings);
  if (typeof newRow.credentials === 'string') newRow.credentials = JSON.parse(newRow.credentials);
  if (typeof newRow.tags === 'string' && newRow.tags.startsWith('{')) {
    // PG array format {tag1,tag2} -> JS array
    newRow.tags = newRow.tags.replace(/[{}"]/g, '').split(',').filter(Boolean);
  }
  return newRow as T;
}

// ----------------------------------------------------------------------
// DATABASE CLIENT (Hybrid IDB + Neon)
// ----------------------------------------------------------------------

export const db = {
  // --- Config ---
  setDatabaseUrl: (url: string) => {
    if (!url) localStorage.removeItem(STORAGE_KEY_DB_URL);
    else localStorage.setItem(STORAGE_KEY_DB_URL, url);
    window.location.reload();
  },

  getDatabaseUrl: () => {
    if (typeof window !== 'undefined') {
      const persisted = localStorage.getItem(STORAGE_KEY_DB_URL);
      if (persisted) return persisted;
    }
    return import.meta.env.VITE_NEON_DB_URL || null;
  },
  isRealDb: () => !!db.getDatabaseUrl(),

  // --- SQL Client ---
  getSql: (): NeonQueryFunction<false, false> | null => {
    if (sqlInstance) return sqlInstance;

    const url = db.getDatabaseUrl();
    if (!url) return null;
    try {
      // Suppress browser warning - this is a prototype/dev setup
      sqlInstance = neon(url, {
        fetchOptions: {
          // @ts-ignore - Neon internal option to suppress browser warnings
          disableWarningInBrowsers: true
        }
      } as any);
      console.log('[TenantDB] SQL Client initialized (singleton)');

      // Attempt schema setup once
      if (!schemaSyncAttempted) {
        schemaSyncAttempted = true;
        setTimeout(() => {
          setupDatabaseSchema().catch((err: any) => {
            console.error('[TenantDB] Auto-schema setup failed:', err);
          });
        }, 0);
      }

      return sqlInstance;
    } catch (err) {
      console.error('[TenantDB] Failed to initialize SQL:', err);
      return null;
    }
  },

  // --- IDB Client ---
  getLocalDB: async (): Promise<IDBPDatabase> => {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db: any) {
        if (!db.objectStoreNames.contains('tenants')) db.createObjectStore('tenants', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('users')) {
          const s = db.createObjectStore('users', { keyPath: 'id' });
          s.createIndex('by-email', 'email', { unique: true });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          const s = db.createObjectStore('sessions', { keyPath: 'token' });
          s.createIndex('by-user', 'userId');
        }
        if (!db.objectStoreNames.contains('files')) {
          const s = db.createObjectStore('files', { keyPath: 'id' });
          s.createIndex('by-tenant', 'tenantId');
        }
        if (!db.objectStoreNames.contains('connections')) {
          const s = db.createObjectStore('connections', { keyPath: 'id' });
          s.createIndex('by-tenant', 'tenantId');
        }
        if (!db.objectStoreNames.contains('albums')) {
          const s = db.createObjectStore('albums', { keyPath: 'id' });
          s.createIndex('by-tenant', 'tenantId');
        }
        if (!db.objectStoreNames.contains('audit_logs')) {
          const s = db.createObjectStore('audit_logs', { keyPath: 'id' });
          s.createIndex('by-tenant', 'tenantId');
        }
      },
    });
  },

  // --------------------------------------------------------------------
  // CORE OPERATIONS
  // --------------------------------------------------------------------

  // --- Auth & Users ---
  async createUser(user: User) {
    const sql = db.getSql();
    if (sql) {
      await sql`
        INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at)
        VALUES (${user.id}, ${user.tenantId}, ${user.email}, ${user.passwordHash}, ${user.name}, ${user.role}, ${user.createdAt})
      `;
    } else {
      const d = await db.getLocalDB();
      await d.put('users', user);
    }
  },

  async createTenant(tenant: Tenant) {
    const sql = db.getSql();
    if (sql) {
      await sql`
        INSERT INTO tenants (id, name, slug, plan, max_storage_bytes, max_members, settings, created_at)
        VALUES (${tenant.id}, ${tenant.name}, ${tenant.slug}, ${tenant.plan}, ${tenant.maxStorageBytes}, ${tenant.maxMembers}, ${JSON.stringify(tenant.settings)}, ${tenant.createdAt})
      `;
    } else {
      const d = await db.getLocalDB();
      await d.put('tenants', tenant);
    }
  },

  async createSession(session: Session) {
    const sql = db.getSql();
    if (sql) {
      await sql`
        INSERT INTO sessions (id, user_id, tenant_id, token, expires_at, created_at)
        VALUES (${session.id}, ${session.userId}, ${session.tenantId}, ${session.token}, ${session.expiresAt}, ${session.createdAt})
      `;
    } else {
      const d = await db.getLocalDB();
      await d.put('sessions', session);
    }
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const sql = db.getSql();
    if (sql) {
      const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
      return mapRow<User>(rows[0]);
    } else {
      const d = await db.getLocalDB();
      return d.getFromIndex('users', 'by-email', email);
    }
  },

  async getSession(token: string): Promise<Session | undefined> {
    const sql = db.getSql();
    if (sql) {
      const rows = await sql`SELECT * FROM sessions WHERE token = ${token}`;
      return mapRow<Session>(rows[0]);
    } else {
      const d = await db.getLocalDB();
      return d.get('sessions', token);
    }
  },

  async deleteSession(token: string) {
    const sql = db.getSql();
    if (sql) await sql`DELETE FROM sessions WHERE token = ${token}`;
    else {
      const d = await db.getLocalDB();
      await d.delete('sessions', token);
    }
  },

  // --- Files ---
  async saveFile(file: FileRecord, userId?: string) {
    const sql = db.getSql();
    if (sql) {
      // Upsert
      await sql`
        INSERT INTO files (id, tenant_id, name, storage_key, storage_url, size_bytes, content_type, width, height, folder, metadata, uploaded_at, uploaded_by)
        VALUES (
          ${file.id}, ${file.tenantId}, ${file.name}, ${file.storageKey}, ${file.storageUrl}, 
          ${file.sizeBytes}, ${file.contentType}, ${file.width || null}, ${file.height || null}, 
          ${file.folder || '/'}, ${JSON.stringify(file.metadata)}, ${file.uploadedAt}, ${file.uploadedBy || userId || null}
        )
        ON CONFLICT (tenant_id, storage_key) DO UPDATE SET
          storage_url = EXCLUDED.storage_url,
          size_bytes = EXCLUDED.size_bytes,
          content_type = EXCLUDED.content_type,
          metadata = EXCLUDED.metadata,
          uploaded_at = EXCLUDED.uploaded_at
      `;
    } else {
      const d = await db.getLocalDB();
      await d.put('files', file);
    }

    // Log the upload
    await logAction(file.tenantId, userId, 'upload', file.name, { fileId: file.id });
  },

  async getTenantFileCount(tenantId: string, folder?: string): Promise<number> {
    const sql = db.getSql();
    if (sql) {
      console.log(`[TenantDB] getTenantFileCount(folder: ${folder || 'root'})`);
      if (folder) {
        const rows = await sql`SELECT COUNT(*)::int as count FROM files WHERE tenant_id = ${tenantId} AND (storage_key LIKE ${folder + '/%'} OR folder = ${folder})`;
        return rows[0].count;
      } else {
        // Root: Only count top-level (no slashes) since we'll discover folders separately or via representatives
        // To be safe and simple for pagination, let's count all files for now at Root, 
        // OR better, count root files + 1 per unique top-level folder.
        const res = await sql`
          SELECT 
            (SELECT COUNT(*)::int FROM files WHERE tenant_id = ${tenantId} AND storage_key NOT LIKE '%/%') +
            (SELECT COUNT(DISTINCT split_part(storage_key, '/', 1))::int FROM files WHERE tenant_id = ${tenantId} AND storage_key LIKE '%/%') 
          as total
        `;
        return res[0].total;
      }
    } else {
      const d = await db.getLocalDB();
      const files = await d.getAllFromIndex('files', 'by-tenant', tenantId);
      if (folder) {
        return files.filter(f => (f.storageKey && f.storageKey.startsWith(folder + '/')) || f.folder === folder).length;
      } else {
        return files.length; // Fallback to all for IDB
      }
    }
  },

  async getTenantFiles(tenantId: string, limit = 50, offset = 0, folder?: string): Promise<FileRecord[]> {
    const sql = db.getSql();
    if (sql) {
      console.log(`[TenantDB] getTenantFiles(folder: ${folder || 'root'}, offset: ${offset}, limit: ${limit})`);
      if (folder) {
        const rows = await sql`
          SELECT * FROM files 
          WHERE tenant_id = ${tenantId} 
          AND (storage_key LIKE ${folder + '/%'} OR folder = ${folder}) 
          ORDER BY uploaded_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
        return rows.map((r: any) => mapRow(r)) as FileRecord[];
      } else {
        // Smart Root Query: Fetch root files AND at least one file from each folder to allow folder discovery
        // We use a UNION to ensure we get both efficiently.
        // We only do this for the FIRST page (offset 0). Subsequent pages only get more root files.
        const rows = await sql`
          WITH root_files AS (
            SELECT * FROM files WHERE tenant_id = ${tenantId} AND storage_key NOT LIKE '%/%'
          ),
          folder_reps AS (
            SELECT DISTINCT ON (split_part(storage_key, '/', 1)) * 
            FROM files 
            WHERE tenant_id = ${tenantId} AND storage_key LIKE '%/%'
          )
          SELECT * FROM (
            SELECT * FROM root_files
            UNION ALL
            SELECT * FROM folder_reps WHERE ${offset} = 0 -- Only includes representatives on first page
          ) combined
          ORDER BY uploaded_at DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        return rows.map((r: any) => mapRow(r)) as FileRecord[];
      }
    } else {
      const d = await db.getLocalDB();
      const files = await d.getAllFromIndex('files', 'by-tenant', tenantId);
      let filtered = files;
      if (folder) {
        filtered = files.filter(f => (f.storageKey && f.storageKey.startsWith(folder + '/')) || f.folder === folder);
      }
      const sorted = filtered.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      return sorted.slice(offset, offset + limit);
    }
  },

  deleteFile: async (id: string, tenantId?: string, userId?: string) => {
    const sql = db.getSql();
    if (sql) {
      await sql`DELETE FROM files WHERE id = ${id} ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}`;
    } else {
      const d = await db.getLocalDB();
      if (tenantId) {
        const file = await d.get('files', id);
        if (file && file.tenantId !== tenantId) return;
      }
      await d.delete('files', id);
    }
    await logAction(tenantId || 'unknown', userId, 'delete', `File ID: ${id}`);
  },

  async renameFile(tenantId: string, fileId: string, newName: string, userId?: string) {
    const sql = db.getSql();
    if (sql) {
      await sql`UPDATE files SET name = ${newName} WHERE id = ${fileId} AND tenant_id = ${tenantId}`;
    } else {
      const d = await db.getLocalDB();
      const file = await d.get('files', fileId);
      if (file && file.tenantId === tenantId) {
        file.name = newName;
        await d.put('files', file);
      }
    }
    await logAction(tenantId, userId, 'rename', newName, { fileId });
  },

  async moveFiles(tenantId: string, fileIds: string[], newFolder: string, userId?: string) {
    const sql = db.getSql();
    if (sql) {
      // Create a parameterized query for the IN clause
      await sql`
        UPDATE files 
        SET folder = ${newFolder} 
        WHERE tenant_id = ${tenantId} 
        AND id = ANY(${fileIds})
      `;
    } else {
      const d = await db.getLocalDB();
      const tx = d.transaction('files', 'readwrite');
      const store = tx.objectStore('files');

      for (const id of fileIds) {
        const file = await store.get(id);
        if (file && file.tenantId === tenantId) {
          file.folder = newFolder;
          // Update path as well if we were doing true path-based storage, 
          // but for now folder is a display property used for grouping.
          // In a real S3 system, we'd need to copyObject + deleteObject.
          await store.put(file);
        }
      }
      await tx.done;
    }
    await logAction(tenantId, userId, 'move', newFolder, { count: fileIds.length, fileIds });
  },

  getTenantStats: async (tenantId: string): Promise<{ count: number; sizeBytes: number }> => {
    const sql = db.getSql();
    if (sql) {
      const rows = await sql`
        SELECT COUNT(*)::int as count, COALESCE(SUM(size_bytes), 0)::bigint as size
        FROM files 
        WHERE tenant_id = ${tenantId}
      `;
      return { count: rows[0].count, sizeBytes: rows[0].size };
    } else {
      const d = await db.getLocalDB();
      const files = await d.getAllFromIndex('files', 'by-tenant', tenantId);
      return {
        count: files.length,
        sizeBytes: files.reduce((s, f) => s + (f.sizeBytes || 0), 0)
      };
    }
  },

  // --- Connections ---
  async saveConnection(conn: StorageConnection, userId?: string) {
    const sql = db.getSql();
    console.log('[TenantDB] saveConnection attempt. SQL available:', !!sql);
    if (sql) {
      try {
        console.log('[TenantDB] Executing SQL INSERT for connection:', conn.id);
        await sql`
          INSERT INTO storage_connections (id, tenant_id, name, provider, credentials_encrypted, is_active, created_at, updated_at)
          VALUES (${conn.id}, ${conn.tenantId}, ${conn.name}, ${conn.provider}, ${JSON.stringify(conn.credentials)}, ${conn.isActive}, ${conn.createdAt}, ${conn.updatedAt})
          ON CONFLICT (id) DO UPDATE SET 
            name = EXCLUDED.name,
            provider = EXCLUDED.provider,
            credentials_encrypted = EXCLUDED.credentials_encrypted,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at
        `;
        console.log('[TenantDB] SQL INSERT successful');
        await logAction(conn.tenantId, userId, 'save_connection', conn.name, { provider: conn.provider });
      } catch (err) {
        console.error('[TenantDB] saveConnection SQL error:', err);
        throw err;
      }
    } else {
      console.warn('[TenantDB] SQL not available, falling back to IDB');
      const d = await db.getLocalDB();
      await d.put('connections', conn);
      await logAction(conn.tenantId, userId, 'save_connection', conn.name, { provider: conn.provider });
    }
  },

  async getTenantConnections(tenantId: string): Promise<StorageConnection[]> {
    const sql = db.getSql();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM storage_connections WHERE tenant_id = ${tenantId}`;
        return rows.map(r => {
          const rec = mapRow<any>(r);
          return {
            ...rec,
            credentials: rec.credentialsEncrypted ? JSON.parse(rec.credentialsEncrypted) : {}
          };
        }) as StorageConnection[];
      } catch (err) {
        console.error('[TenantDB] getTenantConnections SQL error:', err);
        return [];
      }
    } else {
      const d = await db.getLocalDB();
      const conns = await d.getAllFromIndex('connections', 'by-tenant', tenantId);
      // Fallback for demo: if no tenant specific conns, get all
      if (conns.length === 0) return await d.getAll('connections');
      return conns;
    }
  },

  // --- Albums ---
  async createAlbum(album: AlbumRecord) {
    const sql = db.getSql();
    if (sql) {
      await sql`
        INSERT INTO albums (id, tenant_id, name, created_at) 
        VALUES (${album.id}, ${album.tenantId}, ${album.name}, ${album.createdAt})
      `;
    } else {
      const d = await db.getLocalDB();
      await d.put('albums', album);
    }
  },

  async getTenantAlbums(tenantId: string): Promise<AlbumRecord[]> {
    const sql = db.getSql();
    if (sql) {
      const rows = await sql`SELECT * FROM albums WHERE tenant_id = ${tenantId}`;
      return rows.map(mapRow) as AlbumRecord[];
    } else {
      const d = await db.getLocalDB();
      return d.getAllFromIndex('albums', 'by-tenant', tenantId);
    }
  },

  async addFileToAlbum(albumId: string, fileId: string) {
    const sql = db.getSql();
    if (sql) {
      await sql`INSERT INTO album_files (album_id, file_id) VALUES (${albumId}, ${fileId}) ON CONFLICT DO NOTHING`;
    } else {
      const d = await db.getLocalDB();
      const album = await d.get('albums', albumId);
      if (album) {
        album.fileIds = [...(album.fileIds || []), fileId];
        await d.put('albums', album);
      }
    }
  },

  async deleteConnection(id: string, tenantId?: string, userId?: string) {
    const sql = db.getSql();
    if (sql) {
      await sql`DELETE FROM files WHERE connection_id = ${id} ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}`;
      await sql`DELETE FROM storage_connections WHERE id = ${id} ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}`;
    } else {
      const d = await db.getLocalDB();
      // @ts-ignore
      const conn = await d.get('connections', id);
      if (tenantId && conn && conn.tenantId !== tenantId) return;

      await d.delete('connections', id);
      const tx = d.transaction('files', 'readwrite');
      const index = tx.store.index('by-connection');
      const files = await index.getAll(id);
      await Promise.all(files.map(f => tx.store.delete(f.id)));
      await tx.done;
    }
    await logAction(tenantId || 'unknown', userId, 'delete_connection', `Conn ID: ${id}`);
  }
};

// ----------------------------------------------------------------------
// EXPORTED HELPER FUNCTIONS (API Adapters)
// ----------------------------------------------------------------------

export async function signup(req: SignupRequest): Promise<AuthResponse> {
  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const tenant: Tenant = {
    id: tenantId,
    name: req.teamName,
    slug: req.teamName.toLowerCase().replace(/\s+/g, '-'),
    plan: 'free',
    maxStorageBytes: PLAN_LIMITS.free.storage,
    maxMembers: PLAN_LIMITS.free.members,
    settings: {},
    createdAt: now,
    updatedAt: now
  };

  // Simple hash for demo
  const passwordHash = btoa(req.password);

  const user: User = {
    id: userId,
    tenantId,
    email: req.email,
    name: req.name,
    passwordHash,
    role: 'owner',
    createdAt: now
  };

  const session: Session = {
    id: sessionId,
    userId,
    tenantId,
    token: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now
  };

  await db.createTenant(tenant);
  await db.createUser(user);
  await db.createSession(session);

  return { user, tenant, session };
}

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const sql = db.getSql();
  if (sql) {
    const rows = await sql`SELECT id FROM tenants WHERE slug = ${slug}`;
    return rows.length === 0;
  } else {
    const d = await db.getLocalDB();
    const all = await d.getAll('tenants');
    return !all.some(t => t.slug === slug);
  }
}

export async function createTenantWithPlan(data: { name: string; slug: string; plan: string; userId: string }): Promise<Tenant> {
  const tenantId = crypto.randomUUID();
  const now = new Date().toISOString();

  const limits = (PLAN_LIMITS as any)[data.plan] || PLAN_LIMITS.free;

  const tenant: Tenant = {
    id: tenantId,
    name: data.name,
    slug: data.slug,
    plan: data.plan as any,
    maxStorageBytes: limits.storage,
    maxMembers: limits.members,
    settings: {},
    createdAt: now,
    updatedAt: now
  };

  await db.createTenant(tenant);

  // Link current user to this new tenant
  const sql = db.getSql();
  if (sql) {
    await sql`UPDATE users SET tenant_id = ${tenantId}, role = 'owner' WHERE id = ${data.userId}`;
  } else {
    const d = await db.getLocalDB();
    const user = await d.get('users', data.userId);
    if (user) {
      user.tenantId = tenantId;
      user.role = 'owner';
      await d.put('users', user);
    }
  }

  return tenant;
}

export async function login(req: LoginRequest): Promise<AuthResponse> {
  const user = await db.getUserByEmail(req.email);
  if (!user) throw new Error('User not found');

  if (user.passwordHash !== btoa(req.password)) throw new Error('Invalid password');

  // Create new session
  const session: Session = {
    id: crypto.randomUUID(),
    userId: user.id,
    tenantId: user.tenantId,
    token: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  await db.createSession(session);

  // Need to fetch tenant details
  // In IDB we use get('tenants', id), in SQL we use query.
  // Using the helper defined in core operations would be cleaner if exposed, 
  // but for now let's use a quick local helper or fetch logic.
  let tenant: Tenant | undefined;
  const sql = db.getSql();
  if (sql) {
    const rows = await sql`SELECT * FROM tenants WHERE id = ${user.tenantId}`;
    tenant = mapRow<Tenant>(rows[0]);
  } else {
    const d = await db.getLocalDB();
    tenant = await d.get('tenants', user.tenantId);
  }

  if (!tenant) throw new Error('Tenant not found');

  return { user, tenant, session };
}

export async function validateSession(token: string): Promise<AuthResponse | null> {
  const session = await db.getSession(token);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    await db.deleteSession(token);
    return null;
  }

  // Fetch User and Tenant
  let user: User | undefined;
  let tenant: Tenant | undefined;

  const sql = db.getSql();
  if (sql) {
    const uRows = await sql`SELECT * FROM users WHERE id = ${session.userId}`;
    user = mapRow<User>(uRows[0]);
    const tRows = await sql`SELECT * FROM tenants WHERE id = ${session.tenantId}`;
    tenant = mapRow<Tenant>(tRows[0]);
  } else {
    const d = await db.getLocalDB();
    user = await d.get('users', session.userId);
    tenant = await d.get('tenants', session.tenantId);
  }

  if (!user || !tenant) return null;
  return { user, tenant, session };
}

export async function logout(token: string) {
  await db.deleteSession(token);
  clearPersistedToken();
}

// --- LocalStorage Helpers ---
export function persistSessionToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_SESSION, token);
}

export function getPersistedToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SESSION) : null;
}

export function clearPersistedToken() {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY_SESSION);
}

// --- Encryption Helpers ---

const ENCRYPTION_KEY_SALT = 'pixelvault-v1'; // Logic: In prod, use a proper KDF or KMS

async function getEncryptionKey(tenantId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(`${ENCRYPTION_KEY_SALT}:${tenantId}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('salt'), // In prod, unique salt per tenant
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptCredentials(creds: object, tenantId: string): Promise<string> {
  try {
    const key = await getEncryptionKey(tenantId);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(creds));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Combine IV + Ciphertext (base64)
    const ivStr = btoa(String.fromCharCode(...iv));
    const dataStr = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    return `${ivStr}:${dataStr}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Failed to secure credentials');
  }
}

async function decryptCredentials(encryptedStr: string, tenantId: string): Promise<any> {
  try {
    // Legacy check: if it looks like JSON, return it directly (migration path)
    if (encryptedStr.trim().startsWith('{')) {
      return JSON.parse(encryptedStr);
    }

    const [ivStr, dataStr] = encryptedStr.split(':');
    if (!ivStr || !dataStr) throw new Error('Invalid format');

    const key = await getEncryptionKey(tenantId);
    const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (err) {
    console.warn('Decryption failed, assuming legacy plaintext or error:', err);
    // Fallback: try parsing as plain JSON just in case
    try {
      return JSON.parse(encryptedStr);
    } catch {
      return {}; // Return empty if truly failed
    }
  }
}

// --- Passthrough Exports for App.tsx compatibility ---
export const getTenantFiles = db.getTenantFiles.bind(db);
export const getTenantFileCount = db.getTenantFileCount.bind(db);

export const getTenantConnections = async (tenantId: string) => {
  const conns = await db.getTenantConnections(tenantId);
  // Decrypt credentials on the fly
  const decrypted = await Promise.all(conns.map(async c => {
    // If it's a string, try to decrypt/parse. If it's already an object (from local IDB), use valid JSON stringify
    // Check if it's the `credentialsEncrypted` field from SQL or IDB
    // The DB layer might return `credentials` as a string (if SQL) or object (if IDB).
    // Let's assume the DB layer normalizes it, but we need to handle the encryption layer.

    // Actually, `getTenantConnections` in DB layer returns `StorageConnection[]`.
    // We need to intercept and decrypt.

    // For IDB, it might be stored plain text. For SQL, it might be string.
    // Wait, the `StorageConnection` type has `credentials: StorageCredentials` (object).
    // Our `saveConnection` below converts it to string for `credentialsEncrypted`.
    // So when we fetch, we need to convert back.

    // NOTE: The `db.getTenantConnections` currently returns objects with `credentials` populated.
    // If we change `saveConnection` to store encrypted string in `credentials` or `credentialsEncrypted`, 
    // we need to adjust how `db.getTenantConnections` parses it.

    // Code inspection says `mapRow` parses JSON: 
    // `if (typeof newRow.credentials === 'string') newRow.credentials = JSON.parse(newRow.credentials);`
    // If we encrypt it, `JSON.parse` will fail or return a string? 
    // If it's "IV:DATA", JSON.parse might accept it if it's quoted? No.

    // We should treat `credentials` as the field to store encrypted string in the DB?
    // Or use `settings`?

    // The safest way without breaking SQLite/Postgres types: 
    // Store the encrypted string in the `credentials` column (which is generic JSON/Text).
    // `mapRow` attempts to `JSON.parse`. If it's not JSON, it might throw or leave it.

    // Let's handle it here in the bridge. 
    // Un-doing `JSON.parse` if it was auto-parsed? Or better, `mapRow` should return the string if encryption is on?

    // Let's assume `c.credentials` is currently the object.
    // If we save encrypted string:
    // `save`: credentials = "IV:CX"
    // `get` (mapRow): JSON.parse("IV:CX") -> throws SyntaxError.

    // So we need to wrap the encrypted string in a JSON object? 
    // e.g. { "encrypted": "IV:CX" }

    if ('encrypted' in (c.credentials as any)) {
      const encrypted = (c.credentials as any).encrypted;
      const decryptedParams = await decryptCredentials(encrypted, tenantId);
      return { ...c, credentials: decryptedParams };
    }

    return c;
  }));

  return decrypted;
};

export const saveStorageConnection = async (conn: StorageConnection, userId?: string) => {
  // Encrypt before saving
  const encryptedString = await encryptCredentials(conn.credentials, conn.tenantId);
  const secureConn = {
    ...conn,
    credentials: { encrypted: encryptedString } as any // Store wrapper
  };

  await db.saveConnection(secureConn, userId);

  // Return a record compatible with the app state (return DECRYPTED for UI usage)
  return {
    ...conn, // Use original unencrypted conn for return
    id: conn.id,
    tenantId: conn.tenantId,
    provider: conn.provider,
    credentialsEncrypted: JSON.stringify(conn.credentials), // Legacy field, keeping for now
    isActive: conn.isActive,
    metadata: conn.metadata || {},
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt
  } as unknown as StorageConnectionRecord;
};

export const activateConnection = async (id: string, tenantId: string, userId?: string) => {
  const conns = await db.getTenantConnections(tenantId);
  for (const c of conns) {
    const isActive = c.id === id;
    c.isActive = isActive;

    const sql = db.getSql();
    if (sql) {
      await sql`UPDATE storage_connections SET is_active = ${isActive} WHERE id = ${c.id}`;
    } else {
      const d = await db.getLocalDB();
      // @ts-ignore
      await d.put('connections', c);
    }

    if (isActive) {
      await logAction(tenantId, userId, 'activate_connection', c.name, { connectionId: id });
    }
  }
};

export const getActiveConnection = async (tenantId: string) => {
  const conns = await db.getTenantConnections(tenantId);
  return conns.find(c => c.isActive);
};

export const deleteConnection = async (id: string, tenantId?: string, userId?: string) => {
  await db.deleteConnection(id, tenantId, userId);
};

export const getTenantAlbums = db.getTenantAlbums;

// Update to return the album for state updates
export const createAlbum = async (album: AlbumRecord) => {
  await db.createAlbum(album);
  return album;
};

export const addFileToAlbum = db.addFileToAlbum;

export const cacheFilesForTenant = async (tenantId: string, files: FileRecord[], userId?: string) => {
  const sql = db.getSql();
  if (sql && files.length > 0) {
    console.log(`[TenantDB] Parallel saving ${files.length} files for tenant ${tenantId}`);
    // Process in parallel batches of 20 to avoid overwhelming the connection
    const batchSize = 20;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(batch.map(f => db.saveFile(f, userId).catch(err => {
        console.error('[TenantDB] Individual file cache failed:', err);
      })));
    }
  } else {
    for (const f of files) {
      await db.saveFile(f, userId);
    }
  }
  return files;
};

// Missing exports for saas-api.ts
export const addFileRecord = async (file: FileRecord, userId?: string) => {
  await db.saveFile(file, userId);
  return file;
};

export const deleteFileRecords = async (ids: string[], tenantId?: string, userId?: string) => {
  for (const id of ids) {
    await db.deleteFile(id, tenantId, userId);
  }
};

export const getTenantStats = db.getTenantStats;

export const saveAuditLog = async (log: AuditEntry) => {
  const sql = db.getSql();
  if (sql) {
    await sql`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, target, metadata, created_at)
      VALUES (${log.id}, ${log.tenantId}, ${log.userId}, ${log.action}, ${log.target}, ${JSON.stringify(log.metadata)}, ${log.createdAt})
    `;
  } else {
    const d = await db.getLocalDB();
    await d.put('audit_logs', log);
  }
};

export const logAction = async (tenantId: string, userId: string | undefined, action: string, target?: string, metadata: any = {}) => {
  const log: AuditEntry = {
    id: window.crypto.randomUUID(),
    tenantId,
    userId,
    action,
    target,
    metadata,
    createdAt: new Date().toISOString()
  };
  await saveAuditLog(log);
};

export const getAuditLogs = async (tenantId: string) => {
  const sql = db.getSql();
  if (sql) {
    const rows = await sql`SELECT * FROM audit_logs WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 50`;
    return rows.map(mapRow);
  } else {
    const d = await db.getLocalDB();
    return d.getAllFromIndex('audit_logs', 'by-tenant', tenantId);
  }
};

export const getAllTenants = async (): Promise<Tenant[]> => {
  const sql = db.getSql();
  if (sql) {
    const rows = await sql`SELECT * FROM tenants ORDER BY created_at DESC`;
    return rows.map(r => mapRow<Tenant>(r));
  } else {
    const d = await db.getLocalDB();
    return d.getAll('tenants');
  }
};

export const getGlobalAuditLogs = async (): Promise<AuditEntry[]> => {
  const sql = db.getSql();
  if (sql) {
    const rows = await sql`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`;
    return rows.map(r => mapRow<AuditEntry>(r));
  } else {
    const d = await db.getLocalDB();
    return d.getAll('audit_logs');
  }
};

export const getGlobalStats = async () => {
  const sql = db.getSql();
  if (sql) {
    const tenants = await sql`SELECT COUNT(*)::int as count FROM tenants`;
    const users = await sql`SELECT COUNT(*)::int as count FROM users`;
    const files = await sql`SELECT SUM(size_bytes)::bigint as size FROM files`;
    const conns = await sql`SELECT COUNT(*)::int as count FROM storage_connections WHERE is_active = true`;

    return {
      totalTenants: tenants[0].count,
      totalUsers: users[0].count,
      totalStorage: files[0].size || 0,
      activeConnections: conns[0].count
    };
  } else {
    const d = await db.getLocalDB();
    const tenants = await d.getAll('tenants');
    const users = await d.getAll('users');
    const files = await d.getAll('files');
    const conns = await d.getAll('connections');

    return {
      totalTenants: tenants.length,
      totalUsers: users.length,
      totalStorage: files.reduce((s, f) => s + (f.sizeBytes || 0), 0),
      activeConnections: conns.filter(c => c.isActive).length
    };
  }
};

export const renameFile = db.renameFile;
export const moveFiles = db.moveFiles;


/**
 * setupDatabaseSchema - Creates all required tables in Neon if they don't exist
 */
export async function setupDatabaseSchema() {
  if (isSchemaSyncing) return;
  const sql = db.getSql();
  if (!sql) return;

  isSchemaSyncing = true;
  console.log('[TenantDB] Ensuring cloud database schema exists (combined sync)...');

  try {
    // Run commands sequentially to avoid "cannot insert multiple commands into a prepared statement"
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

    await sql`CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      plan VARCHAR(50) DEFAULT 'free',
      max_storage_bytes BIGINT DEFAULT 1073741824,
      max_members INT DEFAULT 3,
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'member',
      avatar_url TEXT,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, email)
    )`;

    await sql`CREATE TABLE IF NOT EXISTS storage_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      credentials_encrypted TEXT NOT NULL,
      base_url TEXT,
      folder_path TEXT,
      is_active BOOLEAN DEFAULT false,
      last_sync_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      connection_id UUID,
      storage_key TEXT NOT NULL,
      storage_url TEXT NOT NULL,
      name VARCHAR(500) NOT NULL,
      content_type VARCHAR(255),
      size_bytes BIGINT DEFAULT 0,
      width INT,
      height INT,
      folder VARCHAR(500),
      tags TEXT[] DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      uploaded_by UUID,
      uploaded_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE(tenant_id, storage_key)
    )`;

    await sql`CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      user_id UUID,
      action VARCHAR(100) NOT NULL,
      target VARCHAR(255),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    // --- ROW LEVEL SECURITY (RLS) HARDENING ---
    // This adds a second layer of defense at the database level.
    const tables = ['tenants', 'users', 'storage_connections', 'files', 'audit_logs'];

    for (const table of tables) {
      // 1. Enable RLS on the table
      await sql.unsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);

      // 2. Drop existing policy if it exists (to ensure we have the latest version)
      await sql.unsafe(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table};`);

      // 3. Create the policy
      // We use current_setting('app.tenant_id', true) which returns NULL if the variable isn't set.
      // Tenants table is a bit special: we only allow access if the tenant_id matches OR if it's a superadmin (role check omitted for simplicity/security balance in this demo)
      if (table === 'tenants') {
        await sql.unsafe(`
          CREATE POLICY tenant_isolation_tenants ON tenants
          FOR ALL
          USING (id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);
        `);
      } else {
        await sql.unsafe(`
          CREATE POLICY tenant_isolation_${table} ON ${table}
          FOR ALL
          USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);
        `);
      }
    }

    console.log('[TenantDB] Cloud database schema verified/created successfully with RLS.');
  } catch (err) {
    console.error('[TenantDB] Schema sync failed:', err);
    // If it's a 500/Too many connections, we'll try again next load
    schemaSyncAttempted = false;
  } finally {
    isSchemaSyncing = false;
  }
}
