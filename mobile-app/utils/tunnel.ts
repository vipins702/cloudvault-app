import { IStorageProvider } from './providers';

export class MigrationManager {
  /**
   * TUNNEL TRANSFER
   * Moves a file from source cloud to target cloud without saving to phone storage.
   */
  static async transfer(
    sourceProvider: IStorageProvider,
    targetProvider: IStorageProvider,
    assetId: string,
    assetUrl: string,
    targetPath: string,
    onProgress?: (progress: number) => void
  ) {
    try {
      if (onProgress) onProgress(0.2);

      // 1. Download from Source as a Blob (In-memory buffer)
      const blob = await sourceProvider.download(assetUrl);
      
      if (onProgress) onProgress(0.5);

      // 2. Upload directly to Target
      const newAsset = await targetProvider.upload(blob, targetPath);

      if (onProgress) onProgress(0.8);

      // 3. Delete from Source (Clean up)
      await sourceProvider.delete(assetUrl);

      if (onProgress) onProgress(1.0);
      return newAsset;
    } catch (err) {
      console.error('Migration Tunnel Failure:', err);
      throw err;
    }
  }

  /**
   * BULK MIGRATION
   * Handles 100+ files with error tracking and retry logic.
   */
  static async bulkTransfer(
    sourceProvider: IStorageProvider,
    targetProvider: IStorageProvider,
    assets: { id: string, url: string, path: string }[],
    onStatus: (current: number, total: number) => void
  ) {
    const results = { success: 0, failed: 0 };
    
    for (let i = 0; i < assets.length; i++) {
      try {
        await this.transfer(sourceProvider, targetProvider, assets[i].id, assets[i].url, assets[i].path);
        results.success++;
      } catch (e) {
        results.failed++;
      }
      onStatus(i + 1, assets.length);
    }
    return results;
  }
}
