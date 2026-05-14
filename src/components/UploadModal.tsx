import { useState, useRef, useCallback } from 'react';
import {
  X, Upload, Camera, Image as ImageIcon, Smartphone,
  Loader2, CheckCircle2, XCircle, FolderOpen,
  Trash2, CloudUpload, FileImage, Film,
} from 'lucide-react';
import EXIF from 'exif-js';
import { cn } from '@/utils/cn';
import { SaaSAPI } from '@/lib/saas-api';
import { FileRecord } from '@/types/schema';

interface Props {
  open: boolean;
  onClose: () => void;
  api: SaaSAPI | null;
  isDemo: boolean;
  existingFiles: { name: string; size: number }[];
  onFilesUploaded: (files: FileRecord[]) => void;
}
interface QueuedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  result?: FileRecord;
  isDuplicate?: boolean;
  metadata?: Record<string, any>;
}

const getExif = (file: File): Promise<Record<string, any>> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({});
      return;
    }
    try {
      EXIF.getData(file as any, function (this: any) {
        const allMetaData = EXIF.getAllTags(this);
        const cleanData: Record<string, any> = {};

        if (allMetaData.Make) cleanData.make = String(allMetaData.Make);
        if (allMetaData.Model) cleanData.model = String(allMetaData.Model);
        if (allMetaData.ExposureTime) {
          const exposure = allMetaData.ExposureTime;
          cleanData.exposure = exposure < 1 ? `1/${Math.round(1 / exposure)}` : String(exposure);
        }
        if (allMetaData.ISOSpeedRatings) cleanData.iso = allMetaData.ISOSpeedRatings;
        if (allMetaData.FNumber) cleanData.fNumber = `f/${allMetaData.FNumber}`;
        if (allMetaData.DateTimeOriginal) cleanData.dateTime = String(allMetaData.DateTimeOriginal);

        // GPS Handle
        if (allMetaData.GPSLatitude && allMetaData.GPSLongitude) {
          cleanData.gps = {
            lat: allMetaData.GPSLatitude,
            lng: allMetaData.GPSLongitude,
            ref: allMetaData.GPSLatitudeRef
          };
        }

        resolve(cleanData);
      });
    } catch (err) {
      console.error('EXIF extraction error:', err);
      resolve({});
    }
  });
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function UploadModal({ open, onClose, api, isDemo, existingFiles, onFilesUploaded }: Props) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [folder, setFolder] = useState('Uploads');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: QueuedFile[] = Array.from(fileList)
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map(file => {
        const isDuplicate = existingFiles.some(p => p.name === file.name && p.size === file.size);
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          preview: URL.createObjectURL(file),
          status: 'pending' as const,
          progress: 0,
          isDuplicate,
        };
      });

    setQueue(prev => [...prev, ...newFiles]);
  }, [existingFiles]);

  const removeFromQueue = (id: string) => {
    setQueue(prev => {
      const item = prev.find(f => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const clearQueue = () => {
    queue.forEach(f => URL.revokeObjectURL(f.preview));
    setQueue([]);
  };

  const handleUpload = async () => {
    if (queue.length === 0) return;
    setUploading(true);

    const uploaded: FileRecord[] = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'done') continue;

      // 1. Extract Metadata (EXIF)
      const metadata = await getExif(item.file);

      // Update status to uploading
      setQueue(prev => prev.map(f =>
        f.id === item.id ? { ...f, status: 'uploading' as const, progress: 50, metadata } : f
      ));

      if (isDemo || !api) {
        // Demo mode: simulate upload with delay
        await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
        const mockRecord: FileRecord = {
          id: `upload-${Date.now()}-${i}`,
          tenantId: 'demo',
          connectionId: 'demo-conn',
          storageKey: `${folder}/${item.file.name}`,
          storageUrl: item.preview,
          name: item.file.name,
          contentType: item.file.type,
          sizeBytes: item.file.size,
          folder,
          tags: [],
          metadata: { ...metadata, device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop' },
          uploadedAt: new Date().toISOString(),
        };
        uploaded.push(mockRecord);
        setQueue(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'done' as const, progress: 100, result: mockRecord } : f
        ));
      } else {
        // Real upload via SaaS API
        try {
          const result = await api.uploadFile(item.file, folder, metadata);
          if (result.success && result.data) {
            uploaded.push(result.data);
            setQueue(prev => prev.map(f =>
              f.id === item.id ? { ...f, status: 'done' as const, progress: 100, result: result.data } : f
            ));
          } else {
            throw new Error(result.error || 'Upload failed');
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          setQueue(prev => prev.map(f =>
            f.id === item.id ? { ...f, status: 'error' as const, error: message } : f
          ));
        }
      }
    }

    setUploading(false);
    if (uploaded.length > 0) {
      onFilesUploaded(uploaded);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const clearCompleted = () => {
    setQueue(prev => {
      const remaining = prev.filter(f => f.status !== 'done');
      const completed = prev.filter(f => f.status === 'done');
      completed.forEach(f => URL.revokeObjectURL(f.preview));
      return remaining;
    });
  };

  const pendingCount = queue.filter(f => f.status === 'pending').length;
  const doneCount = queue.filter(f => f.status === 'done').length;
  const errorCount = queue.filter(f => f.status === 'error').length;
  const allDone = queue.length > 0 && pendingCount === 0 && !uploading;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-surface-light rounded-2xl border border-white/[0.06] shadow-2xl flex flex-col animate-slide-up overflow-hidden"
        onClick={e => e.stopPropagation()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-brand-500/10 backdrop-blur-[2px] border-2 border-brand-500 border-dashed m-2 rounded-xl flex flex-col items-center justify-center animate-fade-in pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mb-4">
              <CloudUpload className="w-8 h-8 text-brand-400 animate-bounce" />
            </div>
            <p className="text-lg font-bold text-brand-400">Drop to add photos</p>
            <p className="text-sm text-brand-400/60">Release to populate queue</p>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <CloudUpload className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Upload Photos</h2>
              <p className="text-xs text-white/30">
                {isDemo || !api ? 'Demo mode — files stored locally only' : `Syncing to ${api?.ctx?.connection?.name || 'Cloud'} @ ${folder}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary/40 hover:text-text-secondary hover:bg-surface-lighter rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Folder selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary/60 mb-1.5">Upload to folder</label>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                value={folder}
                onChange={e => setFolder(e.target.value)}
                placeholder="Uploads"
                className="w-full pl-10 pr-4 py-2.5 bg-surface-lighter border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Source buttons */}
          <div className="grid grid-cols-3 gap-3">
            {/* Gallery / Files */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-brand-500/40 hover:bg-brand-500/5 transition-all group"
            >
              <ImageIcon className="w-6 h-6 text-text-secondary/40 group-hover:text-brand-500 transition-colors" />
              <span className="text-xs font-medium text-text-secondary/60 group-hover:text-text-secondary">Gallery</span>
            </button>

            {/* Camera (mobile) */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
            >
              <Camera className="w-6 h-6 text-text-secondary/40 group-hover:text-brand-500 transition-colors" />
              <span className="text-xs font-medium text-text-secondary/60 group-hover:text-text-secondary">Camera</span>
            </button>

            {/* Phone Gallery */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
            >
              <Smartphone className="w-6 h-6 text-white/30 group-hover:text-purple-400 transition-colors" />
              <span className="text-xs font-medium text-white/40 group-hover:text-white/60">Phone</span>
            </button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={e => addFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={e => addFiles(e.target.files)}
            className="hidden"
          />

          {/* Drop zone */}
          {queue.length === 0 && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-white/[0.06] hover:border-brand-500/30 hover:bg-brand-500/5 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-sm font-medium text-white/30 mb-1">Drop files here or click to browse</p>
              <p className="text-xs text-white/15">Supports images and videos</p>
            </div>
          )}

          {/* File Queue */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white/20 uppercase tracking-wider">
                  Files ({queue.length})
                </p>
                {!uploading && (
                  <div className="flex items-center gap-3">
                    {doneCount > 0 && (
                      <button onClick={clearCompleted} className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium">
                        Clear done
                      </button>
                    )}
                    <button onClick={clearQueue} className="text-xs text-white/20 hover:text-white/40 transition-colors">
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-xl bg-black/20 border border-white/[0.04] p-2">
                {queue.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      item.status === 'done' ? "bg-emerald-500/5" :
                        item.status === 'error' ? "bg-red-500/5" :
                          item.status === 'uploading' ? "bg-brand-500/5" :
                            "bg-white/[0.02]"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                      {item.file.type.startsWith('image/') ? (
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-4 h-4 text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white/70 truncate">{item.file.name}</p>
                        {item.isDuplicate && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/20">
                            Duplicate
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/25">{formatSize(item.file.size)}</p>
                    </div>

                    {/* Status */}
                    {item.status === 'pending' && (
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="p-1.5 text-white/15 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {item.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                    )}
                    {item.status === 'done' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {item.status === 'error' && (
                      <div className="flex items-center gap-1">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-[10px] text-red-400 max-w-[80px] truncate">{item.error}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Stats */}
              {queue.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-white/20 pt-1">
                  <span>Total: {formatSize(queue.reduce((s, f) => s + f.file.size, 0))}</span>
                  {doneCount > 0 && <span className="text-emerald-400/60">✓ {doneCount} done</span>}
                  {errorCount > 0 && <span className="text-red-400/60">✕ {errorCount} failed</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-white/15" />
            <span className="text-xs text-white/20">
              {isDemo ? 'Demo: files stored locally' : 'Files upload to your connected storage'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white/40 hover:text-white/60 transition-colors"
            >
              {allDone ? 'Close' : 'Cancel'}
            </button>
            {!allDone && (
              <button
                onClick={handleUpload}
                disabled={pendingCount === 0 || uploading}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-500/20"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><CloudUpload className="w-4 h-4" /> Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
