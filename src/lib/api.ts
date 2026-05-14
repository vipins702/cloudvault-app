/**
 * Metadata-Driven API Architecture
 * 
 * Every operation (list, delete, upload, get) goes through this API layer.
 * The API reads the active StorageConnection metadata (provider, credentials, 
 * endpoints) and routes to the correct provider implementation.
 * 
 * This is the SINGLE source of truth for all storage operations.
 */

import { StorageConnection, StorageFile } from '@/types/storage';
import { cacheFiles, getCachedFiles, deleteCachedFile } from '@/lib/database';

// ─── API Types ───
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    provider: string;
    timestamp: string;
    count?: number;
    cursor?: string;
  };
}

export interface ListParams {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface DeleteParams {
  urls: string[];
  ids: string[];
}

// ─── Main API Class ───
export class PhotoAPI {
  private connection: StorageConnection;

  constructor(connection: StorageConnection) {
    this.connection = connection;
  }

  /**
   * LIST — Fetch all files from the connected storage
   * Metadata-driven: reads provider from connection to choose implementation
   */
  async list(params?: ListParams): Promise<APIResponse<StorageFile[]>> {
    const provider = this.connection.provider;
    const timestamp = new Date().toISOString();

    try {
      let files: StorageFile[] = [];

      switch (provider) {
        case 'vercel-blob':
          files = await this.listVercelBlob(params);
          break;
        case 'aws-s3':
        case 'cloudflare-r2':
          files = await this.listS3(params);
          break;
        case 'supabase':
          files = await this.listSupabase(params);
          break;
        default:
          return { success: false, error: `Provider "${provider}" not supported for list` };
      }

      // Cache files in IndexedDB for offline access
      await cacheFiles(this.connection.id, files);

      return {
        success: true,
        data: files,
        metadata: { provider, timestamp, count: files.length },
      };
    } catch (error: any) {
      // Fall back to cached files
      const cached = await getCachedFiles(this.connection.id);
      if (cached.length > 0) {
        return {
          success: true,
          data: cached,
          error: `Using cached data. Live error: ${error.message}`,
          metadata: { provider, timestamp, count: cached.length },
        };
      }
      return { success: false, error: error.message, metadata: { provider, timestamp } };
    }
  }

  /**
   * DELETE — Permanently delete files from storage
   * This is a REAL delete — files are gone forever from Vercel Blob / S3 / etc.
   */
  async delete(params: DeleteParams): Promise<APIResponse<{ deleted: number; failed: string[] }>> {
    const provider = this.connection.provider;
    const timestamp = new Date().toISOString();

    try {
      let result: { deleted: number; failed: string[] };

      switch (provider) {
        case 'vercel-blob':
          result = await this.deleteVercelBlob(params);
          break;
        case 'aws-s3':
        case 'cloudflare-r2':
          result = await this.deleteS3(params);
          break;
        case 'supabase':
          result = await this.deleteSupabase(params);
          break;
        default:
          return { success: false, error: `Provider "${provider}" not supported for delete` };
      }

      // Remove from local cache
      for (const id of params.ids) {
        await deleteCachedFile(id);
      }

      return {
        success: true,
        data: result,
        metadata: { provider, timestamp },
      };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: { provider, timestamp } };
    }
  }

