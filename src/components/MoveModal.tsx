import { useState } from 'react';
import { X, Folder, AlertTriangle, Check, FolderPlus, ArrowRight, HardDrive, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { StorageConnection } from '@/types/storage';

interface MoveModalProps {
    photos: { id: string; name: string; folder: string; size: number }[];
    existingFolders: string[];
    initialFolder: string;
    connections?: StorageConnection[];
    activeConnId?: string;
    onConfirm: (newFolder: string, targetConnId?: string) => void;
    onClose: () => void;
}

export function MoveModal({ photos, existingFolders, initialFolder, connections = [], activeConnId, onConfirm, onClose }: MoveModalProps) {
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [targetConnId, setTargetConnId] = useState<string | undefined>(activeConnId);
    const [newFolderInput, setNewFolderInput] = useState('');
    const [mode, setMode] = useState<'existing' | 'new'>('existing');
    const [showPreview, setShowPreview] = useState(false);

    const isCrossProvider = targetConnId && targetConnId !== activeConnId;

    // Filter out current folder from suggestions ONLY if on same connection
    const folders = (!isCrossProvider)
        ? existingFolders.filter(f => f !== initialFolder)
        : existingFolders; // If cross provider, show all as valid targets

    const handleConfirm = () => {
        const folder = mode === 'new' ? newFolderInput.trim() : selectedFolder;
        if (!folder) return;

        if (isCrossProvider && !showPreview) {
            setShowPreview(true);
            return;
        }

        onConfirm(folder, targetConnId);
    };

    const totalSize = photos.reduce((acc, p) => acc + p.size, 0);
    const sourceConn = connections.find(c => c.id === activeConnId);
    const destConn = connections.find(c => c.id === targetConnId);

    function formatSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div
                className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-surface-lighter">
                    <div>
                        <h3 className="text-lg font-bold text-white">Move {photos.length} Item{photos.length !== 1 && 's'}</h3>
                        <p className="text-xs text-white/40 mt-0.5">Choose target connection and folder</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                    {showPreview ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex flex-col items-center justify-center py-6 gap-4">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                                            <HardDrive className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">{sourceConn?.name || 'Current'}</span>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-brand-500 animate-pulse" />
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                                            <HardDrive className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-bold text-brand-400 uppercase tracking-tighter">{destConn?.name || 'Target'}</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h4 className="text-lg font-bold text-white">Migration Preview</h4>
                                    <p className="text-xs text-white/40">Confirm details before starting transfer</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/30">Total Items</span>
                                        <span className="text-white font-bold">{photos.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/30">Total Size</span>
                                        <span className="text-white font-bold">{formatSize(totalSize)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/30">Target Folder</span>
                                        <span className="text-brand-400 font-bold">{mode === 'new' ? newFolderInput.trim() : selectedFolder}</span>
                                    </div>
                                </div>

                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-400/80 leading-relaxed">
                                        This process uses client-side bridging. Please keep this tab open during the transfer to ensure all data is migrated correctly.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 1. Target Connection */}
                            {connections.length > 1 && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Target Storage</label>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {connections.map(conn => (
                                            <button
                                                key={conn.id}
                                                onClick={() => setTargetConnId(conn.id)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                                    targetConnId === conn.id
                                                        ? "bg-brand-500/10 border-brand-500/50 text-white"
                                                        : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.04] hover:border-white/10"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                                    targetConnId === conn.id ? "bg-brand-500/20" : "bg-white/5"
                                                )}>
                                                    <HardDrive className={cn("w-4 h-4", targetConnId === conn.id ? "text-brand-400" : "text-white/20")} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate">{conn.name}</p>
                                                    <p className="text-[10px] opacity-40 uppercase">{conn.provider}</p>
                                                </div>
                                                {targetConnId === conn.id && <Check className="w-4 h-4 text-brand-400" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 2. Mode Tabs */}
                            <div className="flex p-1 bg-white/[0.04] rounded-xl">
                                <button
                                    onClick={() => setMode('existing')}
                                    className={cn(
                                        "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                        mode === 'existing' ? "bg-brand-500 text-white shadow-lg" : "text-white/40 hover:text-white"
                                    )}
                                >
                                    Existing Folder
                                </button>
                                <button
                                    onClick={() => setMode('new')}
                                    className={cn(
                                        "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                        mode === 'new' ? "bg-brand-500 text-white shadow-lg" : "text-white/40 hover:text-white"
                                    )}
                                >
                                    New Folder
                                </button>
                            </div>

                            {/* Existing Folders List */}
                            {mode === 'existing' && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {folders.length === 0 ? (
                                            <div className="text-center py-6 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                                                <Folder className="w-6 h-6 text-white/10 mx-auto mb-2" />
                                                <p className="text-xs text-white/30 tracking-tight">No other folders found.</p>
                                            </div>
                                        ) : (
                                            folders.map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setSelectedFolder(f)}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-xl border text-left transition-all group",
                                                        selectedFolder === f
                                                            ? "bg-brand-500/10 border-brand-500/50 text-white"
                                                            : "bg-surface-lighter border-white/5 text-white/50 hover:bg-white/[0.03] hover:border-white/10"
                                                    )}
                                                >
                                                    <Folder className={cn("w-4 h-4 transition-colors", selectedFolder === f ? "fill-brand-500 text-brand-400" : "fill-white/5 text-white/30 group-hover:text-white/50")} />
                                                    <span className="text-sm font-medium truncate">{f}</span>
                                                    {selectedFolder === f && <Check className="w-4 h-4 ml-auto text-brand-400" />}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* New Folder Input */}
                            {mode === 'new' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 flex flex-col items-center justify-center text-center">
                                        <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center mb-2.5">
                                            <FolderPlus className="w-5 h-5 text-brand-400" />
                                        </div>
                                        <h4 className="text-sm font-bold text-brand-200">Create New Target</h4>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Target Name</label>
                                        <input
                                            value={newFolderInput}
                                            onChange={e => setNewFolderInput(e.target.value)}
                                            placeholder="e.g. Vacation 2024"
                                            autoFocus
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all font-medium"
                                            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Conflict/Info Warning */}
                            <div className={cn(
                                "p-3.5 rounded-xl border flex gap-3.5 transition-colors",
                                isCrossProvider ? "bg-amber-500/10 border-amber-500/20" : "bg-white/[0.02] border-white/5"
                            )}>
                                {isCrossProvider ? (
                                    <RefreshCw className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5 animate-spin-slow" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-white/20 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="space-y-1">
                                    <p className={cn("text-xs font-bold", isCrossProvider ? "text-amber-400" : "text-white/40")}>
                                        {isCrossProvider ? 'Provider Transfer' : 'Local Metadata Move'}
                                    </p>
                                    <p className="text-[10px] text-white/30 leading-relaxed font-medium">
                                        {isCrossProvider
                                            ? `Files will be downloaded from your current storage and re-uploaded to ${destConn?.name || 'target Provider'}. Progress depends on file size.`
                                            : 'Items will be updated in your metadata table. Physical files are not moved.'}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-surface-lighter flex gap-3">
                    <button
                        onClick={showPreview ? () => setShowPreview(false) : onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        {showPreview ? 'Back' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!showPreview && (mode === 'existing' ? !selectedFolder : !newFolderInput.trim())}
                        className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active-press"
                    >
                        {showPreview ? 'Confirm and Start' : (isCrossProvider ? 'Continue to Preview' : 'Move Items')}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
