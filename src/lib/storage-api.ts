import { StorageConnection, StorageFile, StorageSyncResult } from '@/types/storage';
import { cacheFilesForTenant as cacheFiles } from './tenant-db';

// Test connection and return basic metadata
export async function testConnection(connection: StorageConnection): Promise<{ success: boolean; message: string; metadata?: any }> {
  try {
    switch (connection.provider) {
      case 'vercel-blob':
        return await testVercelBlob(connection);
      case 'aws-s3':
      case 'cloudflare-r2':
        return await testS3Connection(connection);
      case 'gcs':
        return await testGCSConnection(connection);
      case 'supabase':
        return await testSupabaseConnection(connection);
      case 'local':
        return { success: true, message: 'Local file access ready' };
      default:
        return { success: false, message: 'Unknown provider' };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Connection test failed'
    };
  }
}

// Sync files from storage
export async function syncFiles(connection: StorageConnection): Promise<StorageSyncResult> {
  try {
    let files: StorageFile[] = [];

    switch (connection.provider) {
      case 'vercel-blob':
        files = await syncVercelBlob(connection);
        break;
      case 'aws-s3':
      case 'cloudflare-r2':
        files = await syncS3Files(connection);
        break;
      case 'gcs':
        files = await syncGCSFiles(connection);
        break;
      case 'supabase':
        files = await syncSupabaseFiles(connection);
        break;
      case 'local':
        // Local files are handled via File API, not synced
        return {
          success: true,
          files: [],
          timestamp: new Date().toISOString(),
          error: 'Local files are browsed directly'
        };
    }

    console.log('[StorageAPI] Syncing', files.length, 'files for tenant:', connection.tenantId);
    // Cache files in database
    await cacheFiles(connection.tenantId, files as any);

    return {
      success: true,
      files,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      files: [],
      error: error.message || 'Sync failed',
      timestamp: new Date().toISOString(),
    };
  }
}

// ==================== Vercel Blob Implementation ====================

