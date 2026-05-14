/**
 * ═══════════════════════════════════════════════════════════════
 *  OAuth Mobile Migration - iCloud, Google Photos, Google Drive
 * ═══════════════════════════════════════════════════════════════
 * 
 * Handles OAuth flows for mobile-first photo migration from:
 * - Apple iCloud Photos (iOS users)
 * - Google Photos (Android/iOS)
 * - Google Drive (All platforms)
 */

import type { StorageConnection, StorageFile } from '@/types/storage';

// ─── OAuth Configuration ───
// In production, store these securely in Vercel Environment Variables
const OAUTH_CONFIG = {
  'google-photos': {
    clientId: process.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    clientSecret: process.env.VITE_GOOGLE_CLIENT_SECRET || 'YOUR_SECRET',
    redirectUri: `${window.location.origin}/auth/google-photos/callback`,
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
    apiEndpoint: 'https://photoslibrary.googleapis.com/v1'
  },
  'google-drive': {
    clientId: process.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    clientSecret: process.env.VITE_GOOGLE_CLIENT_SECRET || 'YOUR_SECRET',
    redirectUri: `${window.location.origin}/auth/google-drive/callback`,
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
    apiEndpoint: 'https://www.googleapis.com/drive/v3'
  },
  'icloud': {
    // Apple's CloudKit Web Services
    clientId: process.env.VITE_ICLOUD_CLIENT_ID || 'YOUR_ICLOUD_APP_ID',
    redirectUri: `${window.location.origin}/auth/icloud/callback`,
    authEndpoint: 'https://appleid.apple.com/auth/authorize',
    scope: 'name email',
  }
};

// ─── OAuth Flow Initiators ───

export function initiateGooglePhotosOAuth(): void {
  const config = OAUTH_CONFIG['google-photos'];
  const state = generateRandomState();
  sessionStorage.setItem('oauth_state', state);
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });

  window.location.href = `${config.authEndpoint}?${params.toString()}`;
}

export function initiateGoogleDriveOAuth(): void {
  const config = OAUTH_CONFIG['google-drive'];
  const state = generateRandomState();
  sessionStorage.setItem('oauth_state', state);
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });

  window.location.href = `${config.authEndpoint}?${params.toString()}`;
}

export function initiateICloudOAuth(): void {
  const config = OAUTH_CONFIG['icloud'];
  const state = generateRandomState();
  sessionStorage.setItem('oauth_state', state);
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code id_token',
    scope: config.scope,
    state: state,
    response_mode: 'fragment',
  });

  window.location.href = `${config.authEndpoint}?${params.toString()}`;
}

// ─── OAuth Token Exchange ───

export async function exchangeGoogleAuthCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const config = OAUTH_CONFIG['google-photos'];
  
  // In production, call your backend API to securely exchange the code
  // Never expose clientSecret to browser
  const response = await fetch('/api/auth/google/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, provider: 'google-photos' })
  });

  if (!response.ok) throw new Error('Failed to exchange auth code');
  return response.json();
}

export async function exchangeICloudAuthCode(code: string): Promise<{
  accessToken: string;
  idToken?: string;
  expiresIn: number;
}> {
  // Call backend to exchange iCloud auth code
  const response = await fetch('/api/auth/icloud/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  if (!response.ok) throw new Error('Failed to exchange iCloud code');
  return response.json();
}

// ─── Fetch Photos from Google Photos ───

export async function fetchGooglePhotos(
  accessToken: string,
  pageSize: number = 100
): Promise<StorageFile[]> {
  const config = OAUTH_CONFIG['google-photos'];
  
  try {
    // Get list of media items
    const response = await fetch(`${config.apiEndpoint}/mediaItems?pageSize=${pageSize}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Google Photos API error: ${response.statusText}`);
    }

    const data = await response.json();
    const mediaItems = data.mediaItems || [];

    return mediaItems.map((item: any) => ({
      id: item.id,
      name: item.filename,
      url: item.baseUrl + '=d', // =d parameter for full resolution
      size: parseInt(item.mediaMetadata?.width || 0) * parseInt(item.mediaMetadata?.height || 0),
      contentType: item.mimeType,
      uploadedAt: item.mediaMetadata?.creationTime || new Date().toISOString(),
      path: `google-photos/${item.id}`,
      folder: extractFolderFromDate(item.mediaMetadata?.creationTime),
      metadata: {
        width: item.mediaMetadata?.width,
        height: item.mediaMetadata?.height,
        cameraMake: item.mediaMetadata?.photo?.cameraMake,
        cameraModel: item.mediaMetadata?.photo?.cameraModel,
        iso: item.mediaMetadata?.photo?.iso,
        apertureFNumber: item.mediaMetadata?.photo?.apertureFNumber,
        focusDistance: item.mediaMetadata?.photo?.focusDistance,
      }
    }));
  } catch (error) {
    console.error('[OAuth] Error fetching Google Photos:', error);
    throw error;
  }
}

// ─── Fetch Photos from Google Drive ───

