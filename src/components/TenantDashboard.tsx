
import { useState, useEffect } from 'react';
import {
    Database, Image as ImageIcon, Video,
    Folder, Clock, Cloud, HardDrive, ArrowRight,
    Activity, Plus, LayoutGrid, Zap, TrendingUp
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Tenant, User, AuditEntry, StorageConnectionRecord } from '@/types/schema';



interface Props {
    tenant: Tenant;
    user: User;
    stats: {
        totalSize: number;
        count: number;
        images: number;
        videos: number;
    };
    activeConn: StorageConnectionRecord | null;
    health: { status: string; latencyMs: number } | null;
    recentActivities: AuditEntry[];
    folders: string[];
    currentPath: string;
    onNavigateFolder: (folder: string) => void;
    onUpload: () => void;
    onConnect: () => void;
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (value === 0) { setDisplay(0); return; }
        const duration = 800;
        const steps = 30;
        const increment = value / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= value) { setDisplay(value); clearInterval(timer); }
            else setDisplay(Math.floor(current));
        }, duration / steps);
        return () => clearInterval(timer);
    }, [value]);
    return <span className="tabular-nums">{display.toLocaleString()}{suffix}</span>;
}

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

export function TenantDashboard({
    tenant,
    user,
    stats,
    activeConn,
    health,
    recentActivities,
    folders,
    currentPath,
    onNavigateFolder,
    onUpload,
    onConnect
}: Props) {

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const userName = user?.name || 'User';
    const tenantName = tenant?.name || 'Workspace';
    const tenantPlan = tenant?.plan || 'free';
    const storageLimit = (tenantPlan === 'pro' ? 50 : 1) * 1024 * 1024 * 1024;
    const storagePercentage = Math.min(100, (stats.totalSize / storageLimit) * 100);
    const greeting = getGreeting();

    return (
        <div className="flex-1 overflow-y-auto bg-gradient-mesh text-text-primary p-6 md:p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* ═══ HERO HEADER ═══ */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in-up">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400 mb-2 animate-fade-in">{greeting}</p>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                            Welcome back,{' '}
                            <span className="text-gradient-brand">{userName.split(' ')[0]}</span>
                        </h1>
                        <p className="text-text-secondary text-sm mt-2 flex items-center gap-2">
                            Managing <strong className="text-text-primary/70">{tenantName}</strong>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                                <Zap className="w-2.5 h-2.5" />
                                {tenantPlan}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onConnect}
                            className="px-5 py-2.5 rounded-xl bg-surface-light border border-border hover:border-brand-500/30 hover:bg-surface-lighter transition-all text-sm font-semibold text-text-secondary hover:text-text-primary flex items-center gap-2 active-press"
                        >
                            <Database className="w-4 h-4" />
                            Manage Storage
                        </button>
                        <button
                            onClick={onUpload}
                            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 transition-all text-sm font-bold text-white shadow-lg shadow-brand-500/20 flex items-center gap-2 hover:shadow-brand-500/30 active-press"
                        >
                            <Plus className="w-4 h-4" />
                            Upload Photos
                        </button>
                    </div>
                </header>

                {/* ═══ STATS GRID ═══ */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

                    {/* Storage Card — spans 2 cols */}
                    <div className="lg:col-span-2 glass-card-premium rounded-2xl p-6 animate-fade-in-up delay-100">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shadow-glow-brand/20">
                                        <Cloud className="w-5 h-5 text-brand-400" />
                                    </div>
                                    <div>
                                        <span className="font-bold text-sm text-text-primary">Storage</span>
                                        <div className="text-[10px] text-text-secondary/60 uppercase tracking-widest font-bold">Health Monitor</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-text-primary tabular-nums">
                                        <AnimatedCounter value={Math.round(storagePercentage)} suffix="%" />
                                    </div>
                                    <div className="text-[10px] text-text-secondary/50 uppercase tracking-widest font-bold">Capacity</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="h-3 w-full bg-surface-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000 ease-out relative",
                                            storagePercentage > 90
                                                ? "bg-gradient-to-r from-red-600 to-orange-500"
                                                : storagePercentage > 70
                                                    ? "bg-gradient-to-r from-amber-500 to-orange-400"
                                                    : "bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400"
                                        )}
                                        style={{ width: `${storagePercentage}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse-soft rounded-full" />
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-text-secondary">{formatSize(stats.totalSize)} Used</span>
                                    <span className="text-text-tertiary">{formatSize(storageLimit)} Limit</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Files */}
                    <div className="glass-card-premium rounded-2xl p-6 animate-fade-in-up delay-200">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-3xl font-black mb-1 text-text-primary">
                            <AnimatedCounter value={stats.count} />
                        </div>
                        <div className="text-[10px] text-text-secondary/60 font-bold uppercase tracking-widest">Total Files</div>
                    </div>

                    {/* Images */}
                    <div className="glass-card-premium rounded-2xl p-6 animate-fade-in-up delay-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                <Video className="w-5 h-5 text-purple-400" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <div>
                                <div className="text-2xl font-black text-text-primary"><AnimatedCounter value={stats.images} /></div>
                                <div className="text-[10px] text-text-secondary/60 font-bold uppercase tracking-widest">Images</div>
                            </div>
                            <div className="w-px h-8 bg-border" />
                            <div>
                                <div className="text-2xl font-black text-text-primary"><AnimatedCounter value={stats.videos} /></div>
                                <div className="text-[10px] text-text-secondary/60 font-bold uppercase tracking-widest">Videos</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ MAIN CONTENT ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ─── Left Column: Folders + Infrastructure ─── */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Quick Access Folders */}
                        <section className="animate-fade-in-up delay-300">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold flex items-center gap-2.5">
                                    <Folder className="w-5 h-5 text-brand-400" />
                                    Quick Access
                                </h2>
                                <button
                                    onClick={() => onNavigateFolder('')}
                                    className="text-xs font-bold text-text-tertiary hover:text-brand-400 transition-colors flex items-center gap-1.5 group"
                                >
                                    BROWSE ALL
                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {folders.length === 0 ? (
                                    <div className="col-span-2 py-14 rounded-2xl border border-dashed border-border/60 flex flex-col items-center justify-center text-center">
                                        <div className="w-14 h-14 rounded-full bg-surface-lighter flex items-center justify-center mb-4 animate-pulse-soft">
                                            <LayoutGrid className="w-7 h-7 text-text-tertiary" />
                                        </div>
                                        <p className="text-sm text-text-tertiary max-w-xs">No folders yet. Upload photos or connect storage to get started.</p>
                                    </div>
                                ) : (
                                    folders.slice(0, 6).map((folder, i) => (
                                        <button
                                            key={folder}
                                            onClick={() => onNavigateFolder(folder)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl bg-surface-light border border-border/50 hover:border-brand-500/30 hover:bg-surface-lighter transition-all group text-left hover-lift",
                                                `animate-fade-in-up delay-${(i + 1) * 100}`
                                            )}
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-brand-500/8 flex items-center justify-center text-brand-400 group-hover:scale-110 group-hover:bg-brand-500/15 transition-all">
                                                <Folder className="w-6 h-6 fill-brand-500/15" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm truncate text-text-primary/90 group-hover:text-text-primary transition-colors">{folder}</div>
                                                <div className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest mt-0.5">Folder</div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:translate-x-1 transition-transform group-hover:text-brand-400" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Active Infrastructure */}
                        <section className="animate-fade-in-up delay-400">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2.5 text-text-secondary">
                                <Cloud className="w-4 h-4" />
                                Active Infrastructure
                            </h2>
                            {activeConn ? (
                                <div className="glass-card-premium rounded-2xl p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-surface-lighter border border-border flex items-center justify-center">
                                            {activeConn.provider === 'local'
                                                ? <HardDrive className="w-6 h-6 text-text-tertiary" />
                                                : <Cloud className="w-6 h-6 text-brand-400" />
                                            }
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{activeConn.name}</div>
                                            <div className="text-xs text-brand-400/60 font-medium mt-0.5">
                                                {activeConn.provider.toUpperCase()} · Updated {new Date(activeConn.updatedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {health ? (
                                            <div className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                                                health.status === 'healthy'
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    : "bg-red-500/10 border-red-500/20 text-red-400"
                                            )}>
                                                <span className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    health.status === 'healthy' ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-pulse"
                                                )} />
                                                {health.status === 'healthy' ? 'Operational' : 'Issues Detected'}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-muted border border-border text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
                                                Checking...
                                            </div>
                                        )}
                                        {health && (
                                            <span className="text-[10px] text-text-tertiary tabular-nums">{health.latencyMs}ms latency</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={onConnect}
                                    className="w-full rounded-2xl p-8 border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-light hover:border-brand-500/20 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-surface-lighter flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Plus className="w-6 h-6 text-text-tertiary group-hover:text-brand-400 transition-colors" />
                                    </div>
                                    <p className="text-sm text-text-tertiary group-hover:text-text-secondary transition-colors">
                                        No active connection. <span className="text-brand-400 font-semibold">Connect storage</span>
                                    </p>
                                </button>
                            )}
                        </section>
                    </div>

                    {/* ─── Right Column: Activity Feed ─── */}
                    <aside className="space-y-5 animate-fade-in-up delay-400">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2.5">
                                <Activity className="w-5 h-5 text-brand-400" />
                                Live Feed
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Live</span>
                            </div>
                        </div>

                        <div className="space-y-0 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                            {recentActivities.length === 0 ? (
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-surface-lighter flex items-center justify-center mb-4 animate-pulse-soft">
                                        <Clock className="w-6 h-6 text-text-tertiary" />
                                    </div>
                                    <p className="text-xs text-text-tertiary">No recent activity</p>
                                </div>
                            ) : (
                                recentActivities.map((log, i) => (
                                    <div
                                        key={log.id}
                                        className={cn(
                                            "relative pl-6 py-4 border-l-2 border-border/50 last:pb-0 hover:border-l-brand-500/40 transition-colors group",
                                            i === 0 && "border-l-brand-500/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute left-[-5px] top-5 w-2 h-2 rounded-full border-2 border-surface transition-colors",
                                            i === 0 ? "bg-brand-500 shadow-glow-brand" : "bg-surface-muted group-hover:bg-brand-400"
                                        )} />
                                        <div className="text-sm text-text-primary/80 leading-relaxed">
                                            <span className="font-bold text-brand-400 capitalize">{log.action.replace('_', ' ')}</span>
                                            {' '}on{' '}
                                            <span className="text-text-secondary font-medium">{log.target}</span>
                                        </div>
                                        <div className="text-[10px] text-text-tertiary mt-1.5 font-medium tabular-nums">
                                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {' · '}
                                            {new Date(log.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button className="w-full py-3.5 rounded-xl bg-surface-light border border-border/50 text-xs font-bold text-text-tertiary hover:text-text-secondary hover:bg-surface-lighter hover:border-brand-500/20 transition-all uppercase tracking-widest">
                            View Full Audit Trail
                        </button>
                    </aside>
                </div>
            </div>
        </div>
    );
}
