import { useState, useEffect } from 'react';
import { X, Database, Check, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/tenant-db';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminSettings({ open, onClose }: Props) {
  const [dbUrl, setDbUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setDbUrl(db.getDatabaseUrl() || '');
    }
  }, [open]);

  const handleSave = () => {
    db.setDatabaseUrl(dbUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-lighter">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-brand-500" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">System Admin</h2>
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary/20 hover:text-text-primary transition-colors rounded-lg hover:bg-surface-light">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-secondary/60 uppercase tracking-widest">Database Connection</label>
            <p className="text-xs text-text-secondary/40">
              Enter your Neon PostgreSQL connection string to switch from local demo mode to real production database.
            </p>
            <input
              value={dbUrl}
              onChange={e => setDbUrl(e.target.value)}
              placeholder="postgres://user:pass@ep-xyz.region.aws.neon.tech/neondb?sslmode=require"
              className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-primary placeholder:text-text-secondary/20 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all shadow-inner"
            />
            {dbUrl && !dbUrl.startsWith('postgres') && (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Must start with postgres://</span>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-brand-500/5 border border-brand-500/10 p-4">
            <h4 className="text-sm font-semibold text-brand-600 mb-1">Current Mode: {dbUrl ? 'Production (Neon)' : 'Local Demo (IndexedDB)'}</h4>
            <p className="text-xs text-text-secondary/40">
              {dbUrl
                ? 'Your app is connected to a real serverless PostgreSQL database.'
                : 'Data is stored in your browser. Clear cache to reset.'}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface-lighter flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-text-primary text-surface font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-500/10"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Saved & Reloading...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
