import { useState, useEffect } from 'react';
import {
  X, ChevronRight, ChevronLeft, ExternalLink, Copy, Check,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw, Trash2,
  Eye, EyeOff, Zap, Shield, Cloud, FolderOpen,
  Loader2, Info, Database, Edit
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  StorageConnection, StorageProvider, PROVIDER_INFO, StorageFile, StorageCredentials
} from '@/types/storage';
import {
  saveStorageConnection as saveConnection,
  getTenantConnections as getAllConnections,
  deleteConnection,
  activateConnection as setActiveConnection,
  getTenantFiles as getCachedFiles
} from '@/lib/tenant-db';
import { testConnection, syncFiles, browseLocalFiles } from '@/lib/storage-api';

interface Props {
  open: boolean;
  onClose: () => void;
  onFilesLoaded: (files: StorageFile[], connection: StorageConnection) => void;
  tenantId: string;
}

type Tab = 'connections' | 'add' | 'wizard';

const VERCEL_STEPS = [
  {
    title: 'Go to Vercel Dashboard',
    desc: 'Open your Vercel account and navigate to the Storage section.',
    action: 'https://vercel.com/dashboard/stores',
    actionLabel: 'Open Vercel Dashboard',
    details: [
      'Sign in to your Vercel account at vercel.com',
      'Click on "Storage" in the top navigation bar',
      'You\'ll see a list of your existing stores (if any)',
    ],
    visual: 'dashboard',
  },
  {
    title: 'Create a Blob Store',
    desc: 'If you don\'t have a Blob store yet, create one.',
    action: 'https://vercel.com/dashboard/stores?type=blob',
    actionLabel: 'Create Blob Store',
    details: [
      'Click the "Create Database" or "Create Store" button',
      'Select "Blob" as the storage type',
      'Give your store a name (e.g., "my-photos")',
      'Select a region closest to your users',
      'Click "Create" to finish setup',
    ],
    visual: 'create',
  },
  {
    title: 'Get Your Read/Write Token',
    desc: 'Copy the BLOB_READ_WRITE_TOKEN from your store settings.',
    action: null,
    actionLabel: null,
    details: [
      'Open your Blob store from the Storage dashboard',
      'Go to the ".env.local" tab or "Settings" tab',
      'Find the variable named BLOB_READ_WRITE_TOKEN',
      'Click the copy icon next to the token value',
      'The token starts with "vercel_blob_rw_..." ',
    ],
    visual: 'token',
  },
  {
    title: 'Paste Token Below',
    desc: 'Enter the token here to connect PhotoVault to your Vercel Blob store.',
    action: null,
    actionLabel: null,
    details: [
      'Paste your token in the field below',
      'Click "Test Connection" to verify it works',
      'Once verified, click "Save & Connect" to finish',
      'Your photos will begin syncing automatically',
    ],
    visual: 'paste',
  },
];