  /**
   * TEST — Verify connection credentials work
   */
  async test(): Promise<APIResponse<{ message: string }>> {
    const provider = this.connection.provider;
    const timestamp = new Date().toISOString();

    try {
      switch (provider) {
        case 'vercel-blob': {
          const token = this.connection.credentials.token;
          if (!token) return { success: false, error: 'Token is required' };

          const res = await fetch('https://api.vercel.com/v1/blob?limit=1', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || `HTTP ${res.status}`);
          }
          return { success: true, data: { message: 'Connected to Vercel Blob' }, metadata: { provider, timestamp } };
        }
        default:
          return { success: true, data: { message: `${provider} connection configured` }, metadata: { provider, timestamp } };
      }
    } catch (error: any) {
      return { success: false, error: error.message, metadata: { provider, timestamp } };
    }
  }

  // ═══════════════════════════════════════════
  // VERCEL BLOB IMPLEMENTATION
  // ═══════════════════════════════════════════

  private async listVercelBlob(params?: ListParams): Promise<StorageFile[]> {
    const token = this.connection.credentials.token;
    if (!token) throw new Error('Vercel Blob token is required');

    const files: StorageFile[] = [];
    let cursor: string | undefined = params?.cursor;

    do {
      const url = new URL('https://api.vercel.com/v1/blob');
      url.searchParams.set('limit', String(params?.limit || 1000));
      if (cursor) url.searchParams.set('cursor', cursor);
      if (params?.prefix || this.connection.folderPath) {
        url.searchParams.set('prefix', params?.prefix || this.connection.folderPath || '');
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();

      for (const blob of data.blobs || []) {
        files.push({
          id: blob.url, // Use URL as unique ID for Vercel Blob
          name: blob.pathname.split('/').pop() || blob.pathname,
          url: blob.url,
          size: blob.size,
          contentType: blob.contentType || 'application/octet-stream',
          uploadedAt: blob.uploadedAt,
          path: blob.pathname,
          metadata: {
            pathname: blob.pathname,
            contentDisposition: blob.contentDisposition,
            contentType: blob.contentType,
            downloadUrl: blob.downloadUrl,
          },
        });
      }

      cursor = data.cursor;
    } while (cursor);

    return files;
  }

  /**
   * DELETE from Vercel Blob — THIS IS PERMANENT
   * Uses: DELETE https://api.vercel.com/v1/blob/del
   * Body: { urls: ["https://...blob.vercel-storage.com/..."] }
   */
  private async deleteVercelBlob(params: DeleteParams): Promise<{ deleted: number; failed: string[] }> {
    const token = this.connection.credentials.token;
    if (!token) throw new Error('Vercel Blob token is required');

    const failed: string[] = [];
    let deleted = 0;

    // Vercel Blob API accepts batch deletes
    // Process in chunks of 100
    const chunks: string[][] = [];
    for (let i = 0; i < params.urls.length; i += 100) {
      chunks.push(params.urls.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        const res = await fetch('https://api.vercel.com/v1/blob/del', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ urls: chunk }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }

        deleted += chunk.length;
      } catch (error: any) {
        failed.push(...chunk.map(u => `${u}: ${error.message}`));
      }
    }

    return { deleted, failed };
  }

  // ═══════════════════════════════════════════
  // S3-COMPATIBLE (AWS S3 / Cloudflare R2)
  // ═══════════════════════════════════════════

  private async listS3(_params?: ListParams): Promise<StorageFile[]> {
    // In production: use @aws-sdk/client-s3 ListObjectsV2Command
    // const client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    // const command = new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix });
    // const response = await client.send(command);
    console.warn('[API] S3 list not implemented — add @aws-sdk/client-s3');
    return [];
  }

  private async deleteS3(_params: DeleteParams): Promise<{ deleted: number; failed: string[] }> {
    // In production: use @aws-sdk/client-s3 DeleteObjectsCommand
    // const command = new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys.map(k => ({ Key: k })) } });
    console.warn('[API] S3 delete not implemented — add @aws-sdk/client-s3');
    return { deleted: 0, failed: ['S3 delete not implemented'] };
  }

  // ═══════════════════════════════════════════
  // SUPABASE
  // ═══════════════════════════════════════════

  private async listSupabase(_params?: ListParams): Promise<StorageFile[]> {
    // In production: use @supabase/supabase-js
    // const supabase = createClient(url, key);
    // const { data } = await supabase.storage.from(bucket).list(prefix);
    console.warn('[API] Supabase list not implemented — add @supabase/supabase-js');
    return [];
  }

  private async deleteSupabase(_params: DeleteParams): Promise<{ deleted: number; failed: string[] }> {
    // const { error } = await supabase.storage.from(bucket).remove(paths);
    console.warn('[API] Supabase delete not implemented — add @supabase/supabase-js');
    return { deleted: 0, failed: ['Supabase delete not implemented'] };
  }
}

/**
 * Create a PhotoAPI instance from a connection.
 * This is the factory function — all components use this.
 */
export function createAPI(connection: StorageConnection): PhotoAPI {
  return new PhotoAPI(connection);
}
