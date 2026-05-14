import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, X, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Photo {
  id: string;
  src: string;
  name: string;
  folder: string;
  size: number;
}

interface Props {
  photos: Photo[];
  isDemo: boolean;
  onConfirmDelete: (ids: string[], urls: string[]) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DeleteModal({ photos, isDemo, onConfirmDelete, onClose }: Props) {
  const [step, setStep] = useState<'confirm' | 'deleting' | 'done' | 'error'>('confirm');
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const totalSize = photos.reduce((s, p) => s + p.size, 0);
  const confirmText = photos.length === 1 ? 'DELETE' : `DELETE ${photos.length}`;

  const handleDelete = async () => {
    if (isDemo) {
      // Demo mode: just remove locally
      setStep('deleting');
      await new Promise(r => setTimeout(r, 800));
      const res = await onConfirmDelete(
        photos.map(p => p.id),
        photos.map(p => p.src)
      );
      setResult(res);
      setStep(res.success ? 'done' : 'error');
      return;
    }

    setStep('deleting');
    const res = await onConfirmDelete(
      photos.map(p => p.id),
      photos.map(p => p.src)
    );
    setResult(res);
    setStep(res.success ? 'done' : 'error');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-surface-light rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* ─── CONFIRM STEP ─── */}
        {step === 'confirm' && (
          <>
            <div className="p-6 pb-0">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {photos.length === 1 ? 'Delete this file?' : `Delete ${photos.length} files?`}
                  </h3>
                  <p className="text-sm text-white/40 mt-1">
                    {isDemo ? (
                      'Demo mode — files will only be removed from the local view.'
                    ) : (
                      <>
                        This will <strong className="text-red-400">permanently delete</strong> {photos.length === 1 ? 'this file' : 'these files'} from
                        your cloud storage. This action <strong className="text-red-400">cannot be undone</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* File list */}
            <div className="px-6 py-4">
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl bg-black/20 border border-white/[0.04] p-3">
                {photos.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface overflow-hidden flex-shrink-0">
                      <img src={p.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 truncate">{p.name}</p>
                      <p className="text-xs text-white/25">{p.folder} · {formatSize(p.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/20 mt-2 text-right">
                Total: {formatSize(totalSize)}
              </p>
            </div>

            {/* Warning */}
            {!isDemo && (
              <div className="mx-6 mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/15">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300">Permanent deletion from cloud storage</p>
                  <p className="text-xs text-red-300/60 mt-0.5">
                    Files will be deleted via the Vercel Blob API. They cannot be recovered after deletion.
                  </p>
                </div>
              </div>
            )}

            {/* Confirmation input */}
            {!isDemo && (
              <div className="px-6 mb-4">
                <label className="block text-xs font-medium text-white/30 mb-1.5">
                  Type <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-red-400 font-bold">{confirmText}</code> to confirm
                </label>
                <input
                  type="text"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  placeholder={confirmText}
                  className="w-full px-4 py-2.5 bg-black/20 border border-white/[0.08] rounded-xl text-white placeholder:text-white/15 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                  autoFocus
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 p-6 pt-2 border-t border-white/[0.04]">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white/50 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!isDemo && typed !== confirmText}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all",
                  !isDemo && typed !== confirmText
                    ? "bg-red-500/20 text-red-300/40 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20"
                )}
              >
                <Trash2 className="w-4 h-4" />
                {isDemo ? 'Remove from view' : 'Delete Permanently'}
              </button>
            </div>
          </>
        )}

        {/* ─── DELETING STEP ─── */}
        {step === 'deleting' && (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-red-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-bold text-white mb-2">Deleting files...</h3>
            <p className="text-sm text-white/40">
              {isDemo ? 'Removing from local view...' : 'Sending delete request to cloud storage API...'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/20">
              <code className="bg-white/[0.04] px-2 py-1 rounded font-mono">
                {isDemo ? 'local.remove()' : 'POST /v1/blob/del'}
              </code>
            </div>
          </div>
        )}

        {/* ─── DONE STEP ─── */}
        {step === 'done' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {photos.length === 1 ? 'File deleted' : `${photos.length} files deleted`}
            </h3>
            <p className="text-sm text-white/40 mb-6">
              {isDemo
                ? 'Removed from the local view. Demo files are not actually stored anywhere.'
                : 'Files have been permanently removed from your cloud storage.'}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-500 transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* ─── ERROR STEP ─── */}
        {step === 'error' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete failed</h3>
            <p className="text-sm text-red-300/60 mb-2">{result?.error || 'Unknown error'}</p>
            <p className="text-xs text-white/20 mb-6">
              Check your connection settings and try again.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-white/50 bg-white/[0.04] rounded-xl hover:bg-white/[0.08] transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setStep('confirm'); setTyped(''); }}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-500 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Close button */}
        {(step === 'confirm' || step === 'done' || step === 'error') && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/20 hover:text-white/50 hover:bg-white/[0.04] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