export async function fetchGoogleDrivePhotos(
  accessToken: string,
  pageSize: number = 100
): Promise<StorageFile[]> {
  const config = OAUTH_CONFIG['google-drive'];
  
  try {
    // Query for image and video files
    const query = encodeURIComponent(
      "mimeType contains 'image/' or mimeType contains 'video/' and trashed=false"
    );
    
    const response = await fetch(
      `${config.apiEndpoint}/files?q=${query}&pageSize=${pageSize}&fields=files(id,name,mimeType,createdTime,size,webContentLink,thumbnailLink)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.statusText}`);
    }

    const data = await response.json();
    const files = data.files || [];

    return files.map((file: any) => ({
      id: file.id,
      name: file.name,
      url: file.webContentLink || file.thumbnailLink,
      size: parseInt(file.size || 0),
      contentType: file.mimeType,
      uploadedAt: file.createdTime,
      path: `google-drive/${file.id}`,
      folder: file.parents?.[0] || 'root',
      metadata: {
        webViewLink: file.webViewLink,
        mimeType: file.mimeType,
      }
    }));
  } catch (error) {
    console.error('[OAuth] Error fetching Google Drive photos:', error);
    throw error;
  }
}

// ─── iCloud Photos (CloudKit) ───

export async function fetchICloudPhotos(
  accessToken: string,
  pageSize: number = 100
): Promise<StorageFile[]> {
  try {
    // Call backend which will query CloudKit REST API
    const response = await fetch('/api/icloud/photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ pageSize })
    });

    if (!response.ok) {
      throw new Error(`iCloud API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.records.map((record: any) => ({
      id: record.recordName,
      name: record.fields?.filename?.value || 'Photo',
      url: `https://cvws.icloud-content.com/${record.fields?.fileContent?.value?.downloadURL || ''}`,
      size: record.fields?.fileContent?.value?.size || 0,
      contentType: record.fields?.mimeType?.value || 'image/jpeg',
      uploadedAt: new Date(record.fields?.modificationTimestamp?.value).toISOString(),
      path: `icloud/${record.recordName}`,
      folder: extractFolderFromDate(new Date(record.fields?.modificationTimestamp?.value).toISOString()),
      metadata: {
        iCloudId: record.recordName,
        zoneID: record.zoneID,
      }
    }));
  } catch (error) {
    console.error('[OAuth] Error fetching iCloud photos:', error);
    throw error;
  }
}

// ─── Batch Migration (Cloud-to-Cloud) ───

export interface MigrationJob {
  id: string;
  sourceProvider: 'google-photos' | 'google-drive' | 'icloud';
  destinationConnection: StorageConnection;
  totalFiles: number;
  migratedFiles: number;
  failedFiles: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export async function startMigrationJob(
  sourceAccessToken: string,
  sourceProvider: 'google-photos' | 'google-drive' | 'icloud',
  destinationConnection: StorageConnection,
  tenantId: string
): Promise<MigrationJob> {
  // Fetch source files
  let sourceFiles: StorageFile[] = [];
  
  if (sourceProvider === 'google-photos') {
    sourceFiles = await fetchGooglePhotos(sourceAccessToken);
  } else if (sourceProvider === 'google-drive') {
    sourceFiles = await fetchGoogleDrivePhotos(sourceAccessToken);
  } else if (sourceProvider === 'icloud') {
    sourceFiles = await fetchICloudPhotos(sourceAccessToken);
  }

  // Create migration job
  const job: MigrationJob = {
    id: `migration_${Date.now()}`,
    sourceProvider,
    destinationConnection,
    totalFiles: sourceFiles.length,
    migratedFiles: 0,
    failedFiles: 0,
    status: 'pending',
    startedAt: new Date().toISOString(),
  };

  // Queue background job
  // In production, use BullMQ or similar
  queueMigrationJob(job, sourceFiles, sourceAccessToken, tenantId);

  return job;
}

// ─── Background Job Processing ───

function queueMigrationJob(
  job: MigrationJob,
  sourceFiles: StorageFile[],
  accessToken: string,
  tenantId: string
): void {
  // This would typically be handled by a background job processor
  // For now, we'll process in batches with delays to avoid overwhelming the browser
  
  (async () => {
    job.status = 'in-progress';
    
    for (let i = 0; i < sourceFiles.length; i++) {
      const file = sourceFiles[i];
      
      try {
        // Download file from source
        const fileData = await fetch(file.url);
        if (!fileData.ok) throw new Error('Failed to download file');
        
        const blob = await fileData.blob();
        
        // Upload to destination
        await uploadToDestination(
          job.destinationConnection,
          file.name,
          blob,
          file.contentType
        );
        
        job.migratedFiles++;
        
        // Notify progress (would use WebSocket in production)
        console.log(`[Migration] ${job.migratedFiles}/${job.totalFiles} files migrated`);
        
        // Rate limiting: pause between files
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        job.failedFiles++;
        console.error(`[Migration] Failed to migrate file: ${file.name}`, error);
      }
    }
    
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    
    console.log(`[Migration] Job ${job.id} completed: ${job.migratedFiles} success, ${job.failedFiles} failed`);
  })();
}

async function uploadToDestination(
  connection: StorageConnection,
  filename: string,
  blob: Blob,
  mimeType: string
): Promise<void> {
  // This will be implemented using existing storage API
  console.log(`[Upload] Uploading ${filename} to ${connection.provider}`);
  // TODO: Integrate with existing storage-api.ts upload methods
}

// ─── Utilities ───

function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function extractFolderFromDate(dateString: string | undefined): string {
  if (!dateString) return 'Uncategorized';
  const date = new Date(dateString);
  return date.toLocaleString('default', { year: 'numeric', month: 'long' });
}

export function isOAuthAccessTokenExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export async function refreshOAuthToken(
  provider: 'google-photos' | 'google-drive',
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, refreshToken })
  });

  if (!response.ok) throw new Error('Failed to refresh token');
  return response.json();
}