async function testVercelBlob(connection: StorageConnection): Promise<{ success: boolean; message: string; metadata?: any }> {
  // Sanitize token: find the part starting with vercel_blob_
  const rawToken = connection.credentials.token || '';
  const match = rawToken.match(/(vercel_blob_[a-zA-Z0-9_]+)/);
  const token = match ? match[1] : rawToken.trim();

  if (!token || !token.startsWith('vercel_blob_')) {
    return { success: false, message: 'Invalid Token format. It must start with "vercel_blob_..."' };
  }

  try {
    // Try to list blobs with a limit of 1 to test connectivity
    console.log('[StorageAPI] Testing Vercel Blob with token:', token.substring(0, 10) + '...');
    // Use Local Vite Proxy (configured in vite.config.ts)
    const proxyUrl = '/api/vercel-blob?v=1';
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-version': '1',
      },
    });

    console.log('[StorageAPI] Vercel Blob response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[StorageAPI] Vercel Blob error body:', errorText);
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error?.message || `Failed to connect (Status ${response.status})`);
      } catch {
        throw new Error(`Failed to connect (Status ${response.status})`);
      }
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Connected to Vercel Blob successfully',
      metadata: { blobs: data.blobs?.length || 0 }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function syncVercelBlob(connection: StorageConnection): Promise<StorageFile[]> {
  // Sanitize token: find the part starting with vercel_blob_
  const rawToken = connection.credentials.token || '';
  const match = rawToken.match(/(vercel_blob_[a-zA-Z0-9_]+)/);
  const token = match ? match[1] : rawToken.trim();

  if (!token) throw new Error('Token is required');
  if (!token.startsWith('vercel_blob_')) {
    throw new Error(`Invalid Token format. Expected "vercel_blob_...", got "${token.substring(0, 10)}..."`);
  }

  const files: StorageFile[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL('https://blob.vercel-storage.com?v=1');
    url.searchParams.set('limit', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);
    if (connection.folderPath) url.searchParams.set('prefix', connection.folderPath);

    // Use Local Vite Proxy
    const proxyUrl = url.toString().replace('https://blob.vercel-storage.com', '/api/vercel-blob');

    // Log masked token for debugging
    console.log(`[StorageAPI] Fetching via proxy with token: ${token.substring(0, 10)}... (Length: ${token.length})`);

    const response = await fetch(proxyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-version': '1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[StorageAPI] Sync failed. Status:', response.status, 'Body:', errorText);

      // Try parsing JSON, otherwise return raw text
      let errorMessage = `Failed to list blobs (Status ${response.status})`;
      try {
        const error = JSON.parse(errorText);
        if (error.error?.message) errorMessage = error.error.message;
        else if (error.message) errorMessage = error.message;
      } catch {
        // If not JSON, use the first 100 chars of the text (it might be HTML)
        if (errorText) errorMessage += `: ${errorText.substring(0, 100)}`;
      }

      // Checking for specific proxy errors
      if (response.status === 404 && errorText.includes('corsproxy')) {
        errorMessage = 'CORS Proxy Error: Destination URL not found';
      }

      throw new Error(errorMessage + ` (Token: ${token.substring(0, 5)}...)`);
    }

    const data = await response.json();

    for (const blob of data.blobs || []) {
      const pathParts = blob.pathname.split('/').filter(Boolean);
      (files as any[]).push({
        id: crypto.randomUUID(), // Valid UUID for Database
        name: pathParts.pop() || blob.pathname,
        url: blob.url,
        size: blob.size,
        contentType: blob.contentType || 'application/octet-stream',
        uploadedAt: blob.uploadedAt,
        folder: pathParts.length > 0 ? pathParts[0] : (connection.name || 'Root'), // After pop(), check > 0 for proper folder detection
        tenantId: connection.tenantId,
        path: blob.pathname, // Ensure path is passed for folder sorting in App.tsx
        storageKey: blob.pathname,
        storageUrl: blob.url,
        sizeBytes: blob.size,
        metadata: {
          contentDisposition: blob.contentDisposition,
          contentType: blob.contentType,
        }
      });
    }

    cursor = data.cursor;
  } while (cursor);

  return files;
}

// ==================== S3-compatible (AWS S3, Cloudflare R2) ====================

// ==================== S3-compatible (AWS S3, Cloudflare R2) ====================

