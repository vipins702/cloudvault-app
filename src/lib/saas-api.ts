/**
 * ═══════════════════════════════════════════════════════════════
 *  SAAS API — Metadata-Driven, Tenant-Scoped Storage Operations
 * ═══════════════════════════════════════════════════════════════
 * 
 * This API layer handles ALL storage operations. Every call:
 * 1. Checks tenant context (who's calling)
 * 2. Reads connection metadata (which provider)
 * 3. Routes to correct implementation
 * 4. Caches results in tenant-scoped file table
 * 
 * Production: These become API routes:
 *   POST /api/files/list   → SaaSAPI.listFiles()
 *   POST /api/files/delete → SaaSAPI.deleteFiles()  
 *   POST /api/files/upload → SaaSAPI.uploadFiles()
 *   POST /api/files/sync   → SaaSAPI.syncFromStorage()
 */

import { StorageConnectionRecord, FileRecord } from '@/types/schema';
import {
  cacheFilesForTenant,
  deleteFileRecords,
  addFileRecord,
  saveAuditLog,
} from './tenant-db';

export interface SaaSAPIContext {
  tenantId: string;
  userId: string;
  connection: StorageConnectionRecord;
}

export interface APIResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    provider: string;
    tenantId: string;
    timestamp: string;
    count?: number;
  };
}

export class SaaSAPI {
  public ctx: SaaSAPIContext;

  constructor(ctx: SaaSAPIContext) {
    this.ctx = ctx;
  }

  private getCredentials(): Record<string, string> {
    try {
      return JSON.parse(this.ctx.connection.credentialsEncrypted);
    } catch {
      return {};
    }
  }

