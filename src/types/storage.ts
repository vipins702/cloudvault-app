// Storage Provider Types
export type StorageProvider = 'vercel-blob' | 'aws-s3' | 'gcs' | 'supabase' | 'cloudflare-r2' | 'local' | 'icloud' | 'google-photos' | 'google-drive';

export interface StorageCredentials {
  // Vercel Blob
  token?: string;

  // AWS S3 / R2
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  endpoint?: string;

  // GCS
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;

  // Supabase
  supabaseUrl?: string;
  supabaseKey?: string;
  bucketName?: string;

  // OAuth Providers (iCloud, Google Photos, Google Drive)
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthExpiresAt?: string;
  oauthScope?: string;
  userId?: string; // Provider's user ID
  userEmail?: string;
}

export interface StorageConnection {
  id: string;
  tenantId: string;
  name: string;
  provider: StorageProvider;
  credentials: StorageCredentials;
  baseUrl?: string;
  folderPath?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  metadata?: {
    totalFiles?: number;
    totalSize?: number;
    bucketName?: string;
    region?: string;
  };
}

export interface StorageFile {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
  path?: string;
  folder?: string;
}

export interface StorageSyncResult {
  success: boolean;
  files: StorageFile[];
  error?: string;
  timestamp: string;
}

export const PROVIDER_INFO: Record<StorageProvider, {
  name: string;
  icon: string;
  description: string;
  fields: { key: keyof StorageCredentials; label: string; type: string; required: boolean; placeholder?: string }[];
}> = {
  'vercel-blob': {
    name: 'Vercel Blob',
    icon: '▲',
    description: 'Edge-configured storage for fast global access',
    fields: [
      { key: 'token', label: 'Blob Read/Write Token', type: 'password', required: true, placeholder: 'blob_rw_...' },
    ]
  },
  'aws-s3': {
    name: 'AWS S3 / Compatible',
    icon: '☁️',
    description: 'AWS S3, Cloudflare R2, DigitalOcean Spaces, etc.',
    fields: [
      { key: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-bucket' },
      { key: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'endpoint', label: 'Custom Endpoint (Optional)', type: 'text', required: false, placeholder: 'https://...' },
    ]
  },
  'gcs': {
    name: 'Google Cloud Storage',
    icon: '☁️',
    description: 'Google Cloud Platform object storage',
    fields: [
      { key: 'projectId', label: 'Project ID', type: 'text', required: true },
      { key: 'clientEmail', label: 'Client Email', type: 'text', required: true },
      { key: 'privateKey', label: 'Private Key', type: 'password', required: true },
    ]
  },
  'supabase': {
    name: 'Supabase Storage',
    icon: '⚡',
    description: 'Open source Firebase alternative with storage',
    fields: [
      { key: 'supabaseUrl', label: 'Project URL', type: 'text', required: true, placeholder: 'https://....supabase.co' },
      { key: 'supabaseKey', label: 'Service Role Key', type: 'password', required: true },
      { key: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'photos' },
    ]
  },
  'cloudflare-r2': {
    name: 'Cloudflare R2',
    icon: '☁️',
    description: 'S3-compatible storage with zero egress fees',
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'endpoint', label: 'S3 API URL', type: 'text', required: true, placeholder: 'https://...r2.cloudflarestorage.com' },
    ]
  },
  'local': {
    name: 'Local Files',
    icon: '💻',
    description: 'Browse local files (browser only)',
    fields: []
  },
  'icloud': {
    name: 'iCloud Photos',
    icon: '🍎',
    description: 'Sync from Apple iCloud (iOS/macOS)',
    fields: [
      { key: 'oauthAccessToken', label: 'Authorization Required', type: 'text', required: true, placeholder: 'Tap to authorize' },
    ]
  },
  'google-photos': {
    name: 'Google Photos',
    icon: '🔵',
    description: 'Access your Google Photos library',
    fields: [
      { key: 'oauthAccessToken', label: 'Authorization Required', type: 'text', required: true, placeholder: 'Tap to authorize' },
    ]
  },
  'google-drive': {
    name: 'Google Drive',
    icon: '📁',
    description: 'Access photos stored in Google Drive',
    fields: [
      { key: 'oauthAccessToken', label: 'Authorization Required', type: 'text', required: true, placeholder: 'Tap to authorize' },
    ]
  }
};

// ─── UI / App Types ───
export type MediaType = 'image' | 'video' | 'other';

export interface Photo {
  id: string;
  src: string;
  name: string;
  folder: string; // purely for display categories if needed
  path: string;   // Full storage key path
  size: number;
  date: string;   // Display date (uploadedAt)
  type: MediaType;
  connectionId?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  contentType: string; // MIME type
  createdAt: string;   // ISO Date string
}