import { S3Client, ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function getS3Client(connection: StorageConnection): Promise<S3Client> {
  const { accessKeyId, secretAccessKey, region, endpoint } = connection.credentials;

  if (!accessKeyId || !secretAccessKey || !region) {
    throw new Error('Access Key ID, Secret Access Key, and Region are required');
  }

  return new S3Client({
    region,
    endpoint: endpoint || undefined, // Use custom endpoint for R2, DO, etc.
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: !!endpoint, // Usually needed for custom endpoints like MinIO/local
  });
}

async function testS3Connection(connection: StorageConnection): Promise<{ success: boolean; message: string; metadata?: any }> {
  try {
    const client = await getS3Client(connection);

    // Test connectivity by listing buckets
    // Note: Some IAM policies might deny ListBuckets. In that case, we could try HeadBucket if a bucket name was known.
    // For now, ListBuckets is a good general test.
    const command = new ListBucketsCommand({});
    const response = await client.send(command);

    console.log('[StorageAPI] S3 Connection Test Success. Buckets:', response.Buckets?.length);

    return {
      success: true,
      message: `Successfully connected to ${connection.provider === 'aws-s3' ? 'AWS S3' : 'S3 Provider'}`,
      metadata: { bucketCount: response.Buckets?.length || 0 }
    };
  } catch (error: any) {
    console.error('[StorageAPI] S3 Connection Verification Failed:', error);
    return {
      success: false,
      message: error.message || 'Failed to connect to S3'
    };
  }
}

async function syncS3Files(connection: StorageConnection): Promise<StorageFile[]> {
  try {
    const client = await getS3Client(connection);
    // Find bucket name - currently not stored in connection root, but usually needed.
    // For now, let's assume the user put the bucket name in the "Folder Path" field or credentials.
    // Wait, the UI doesn't have a "Bucket Name" field in PROVIDER_INFO.
    // I should probably check if it's adding it to metadata or credentials.
    // Looking at types/storage.ts, `bucketName` is in `StorageCredentials`.

    const bucketName = connection.credentials.bucketName;
    if (!bucketName) {
      throw new Error('Bucket Name is required. Please update connection details.');
    }

    const files: StorageFile[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: connection.folderPath || undefined,
        ContinuationToken: continuationToken,
      });

      const response = await client.send(command);

      for (const obj of response.Contents || []) {
        if (!obj.Key) continue;
        if (obj.Key.endsWith('/')) continue; // Skip folders

        const pathParts = obj.Key.split('/').filter(Boolean);
        const fileName = pathParts.pop() || obj.Key;
        const folder = pathParts.length > 0 ? pathParts[0] : (connection.name || 'Root');

        // Construct a public URL or a signed URL. 
        // For generic S3, simple public URL construction:
        const endpoint = connection.credentials.endpoint
          ? connection.credentials.endpoint.replace('https://', `https://${bucketName}.`) // subdomain style
          : `https://${bucketName}.s3.${connection.credentials.region}.amazonaws.com`;

        // This URL logic is simplistic and might need adjustment for R2/path-style/etc.
        // For accurate URLs, we might need a generic "Public URL Base" field.
        // Fallback: Use the Key.
        const url = `${endpoint}/${obj.Key}`;

        files.push({
          id: crypto.randomUUID(),
          name: fileName,
          url: url,
          size: obj.Size || 0,
          contentType: 'application/octet-stream', // S3 ListObjects doesn't return Content-Type
          uploadedAt: obj.LastModified?.toISOString() || new Date().toISOString(),
          folder: folder,
          path: obj.Key,
          metadata: {
            eTag: obj.ETag,
            storageClass: obj.StorageClass
          }
        });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  } catch (error: any) {
    console.error('[StorageAPI] S3 Sync Failed:', error);
    throw error;
  }
}

// ==================== Google Cloud Storage ====================

async function testGCSConnection(connection: StorageConnection): Promise<{ success: boolean; message: string }> {
  const { projectId, clientEmail, privateKey } = connection.credentials;

  if (!projectId || !clientEmail || !privateKey) {
    return { success: false, message: 'All GCS credentials are required' };
  }

  return { success: true, message: 'GCS connection configured' };
}

async function syncGCSFiles(_connection: StorageConnection): Promise<StorageFile[]> {
  // Placeholder - use @google-cloud/storage in production
  console.warn('GCS sync not fully implemented - using placeholder');
  return [];
}

// ==================== Supabase ====================

async function testSupabaseConnection(connection: StorageConnection): Promise<{ success: boolean; message: string }> {
  const { supabaseUrl, supabaseKey } = connection.credentials;

  if (!supabaseUrl || !supabaseKey) {
    return { success: false, message: 'Supabase URL and Key are required' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid Supabase credentials');
    }

    return { success: true, message: 'Connected to Supabase successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function syncSupabaseFiles(_connection: StorageConnection): Promise<StorageFile[]> {
  // Use Supabase client in production
  // const { createClient } = require('@supabase/supabase-js');
  console.warn('Supabase sync not fully implemented - using placeholder');
  return [];
}

// ==================== Local File Handling ====================

export async function browseLocalFiles(): Promise<StorageFile[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    (input as any).directory = true;
    input.multiple = true;

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) {
        resolve([]);
        return;
      }

      const storageFiles: StorageFile[] = Array.from(files).map(file => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        uploadedAt: new Date(file.lastModified).toISOString(),
        path: (file as any).webkitRelativePath || file.name,
      }));

      resolve(storageFiles);
    };

    input.onerror = () => reject(new Error('Failed to browse files'));
    input.click();
  });
}
