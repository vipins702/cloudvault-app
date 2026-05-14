/**
 * ═══════════════════════════════════════════════════════════════
 *  NEON POSTGRESQL SCHEMA — Multi-Tenant SaaS Photo Vault
 * ═══════════════════════════════════════════════════════════════
 * 
 * This file defines the complete data model for the SaaS app.
 * 
 * In production, you'd run these as Neon migrations via Prisma or Drizzle.
 * For this client-side demo, we simulate the schema in IndexedDB
 * with the same structure, so migration to Neon is copy-paste.
 * 
 * NEON SQL (run this in your Neon console to create tables):
 * 
 * ```sql
 * -- Enable UUID generation
 * CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 * 
 * -- ═══ TENANTS ═══
 * CREATE TABLE tenants (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name VARCHAR(255) NOT NULL,
 *   slug VARCHAR(100) UNIQUE NOT NULL,
 *   plan VARCHAR(50) DEFAULT 'free',  -- free | pro | enterprise
 *   max_storage_bytes BIGINT DEFAULT 1073741824,  -- 1GB default
 *   max_members INT DEFAULT 3,
 *   settings JSONB DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- ═══ USERS ═══
 * CREATE TABLE users (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *   email VARCHAR(255) NOT NULL,
 *   name VARCHAR(255),
 *   password_hash VARCHAR(255) NOT NULL,
 *   role VARCHAR(50) DEFAULT 'member',  -- owner | admin | member | viewer
 *   avatar_url TEXT,
 *   last_login_at TIMESTAMPTZ,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(tenant_id, email)
 * );
 * CREATE INDEX idx_users_email ON users(email);
 * CREATE INDEX idx_users_tenant ON users(tenant_id);
 * 
 * -- ═══ SESSIONS ═══
 * CREATE TABLE sessions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *   token VARCHAR(255) UNIQUE NOT NULL,
 *   expires_at TIMESTAMPTZ NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX idx_sessions_token ON sessions(token);
 * 
 * -- ═══ STORAGE CONNECTIONS ═══
 * CREATE TABLE storage_connections (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *   name VARCHAR(255) NOT NULL,
 *   provider VARCHAR(50) NOT NULL,  -- vercel-blob | aws-s3 | gcs | supabase | r2
 *   credentials_encrypted TEXT NOT NULL,  -- AES-256 encrypted JSON
 *   base_url TEXT,
 *   folder_path TEXT,
 *   is_active BOOLEAN DEFAULT false,
 *   last_sync_at TIMESTAMPTZ,
 *   metadata JSONB DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX idx_connections_tenant ON storage_connections(tenant_id);
 * 
 * -- ═══ FILES (metadata cache) ═══
 * CREATE TABLE files (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *   connection_id UUID REFERENCES storage_connections(id) ON DELETE SET NULL,
 *   storage_key TEXT NOT NULL,  -- path/key in storage provider
 *   storage_url TEXT NOT NULL,  -- public or signed URL
 *   name VARCHAR(500) NOT NULL,
 *   content_type VARCHAR(255),
 *   size_bytes BIGINT DEFAULT 0,
 *   width INT,
 *   height INT,
 *   folder VARCHAR(500),
 *   tags TEXT[] DEFAULT '{}',
 *   metadata JSONB DEFAULT '{}',
 *   uploaded_by UUID REFERENCES users(id),
 *   uploaded_at TIMESTAMPTZ DEFAULT NOW(),
 *   deleted_at TIMESTAMPTZ,  -- soft delete
 *   UNIQUE(tenant_id, storage_key)
 * );
 * CREATE INDEX idx_files_tenant ON files(tenant_id);
 * CREATE INDEX idx_files_folder ON files(tenant_id, folder);
 * CREATE INDEX idx_files_type ON files(tenant_id, content_type);
 * CREATE INDEX idx_files_uploaded ON files(tenant_id, uploaded_at DESC);
 * 
 * -- ═══ ALBUMS ═══
 * CREATE TABLE albums (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *   name VARCHAR(255) NOT NULL,
 *   description TEXT,
 *   cover_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
 *   created_by UUID REFERENCES users(id),
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX idx_albums_tenant ON albums(tenant_id);
 * 
 * -- ═══ ALBUM FILES (junction) ═══
 * CREATE TABLE album_files (
 *   album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
 *   file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
 *   added_at TIMESTAMPTZ DEFAULT NOW(),
 *   PRIMARY KEY (album_id, file_id)
 * );
 * 
 * -- ═══ AUDIT LOGS ═══
 * CREATE TABLE audit_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *   user_id UUID REFERENCES users(id),
 *   action VARCHAR(100) NOT NULL,
 *   target VARCHAR(255),
 *   metadata JSONB DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, created_at DESC);
 * 
 * -- ═══ ROW-LEVEL SECURITY (for Neon + Supabase compat) ═══
 * ALTER TABLE files ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE storage_connections ENABLE ROW LEVEL SECURITY;
 * 
 * -- Tenant isolation policies
 * CREATE POLICY tenant_files ON files
 *   USING (tenant_id = current_setting('app.tenant_id')::UUID);
 * CREATE POLICY tenant_albums ON albums
 *   USING (tenant_id = current_setting('app.tenant_id')::UUID);
 * CREATE POLICY tenant_connections ON storage_connections
 *   USING (tenant_id = current_setting('app.tenant_id')::UUID);
 * ```
 */

// ═══ TypeScript Types matching the Neon schema ═══

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  maxStorageBytes: number;
  maxMembers: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'superadmin';
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface StorageConnectionRecord {
  id: string;
  tenantId: string;
  name: string;
  provider: 'vercel-blob' | 'aws-s3' | 'gcs' | 'supabase' | 'cloudflare-r2' | 'local';
  credentialsEncrypted: string; // In production: AES-256 encrypted
  baseUrl?: string;
  folderPath?: string;
  isActive: boolean;
  lastSyncAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  id: string;
  tenantId: string;
  connectionId?: string;
  storageKey: string;
  storageUrl: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  folder?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  uploadedBy?: string;
  uploadedAt: string;
  deletedAt?: string; // soft delete
}

export interface AlbumRecord {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  coverFileId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  fileIds: string[]; // denormalized for client-side
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  target?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══ API request/response types ═══

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  teamName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tenant: Tenant;
  session: Session;
}

// Plan limits
export const PLAN_LIMITS: Record<string, { storage: number; members: number; connections: number }> = {
  free: { storage: 1 * 1024 * 1024 * 1024, members: 3, connections: 1 },
  pro: { storage: 50 * 1024 * 1024 * 1024, members: 10, connections: 5 },
  enterprise: { storage: 500 * 1024 * 1024 * 1024, members: 100, connections: 20 },
};
