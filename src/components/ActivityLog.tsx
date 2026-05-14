import { useEffect, useState } from 'react';
import { X, History, FileUp, FileEdit, Move, Trash2, Settings, Globe, CheckCircle2, User } from 'lucide-react';
import { AuditEntry } from '@/types/schema';
import { getAuditLogs } from '@/lib/tenant-db';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogProps {
    tenantId: string;
    onClose: () => void;
}

export function ActivityLog({ tenantId, onClose }: ActivityLogProps) {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await getAuditLogs(tenantId);
                setLogs(data);
            } catch (err) {
                console.error('Failed to fetch logs:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [tenantId]);

    const getLogIcon = (action: string) => {
        switch (action.toLowerCase()) {
            case 'upload': return <FileUp className="w-4 h-4 text-emerald-400" />;
            case 'rename': return <FileEdit className="w-4 h-4 text-blue-400" />;
            case 'move': return <Move className="w-4 h-4 text-amber-400" />;
            case 'delete': return <Trash2 className="w-4 h-4 text-red-400" />;
            case 'save_connection': return <Settings className="w-4 h-4 text-purple-400" />;
            case 'activate_connection': return <Globe className="w-4 h-4 text-brand-400" />;
            case 'sync_files': return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
            default: return <History className="w-4 h-4 text-white/40" />;
        }
    };

    const formatAction = (action: string) => {
        return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-end animate-fade-in p-0 sm:p-4">
            <div
                className="w-full max-w-md h-full sm:h-[90vh] bg-surface border-l sm:border border-white/10 sm:rounded-2xl shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface-lighter/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
                            <History className="w-5 h-5 text-brand-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Activity Log</h3>
                            <p className="text-[10px] text-text-secondary/40 uppercase font-bold tracking-widest mt-0.5">Audit Trail</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-text-secondary/40 hover:text-text-primary hover:bg-surface-lighter transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-text-secondary font-medium animate-pulse">Scanning records...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-10">
                            <div className="w-16 h-16 rounded-full bg-surface-lighter border border-dashed border-border flex items-center justify-center">
                                <History className="w-8 h-8 text-text-secondary/20" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary/60 font-semibold lowercase">No records found</p>
                                <p className="text-xs text-text-secondary/30 mt-1">Tenant activity will appear here as it happens.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 pb-8">
                            {logs.map((log) => (
                                <div key={log.id} className="p-4 rounded-xl bg-surface-light border border-border hover:border-brand-500/20 hover:bg-surface transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-500/0 group-hover:bg-brand-500/50 transition-all" />

                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 p-2 rounded-lg bg-surface-lighter group-hover:bg-brand-500/10 transition-colors shrink-0">
                                            {getLogIcon(log.action)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-sm font-bold text-text-primary tracking-tight">
                                                    {formatAction(log.action)}
                                                </span>
                                                <span className="text-[10px] text-text-secondary/40 bg-surface-lighter px-1.5 py-0.5 rounded-md font-medium">
                                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>

                                            <p className="text-xs text-text-secondary break-words leading-relaxed">
                                                {log.target || 'System action'}
                                            </p>

                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-500/5 border border-brand-500/10">
                                                    <User className="w-2.5 h-2.5 text-brand-400" />
                                                    <span className="text-[9px] font-bold text-brand-300/80 uppercase tracking-tighter">
                                                        {log.userId ? log.userId.slice(0, 8) : 'System'}
                                                    </span>
                                                </div>

                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                    <button
                                                        className="text-[9px] font-bold text-white/20 hover:text-white/40 uppercase tracking-widest transition-colors"
                                                        onClick={() => console.log('Log Metadata:', log.metadata)}
                                                    >
                                                        View Raw Data
                                                    </button>
                                                )}
                                            </div>

                                            {/* Expanding metadata if we wanted to, but for now just showing it's there */}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-surface-lighter/30">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] text-text-secondary/20 font-bold uppercase tracking-[0.2em]">Secure Audit Trail</span>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                            <div className="w-1 h-1 rounded-full bg-emerald-500/20" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