export function StorageManager({ open, onClose, onFilesLoaded, tenantId }: Props) {
  const [tab, setTab] = useState<Tab>('connections');
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<StorageProvider | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [creds, setCreds] = useState<Partial<StorageCredentials>>({});

  // Status
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  useEffect(() => {
    if (open) loadConnections();
  }, [open]);

  const loadConnections = async () => {
    if (!tenantId) return;
    const conns = await getAllConnections(tenantId);
    setConnections(conns);
  };

  const resetForm = () => {
    setName('');
    setToken('');
    setFolderPath('');
    setCreds({});
    setTestResult(null);
    setShowToken(false);
    setSelectedProvider(null);
    setWizardStep(0);
    setEditingId(null);
  };

  const handleEdit = (conn: StorageConnection) => {
    setEditingId(conn.id);
    setName(conn.name);
    setFolderPath(conn.folderPath || '');
    setCreds(conn.credentials);

    if (conn.provider === 'vercel-blob') {
      setToken(conn.credentials.token || '');
      setSelectedProvider('vercel-blob');
      setTab('wizard');
      setWizardStep(3); // Jump to credentials step
    } else {
      setSelectedProvider(conn.provider);
      setTab('add');
    }
  };

  const handleTest = async () => {
    if (!selectedProvider) return;
    setTesting(true);
    setTestResult(null);

    const finalCreds = selectedProvider === 'vercel-blob'
      ? { token }
      : creds;

    const conn: StorageConnection = {
      id: crypto.randomUUID(),
      tenantId,
      name: name || 'Test',
      provider: selectedProvider,
      credentials: finalCreds,
      folderPath,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await testConnection(conn);
    setTestResult({ ok: result.success, msg: result.message });
    setTesting(false);
  };

  const handleSave = async () => {
    if (!selectedProvider || !name.trim()) return;

    const finalCreds = selectedProvider === 'vercel-blob'
      ? { token }
      : creds;

    const conn: StorageConnection = {
      id: editingId || crypto.randomUUID(),
      tenantId,
      name,
      provider: selectedProvider,
      credentials: finalCreds,
      folderPath,
      isActive: true, // Auto-activate on save/edit
      createdAt: new Date().toISOString(), // DB ignores this on update
      updatedAt: new Date().toISOString(),
    };

    await saveConnection(conn);
    await setActiveConnection(conn.id, tenantId);

    // Auto-sync
    try {
      setSyncing(conn.id);
      const result = await syncFiles(conn);
      if (result.success) {
        onFilesLoaded(result.files, conn);
      } else {
        setTestResult({ ok: false, msg: `Connection saved but sync failed: ${result.error}` });
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: `Sync error: ${err.message}` });
    } finally {
      setSyncing(null);
    }

    resetForm();
    setTab('connections');
    await loadConnections();
  };

  const handleActivate = async (conn: StorageConnection) => {
    await setActiveConnection(conn.id, tenantId);

    // Load cached files (use tenantId, not connection id)
    const files = await getCachedFiles(tenantId);
    if (files.length > 0) {
      // Map FileRecord to StorageFile type
      const storageFiles: StorageFile[] = files.map(f => ({
        id: f.id,
        name: f.name,
        url: (f as any).storageUrl || '',
        size: (f as any).sizeBytes || 0,
        contentType: f.contentType,
        metadata: f.metadata,
        uploadedAt: f.uploadedAt
      }));
      onFilesLoaded(storageFiles, conn);
    } else {
      // Try sync
      setSyncing(conn.id);
      const result = await syncFiles(conn);
      setSyncing(null);
      if (result.success) {
        onFilesLoaded(result.files, conn);
      }
    }
    await loadConnections();
  };

  const handleSync = async (conn: StorageConnection) => {
    try {
      setSyncing(conn.id);
      const result = await syncFiles(conn);
      if (result.success) {
        if (conn.isActive) onFilesLoaded(result.files, conn);
        await loadConnections();
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteConnection(id);
    await loadConnections();
  };

  const handleBrowseLocal = async () => {
    try {
      const files = await browseLocalFiles();
      const localConn: StorageConnection = {
        id: 'local-' + Date.now(),
        tenantId,
        name: 'Local Files',
        provider: 'local',
        credentials: {},
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onFilesLoaded(files, localConn);
      onClose();
    } catch { /* cancelled */ }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-brand-600 to-brand-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Storage Manager</h2>
              <p className="text-sm text-brand-200">
                {editingId ? 'Edit Connection' : 'Connect your cloud storage to load photos'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-white/[0.02]">
          {([
            { key: 'connections' as Tab, label: 'My Connections', count: connections.length },
            { key: 'wizard' as Tab, label: '🔺 Vercel Blob Setup', count: null },
            { key: 'add' as Tab, label: '+ Other Providers', count: null },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                resetForm();
                if (t.key === 'wizard') setSelectedProvider('vercel-blob');
              }}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                tab === t.key
                  ? "text-brand-400 bg-white/[0.03] border-b-2 border-brand-500"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.02]"
              )}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-brand-100 text-brand-700">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ─── CONNECTIONS TAB ─── */}
          {tab === 'connections' && (
            <div className="p-6 space-y-4">
              {/* Local Files */}
              <button
                onClick={handleBrowseLocal}
                className="w-full group flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <FolderOpen className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white/90">Browse Local Files</h3>
                  <p className="text-sm text-white/40">Open a folder from your computer</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-brand-500 transition-colors" />
              </button>

              {connections.length === 0 ? (
                <div className="text-center py-12">
                  <Cloud className="w-16 h-16 text-white/10 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white/70 mb-1">No cloud storage connected</h3>
                  <p className="text-sm text-white/30 mb-6">Set up Vercel Blob or another provider to sync your photos</p>
                  <button
                    onClick={() => setTab('wizard')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
                  >
                    <Zap className="w-4 h-4" />
                    Set Up Vercel Blob
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-white/20 uppercase tracking-wider">Cloud Connections</p>
                  {connections.map(conn => {
                    const info = PROVIDER_INFO[conn.provider];
                    const isSyncing = syncing === conn.id;
                    return (
                      <div
                        key={conn.id}
                        className={cn(
                          "rounded-xl border overflow-hidden transition-all",
                          conn.isActive
                            ? "border-brand-500/50 bg-brand-500/5 ring-1 ring-brand-500/20"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="p-4 flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0",
                            conn.isActive ? "bg-brand-500/20 text-brand-400" : "bg-white/5 text-white/40"
                          )}>
                            {info.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-white/90 truncate">{conn.name}</h4>
                              {conn.isActive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary">{info.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary/40">
                              {conn.metadata?.totalFiles !== undefined && (
                                <span>{conn.metadata.totalFiles} files</span>
                              )}
                              {conn.lastSyncAt && (
                                <span>Synced {new Date(conn.lastSyncAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!conn.isActive && (
                              <button
                                onClick={() => handleActivate(conn)}
                                className="px-3 py-1.5 text-xs font-semibold text-brand-300 bg-brand-500/20 rounded-lg hover:bg-brand-500/30 transition-colors"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleSync(conn)}
                              disabled={isSyncing}
                              className="p-2 text-text-secondary/40 hover:text-brand-400 hover:bg-surface-lighter rounded-lg transition-colors disabled:opacity-50"
                              title="Sync"
                            >
                              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                            </button>
                            <button
                              onClick={() => handleEdit(conn)}
                              className="p-2 text-text-secondary/40 hover:text-brand-400 hover:bg-surface-lighter rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(conn.id)}
                              className="p-2 text-text-secondary/40 hover:text-red-400 hover:bg-surface-lighter rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── VERCEL BLOB WIZARD ─── */}
          {tab === 'wizard' && (
            <div className="p-6">
              {/* Progress */}
              <div className="flex items-center gap-2 mb-8">
                {VERCEL_STEPS.map((_, i) => (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all flex-shrink-0",
                      i < wizardStep ? "bg-emerald-500 text-white" :
                        i === wizardStep ? "bg-brand-600 text-white animate-pulse-glow" :
                          "bg-surface-lighter text-text-secondary"
                    )}>
                      {i < wizardStep ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < VERCEL_STEPS.length - 1 && (
                      <div className={cn(
                        "flex-1 h-0.5 rounded-full transition-colors",
                        i < wizardStep ? "bg-emerald-400" : "bg-surface-lighter"
                      )} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="animate-fade-in" key={wizardStep}>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  {VERCEL_STEPS[wizardStep].title}
                </h3>
                <p className="text-text-secondary mb-6">{VERCEL_STEPS[wizardStep].desc}</p>

                {/* Visual Guide */}
                {wizardStep < 3 && (
                  <div className="mb-6">
                    {/* Step-specific visual */}
                    {wizardStep === 0 && (
                      <div className="rounded-xl border border-border overflow-hidden">
                        <div className="bg-gray-900 px-4 py-2 flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                          </div>
                          <div className="flex-1 flex justify-center">
                            <div className="bg-surface text-text-secondary/60 text-xs px-4 py-1 rounded-full">
                              vercel.com/dashboard/stores
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-950 p-6">
                          <div className="flex items-center gap-6 mb-6">
                            <div className="text-white font-bold text-lg flex items-center gap-2">
                              <span className="text-xl">▲</span> Vercel
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className="text-text-secondary/60">Overview</span>
                              <span className="text-text-secondary/60">Projects</span>
                              <span className="text-text-primary font-medium border-b-2 border-text-primary pb-1">Storage</span>
                              <span className="text-text-secondary/60">Settings</span>
                            </div>
                          </div>
                          <div className="bg-surface rounded-lg p-4 border border-border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-white font-semibold">Storage</h4>
                              <div className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-md">Create Database</div>
                            </div>
                            <p className="text-text-secondary text-sm">Create a serverless database or object store.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 1 && (
                      <div className="rounded-xl border border-border overflow-hidden">
                        <div className="bg-gray-900 px-4 py-2 flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                          </div>
                          <div className="flex-1 flex justify-center">
                            <div className="bg-surface text-text-secondary/60 text-xs px-4 py-1 rounded-full">
                              vercel.com/stores/create
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-950 p-6">
                          <h4 className="text-white font-semibold mb-4 text-center">Create New Store</h4>
                          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                            {['Postgres', 'KV', 'Edge Config'].map(t => (
                              <div key={t} className="p-3 rounded-lg border border-gray-800 bg-gray-900">
                                <p className="text-text-secondary/60 text-sm text-center">{t}</p>
                              </div>
                            ))}
                            <div className="p-3 rounded-lg border-2 border-brand-500 bg-brand-950 ring-1 ring-brand-400">
                              <p className="text-white text-sm font-semibold text-center flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-brand-400" />
                                Blob ← Select this
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 max-w-sm mx-auto">
                            <div className="bg-surface border border-border rounded-lg p-3">
                              <label className="text-text-secondary/60 text-xs block mb-1">Store Name</label>
                              <div className="bg-gray-800 rounded px-3 py-2 text-white text-sm">my-photos</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="rounded-xl border border-border overflow-hidden">
                        <div className="bg-gray-900 px-4 py-2 flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                          </div>
                          <div className="flex-1 flex justify-center">
                            <div className="bg-surface text-text-secondary/60 text-xs px-4 py-1 rounded-full">
                              vercel.com/stores/my-photos
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-950 p-6 space-y-3">
                          <div className="flex gap-4 text-sm mb-4">
                            <span className="text-text-secondary/60">Browser</span>
                            <span className="text-text-primary font-medium border-b-2 border-text-primary pb-1">.env.local</span>
                            <span className="text-text-secondary/60">Settings</span>
                          </div>
                          <div className="bg-surface rounded-lg border border-border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <code className="text-text-secondary/60 text-sm">BLOB_READ_WRITE_TOKEN=</code>
                              <button className="text-xs text-brand-400 font-medium flex items-center gap-1">
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                            </div>
                            <div className="bg-gray-800 rounded px-3 py-2 text-sm font-mono">
                              <span className="text-emerald-400">vercel_blob_rw_</span>
                              <span className="text-gray-500">xxxxxxxxxxxxxxxx_xxxxxxxxx</span>
                            </div>
                            <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-800/30 rounded-lg p-3">
                              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-300/80">
                                Copy the <strong>full token value</strong> — it starts with <code className="bg-amber-900/30 px-1 rounded">vercel_blob_rw_</code>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Checklist */}
                <div className="space-y-2 mb-6">
                  {VERCEL_STEPS[wizardStep].details.map((d, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="text-text-secondary">{d}</span>
                    </div>
                  ))}
                </div>

                {/* External Link */}
                {VERCEL_STEPS[wizardStep].action && (
                  <a
                    href={VERCEL_STEPS[wizardStep].action!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/10 border border-white/10 rounded-lg hover:bg-white/20 transition-colors mb-6"
                  >
                    {VERCEL_STEPS[wizardStep].actionLabel}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {/* Step 4: Input form */}
                {wizardStep === 3 && (
                  <div className="space-y-4 bg-surface-lighter/30 rounded-xl p-5 border border-border">
                    <div>
                      <label className="block text-sm font-semibold text-text-secondary mb-1.5">Connection Name *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="My Photo Storage"
                        className="w-full px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-surface-light text-text-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                        BLOB_READ_WRITE_TOKEN *
                      </label>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={token}
                          onChange={e => setToken(e.target.value)}
                          placeholder="vercel_blob_rw_xxxxxxxxxxxxxxxxxx"
                          className="w-full px-4 py-2.5 pr-12 text-sm font-mono border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-surface-light text-text-primary"
                        />
                        <button
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Shield className="w-3 h-3 text-emerald-500" />
                        <p className="text-xs text-text-secondary/40">Stored locally in your browser only. Never sent to our servers.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                        Folder Prefix <span className="text-text-secondary/30 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={folderPath}
                        onChange={e => setFolderPath(e.target.value)}
                        placeholder="photos/"
                        className="w-full px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-surface-light text-text-primary"
                      />
                      <p className="text-xs text-text-secondary/30 mt-1">Only sync files under this path. Leave empty for all files.</p>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                      <div className={cn(
                        "flex items-center gap-3 p-3 rounded-lg",
                        testResult.ok ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                      )}>
                        {testResult.ok
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        }
                        <p className={cn("text-sm font-medium", testResult.ok ? "text-emerald-200" : "text-red-200")}>
                          {testResult.msg}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleTest}
                        disabled={testing || !token.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Test Connection
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!name.trim() || !token.trim() || syncing !== null}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
                      >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {editingId ? 'Update Connection' : 'Save & Connect'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Navigation */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
                <button
                  onClick={() => setWizardStep(Math.max(0, wizardStep - 1))}
                  disabled={wizardStep === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary/50 hover:text-text-primary transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {wizardStep < VERCEL_STEPS.length - 1 && (
                  <button
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-text-primary bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── OTHER PROVIDERS TAB ─── */}
          {tab === 'add' && (
            <div className="p-6">
              {!selectedProvider ? (
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary mb-4">Select a cloud storage provider to connect:</p>
                  {(Object.keys(PROVIDER_INFO) as StorageProvider[]).filter(k => k !== 'local' && k !== 'vercel-blob').map(key => {
                    const info = PROVIDER_INFO[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedProvider(key)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-surface-lighter flex items-center justify-center text-xl group-hover:bg-brand-500/20 transition-colors">
                          {info.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-text-primary/90">{info.name}</h4>
                          <p className="text-sm text-text-secondary">{info.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-secondary/20 group-hover:text-brand-400 transition-colors" />
                      </button>
                    );
                  })}

                  {/* Vercel Blob shortcut */}
                  <div className="mt-4 p-4 bg-brand-500/5 rounded-xl border border-brand-500/10">
                    <div className="flex items-center gap-3">
                      <Info className="w-5 h-5 text-brand-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-brand-200">Looking for Vercel Blob?</p>
                        <p className="text-sm text-white/50">
                          Use the <button onClick={() => setTab('wizard')} className="text-brand-400 underline font-semibold hover:text-brand-300">Vercel Blob Setup</button> tab for a guided setup experience.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <button onClick={() => setSelectedProvider(null)} className="flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-800">
                    <ChevronLeft className="w-4 h-4" /> Back to providers
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-lg">
                      {PROVIDER_INFO[selectedProvider].icon}
                    </div>
                    <h3 className="text-lg font-bold text-text-primary/90">{PROVIDER_INFO[selectedProvider].name}</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/60 mb-1.5">Connection Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={`My ${PROVIDER_INFO[selectedProvider].name}`}
                      className="w-full px-4 py-2.5 text-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white/5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Folder Path (optional)</label>
                    <input
                      type="text"
                      value={folderPath}
                      onChange={e => setFolderPath(e.target.value)}
                      placeholder="photos/"
                      className="w-full px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-surface-light text-text-primary"
                    />
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    <p className="text-xs font-semibold text-text-secondary/20 uppercase tracking-wider">Credentials</p>
                    {PROVIDER_INFO[selectedProvider].fields.map(field => (
                      <div key={String(field.key)}>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type={field.type}
                          value={(creds as any)[String(field.key)] || ''}
                          onChange={e => setCreds(prev => ({ ...prev, [String(field.key)]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-surface-light text-text-primary"
                        />
                      </div>
                    ))}
                  </div>

                  {testResult && (
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      testResult.ok ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                    )}>
                      {testResult.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                      <p className={cn("text-sm font-medium", testResult.ok ? "text-emerald-200" : "text-red-200")}>
                        {testResult.msg}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-secondary bg-surface-lighter border border-border rounded-lg hover:bg-surface-light disabled:opacity-40 transition-colors"
                    >
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Test Connection
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!name.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-40"
                    >
                      Save & Connect
                    </button>
                  </div>

                  <div className="p-3 bg-brand-500/5 rounded-lg border border-brand-500/10 mt-4">
                    <a
                      href={getDocsUrl(selectedProvider)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View {PROVIDER_INFO[selectedProvider].name} documentation
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div >
  );
}

function getDocsUrl(p: StorageProvider): string {
  const m: Record<StorageProvider, string> = {
    'vercel-blob': 'https://vercel.com/docs/storage/vercel-blob',
    'aws-s3': 'https://docs.aws.amazon.com/s3/',
    'gcs': 'https://cloud.google.com/storage/docs',
    'supabase': 'https://supabase.com/docs/guides/storage',
    'cloudflare-r2': 'https://developers.cloudflare.com/r2/',
    'local': '#',
  };
  return m[p] || '#';
}
