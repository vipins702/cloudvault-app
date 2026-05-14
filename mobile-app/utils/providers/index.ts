// CORE STORAGE INTERFACE
export interface IStorageProvider {
  list(path?: string): Promise<CloudAsset[]>;
  upload(file: any, path: string): Promise<CloudAsset>;
  download(url: string): Promise<Blob>;
  delete(id: string): Promise<void>;
  move(id: string, targetPath: string): Promise<void>;
}

export interface CloudAsset {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  date: string;
  provider: string;
  type: 'image' | 'video' | 'other';
}

// VERCEL ADAPTER
export class VercelAdapter implements IStorageProvider {
  private token: string;
  constructor(token: string) { this.token = token; }

  async list(path?: string): Promise<CloudAsset[]> {
    const res = await fetch(`https://blob.vercel-storage.com?v=1`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    const data = await res.json();
    return (data.blobs || []).map((b: any) => ({
      id: b.url,
      name: b.pathname.split('/').pop(),
      url: b.url,
      path: b.pathname,
      size: b.size,
      date: b.uploadedAt,
      provider: 'vercel-blob',
      type: b.contentType?.startsWith('video') ? 'video' : 'image'
    }));
  }

  async upload(file: any, path: string): Promise<CloudAsset> {
    const res = await fetch(`https://blob.vercel-storage.com/${path}?v=1`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'image/jpeg' },
      body: file
    });
    const b = await res.json();
    return {
       id: b.url, name: b.pathname.split('/').pop(), url: b.url, path: b.pathname,
       size: 0, date: new Date().toISOString(), provider: 'vercel-blob', type: 'image'
    };
  }

  async download(url: string): Promise<Blob> {
    const res = await fetch(url);
    return res.blob();
  }

  async delete(url: string): Promise<void> {
    // Vercel delete logic
  }

  async move(id: string, targetPath: string): Promise<void> {
    // Vercel move is basically rename
  }
}