  /**
   * Fetch with timeout to prevent hanging requests
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Retry fetch with exponential backoff
   */
  private async retryFetch(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await this.fetchWithTimeout(url, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`[SaaSAPI] Fetch attempt ${attempt + 1}/${retries} failed:`, lastError.message);

        if (attempt < retries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  private async logAction(action: string, target: string, metadata: any = {}) {
    try {
      await saveAuditLog({
        id: crypto.randomUUID(),
        tenantId: this.ctx.tenantId,
        userId: this.ctx.userId,
        action,
        target,
        metadata: {
          provider: this.ctx.connection.provider,
          ...metadata
        },
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('[SaaSAPI] Failed to save audit log:', err);
    }
  }

  /**
   * SYNC — Pull all files from storage provider into tenant's file table
   */
  async syncFromStorage(): Promise<APIResult<FileRecord[]>> {
    const provider = this.ctx.connection.provider;
    const timestamp = new Date().toISOString();

    console.log('[SaaSAPI] syncFromStorage starting for provider:', provider, 'tenant:', this.ctx.tenantId);

    try {
      let rawFiles: Omit<FileRecord, 'id' | 'tenantId'>[] = [];

      switch (provider) {
        case 'vercel-blob':
          console.log('[SaaSAPI] Listing Vercel Blob files...');
          rawFiles = await this.listVercelBlob();
          console.log('[SaaSAPI] Listed', rawFiles.length, 'files from Vercel Blob');
          break;
        case 'aws-s3':
        case 'cloudflare-r2':
          rawFiles = await this.listS3();
          break;
        case 'supabase':
          rawFiles = await this.listSupabase();
          break;
        case 'local':
          rawFiles = await this.listLocal();
          break;
        default:
          console.error('[SaaSAPI] Provider not supported:', provider);
          return { success: false, error: `Provider "${provider}" not supported` };
      }

      if (rawFiles.length === 0) {
        console.warn('[SaaSAPI] No files returned from provider');
      }

      const filesWithIds = rawFiles.map(f => ({
        ...f,
        id: crypto.randomUUID(),
        tenantId: this.ctx.tenantId
      })) as FileRecord[];

      console.log('[SaaSAPI] Caching', filesWithIds.length, 'files for tenant:', this.ctx.tenantId);
      const records = await cacheFilesForTenant(this.ctx.tenantId, filesWithIds, this.ctx.userId);

      await this.logAction('SYNC_FILES', 'storage', { success: true, count: records.length });

      console.log('[SaaSAPI] Sync complete, returning', records.length, 'records');
      return {
        success: true,
        data: records,
        metadata: {
          provider,
          tenantId: this.ctx.tenantId,
          timestamp,
          count: records.length,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      console.error('[SaaSAPI] Sync failed with error:', message);
      await this.logAction('SYNC_FILES', 'storage', { success: false, error: message });
      return { success: false, error: message, metadata: { provider, tenantId: this.ctx.tenantId, timestamp } };
    }
  }

  /**
   * DELETE — Permanently remove files from storage AND tenant's file table
   */
  async deleteFiles(fileIds: string[], urls: string[]): Promise<APIResult<{ deleted: number; failed: string[] }>> {
    const provider = this.ctx.connection.provider;
    const timestamp = new Date().toISOString();

    try {
      let result: { deleted: number; failed: string[] };

      switch (provider) {
        case 'vercel-blob':
          result = await this.deleteVercelBlob(urls);
          break;
        case 'aws-s3':
        case 'cloudflare-r2':
          result = await this.deleteS3(fileIds);
          break;
        case 'supabase':
          result = await this.deleteSupabase(fileIds);
          break;
        default:
          return { success: false, error: `Provider "${provider}" not supported for delete` };
      }

      await deleteFileRecords(fileIds, this.ctx.tenantId, this.ctx.userId);
      await this.logAction('DELETE_FILES', fileIds.join(','), { success: true, count: fileIds.length });

      return {
        success: true,
        data: result,
        metadata: { provider, tenantId: this.ctx.tenantId, timestamp },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      await this.logAction('DELETE_FILES', fileIds.join(','), { success: false, error: message });
      return { success: false, error: message, metadata: { provider, tenantId: this.ctx.tenantId, timestamp } };
    }
  }

  /**
   * UPLOAD — Upload file to storage provider and record in tenant's file table
   */
  async uploadFile(file: File, folder?: string, metadata: Record<string, any> = {}): Promise<APIResult<FileRecord>> {
    const provider = this.ctx.connection.provider;
    const timestamp = new Date().toISOString();

    try {
      let storageUrl: string;
      let storageKey: string;

      switch (provider) {
        case 'vercel-blob': {
          const uploadResult = await this.uploadVercelBlob(file, folder);
          storageUrl = uploadResult.url;
          storageKey = uploadResult.pathname;
          break;
        }
        default:
          return { success: false, error: `Upload not implemented for "${provider}"` };
      }

      const record = await addFileRecord({
        id: crypto.randomUUID(),
        tenantId: this.ctx.tenantId,
        connectionId: this.ctx.connection.id,
        storageKey,
        storageUrl,
        name: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        folder: folder || 'Uploads',
        tags: [],
        metadata: { ...metadata, source: 'upload' },
        uploadedBy: this.ctx.userId,
        uploadedAt: timestamp,
      }, this.ctx.userId);

      await this.logAction('UPLOAD_FILE', file.name, { success: true, size: file.size });

      return {
        success: true,
        data: record,
        metadata: { provider, tenantId: this.ctx.tenantId, timestamp },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      await this.logAction('UPLOAD_FILE', file.name, { success: false, error: message });
      return { success: false, error: message, metadata: { provider, tenantId: this.ctx.tenantId, timestamp } };
    }
  }

  /**
   * DOWNLOAD — Fetch file content as a Blob for transfers/previews
   */
  async downloadAsBlob(url: string): Promise<Blob> {
    const response = await this.retryFetch(url);
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
    return await response.blob();
  }

  /**
   * TEST — Verify connection credentials
   */
  async testConnection(): Promise<APIResult<{ message: string }>> {
    const provider = this.ctx.connection.provider;
    const timestamp = new Date().toISOString();

    try {
      switch (provider) {
        case 'vercel-blob': {
          const creds = this.getCredentials();
          // Sanitize token
          const rawToken = creds.token || '';
          const match = rawToken.match(/(vercel_blob_[a-zA-Z0-9_]+)/);
          const token = match ? match[1] : rawToken.trim();

          if (!token) return { success: false, error: 'Token is required' };

          // Use Local Vite Proxy with retry logic
          const res = await this.retryFetch('/api/vercel-blob?v=1', {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-api-version': '1',
            },
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || `HTTP ${res.status}`);
          }
          return {
            success: true,
            data: { message: 'Connected to Vercel Blob successfully' },
            metadata: { provider, tenantId: this.ctx.tenantId, timestamp },
          };
        }
        default:
          return {
            success: true,
            data: { message: `${provider} connection configured` },
            metadata: { provider, tenantId: this.ctx.tenantId, timestamp },
          };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      return { success: false, error: message, metadata: { provider, tenantId: this.ctx.tenantId, timestamp } };
    }
  }

  /**
   * HEALTH — Check storage health and return status
   */
  async checkHealth(): Promise<APIResult<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }>> {
    const start = Date.now();
    const test = await this.testConnection();
    const latencyMs = Date.now() - start;

    await this.logAction('HEALTH_CHECK', 'connection', { success: test.success, latencyMs });

    return {
      success: true,
      data: {
        status: test.success ? 'healthy' : 'down',
        latencyMs,
      },
      metadata: {
        provider: this.ctx.connection.provider,
        tenantId: this.ctx.tenantId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ═══════════════════════════════════════════
  // VERCEL BLOB IMPLEMENTATION
  // ═══════════════════════════════════════════

  private async listVercelBlob(): Promise<Omit<FileRecord, 'id' | 'tenantId'>[]> {
    const creds = this.getCredentials();
    // Sanitize token
    const rawToken = creds.token || '';
    const match = rawToken.match(/(vercel_blob_[a-zA-Z0-9_]+)/);
    const token = match ? match[1] : rawToken.trim();

    if (!token) throw new Error('Vercel Blob token is required');

    const files: Omit<FileRecord, 'id' | 'tenantId'>[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL('https://blob.vercel-storage.com?v=1');
      url.searchParams.set('limit', '1000');
      if (cursor) url.searchParams.set('cursor', cursor);
      if (this.ctx.connection.folderPath) {
        url.searchParams.set('prefix', this.ctx.connection.folderPath);
      }

      // Use Local Vite Proxy with retry logic
      const proxyUrl = url.toString().replace('https://blob.vercel-storage.com', '/api/vercel-blob');

      const res = await this.retryFetch(proxyUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-version': '1',
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[SaaSAPI] Vercel Blob list error:', errText);
        try {
          const err = JSON.parse(errText);
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        } catch {
          throw new Error(`HTTP ${res.status}`);
        }
      }

      const data = await res.json();

      for (const blob of data.blobs || []) {
        const pathParts = (blob.pathname || '').split('/').filter(Boolean);
        files.push({
          connectionId: this.ctx.connection.id,
          storageKey: blob.pathname, // This is crucial for Photo.path
          storageUrl: blob.url,
          name: pathParts.pop() || blob.pathname,
          contentType: blob.contentType || 'application/octet-stream',
          sizeBytes: blob.size || 0,
          // After pop(), pathParts contains the folder path. Check length > 0 for nested folders.
          folder: pathParts.length > 0 ? pathParts[0] : (this.ctx.connection.name || 'Root'),
          tags: [],
          metadata: {
            pathname: blob.pathname,
            contentDisposition: blob.contentDisposition,
            downloadUrl: blob.downloadUrl,
          },
          uploadedBy: this.ctx.userId,
          uploadedAt: blob.uploadedAt || new Date().toISOString(),
        });
      }

      cursor = data.cursor;
    } while (cursor);

    return files;
  }

  private async deleteVercelBlob(urls: string[]): Promise<{ deleted: number; failed: string[] }> {
    const creds = this.getCredentials();
    // Sanitize token
    const rawToken = creds.token || '';
    const match = rawToken.match(/(vercel_blob_[a-zA-Z0-9_]+)/);
    const token = match ? match[1] : rawToken.trim();

    if (!token) throw new Error('Vercel Blob token is required');

    const failed: string[] = [];
    let deleted = 0;

    for (let i = 0; i < urls.length; i += 100) {
      const chunk = urls.slice(i, i + 100);
      try {
        // Use Local Vite Proxy
        const res = await fetch('/api/vercel-blob/delete?v=1', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-api-version': '1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ urls: chunk }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }

        deleted += chunk.length;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failed.push(...chunk.map(u => `${u}: ${message}`));
      }
    }

    return { deleted, failed };
  }

  private async uploadVercelBlob(file: File, folder?: string): Promise<{ url: string; pathname: string }> {
    const creds = this.getCredentials();
    // Sanitize token
    const rawToken = creds.token || '';
    const match = rawToken.match(/(vercel_blob_[a-zA-Z0-9_]+)/);
    const token = match ? match[1] : rawToken.trim();

    if (!token) throw new Error('Vercel Blob token is required');

    const pathname = folder ? `${folder}/${file.name}` : file.name;

    // Use Local Vite Proxy
    const res = await fetch(`/api/vercel-blob/${encodeURIComponent(pathname)}?v=1`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-version': '1',
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Upload failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    return { url: data.url, pathname: data.pathname };
  }

  private async listLocal(): Promise<Omit<FileRecord, 'id' | 'tenantId'>[]> {
    // Note: Browser File System Access API requires user gesture.
    // UI should call this when user clicks "Sync" or "Select Folder".
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      const files: Omit<FileRecord, 'id' | 'tenantId'>[] = [];

      const processHandle = async (currentHandle: any, currentPath: string = '') => {
        // @ts-ignore
        for await (const entry of currentHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
              files.push({
                connectionId: this.ctx.connection.id,
                storageKey: `${currentPath}${entry.name}`,
                storageUrl: URL.createObjectURL(file), // Limited persistence
                name: entry.name,
                contentType: file.type,
                sizeBytes: file.size,
                folder: currentPath || this.ctx.connection.name || 'Local',
                tags: [],
                metadata: { source: 'local-filesystem', lastModified: file.lastModified },
                uploadedBy: this.ctx.userId,
                uploadedAt: new Date(file.lastModified).toISOString(),
              });
            }
          } else if (entry.kind === 'directory') {
            await processHandle(entry, `${currentPath}${entry.name}/`);
          }
        }
      };

      await processHandle(handle);
      return files;
    } catch (err: any) {
      if (err.name === 'AbortError') return [];
      throw err;
    }
  }

  private async listS3(): Promise<Omit<FileRecord, 'id' | 'tenantId'>[]> {
    console.warn('[SaaSAPI] S3 list not implemented');
    return [];
  }

  private async deleteS3(_fileIds: string[]): Promise<{ deleted: number; failed: string[] }> {
    console.warn('[SaaSAPI] S3 delete not implemented');
    return { deleted: 0, failed: ['S3 delete not implemented'] };
  }

  private async listSupabase(): Promise<Omit<FileRecord, 'id' | 'tenantId'>[]> {
    console.warn('[SaaSAPI] Supabase list not implemented');
    return [];
  }

  private async deleteSupabase(_fileIds: string[]): Promise<{ deleted: number; failed: string[] }> {
    console.warn('[SaaSAPI] Supabase delete not implemented');
    return { deleted: 0, failed: ['Supabase delete not implemented'] };
  }
}

export function createSaaSAPI(ctx: SaaSAPIContext): SaaSAPI {
  return new SaaSAPI(ctx);
}
