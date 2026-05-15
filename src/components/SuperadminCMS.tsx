import React, { useState } from 'react';
import {
    Users, Building2, LayoutDashboard, Settings,
    ShieldCheck, Activity, Search,
    ChevronRight, ArrowUpRight, ArrowDownRight,
    Database, Cloud, LogOut, Zap
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Tenant, User, AuditEntry } from '@/types/schema';

interface Stats {
    totalTenants: number;
    totalUsers: number;
    totalStorage: number;
    activeConnections: number;
}

interface Props {
    currentUser: User;
    tenants: Tenant[];
    globalLogs: AuditEntry[];
    stats: Stats;
    onManageTenant: (tenant: Tenant) => void;
    onLogout: () => void;
}

export function SuperadminCMS({
    currentUser,
    tenants,
    globalLogs,
    stats,
    onManageTenant,
    onLogout
}: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'logs' | 'settings'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [llmProvider, setLlmProvider] = useState('gemini');
    const [llmConfig, setLlmConfig] = useState<any>({
        openai_api_key: '', gemini_api_key: '', qwen_api_key: '', glm_api_key: '', custom_api_key: '', custom_base_url: '', custom_model: ''
    });
    const [settingsSaving, setSettingsSaving] = useState(false);

    React.useEffect(() => {
        if (activeTab === 'settings') {
            fetch(process.env.EXPO_PUBLIC_API_URL + '/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelvault_token') || ''}` }
            }).then(r => r.json()).then(data => {
                if (data.active_llm_provider) setLlmProvider(data.active_llm_provider);
                if (data.llm_config) setLlmConfig(data.llm_config);
            }).catch(console.error);
        }
    }, [activeTab]);

    const handleSaveSettings = async () => {
        setSettingsSaving(true);
        try {
            await fetch(process.env.EXPO_PUBLIC_API_URL + '/api/admin/settings', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('pixelvault_token') || ''}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active_llm_provider: llmProvider, llm_config: llmConfig })
            });
            alert('Settings saved globally!');
        } catch (e) {
            console.error(e);
            alert('Failed to save settings');
        }
        setSettingsSaving(false);
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-[#07070a] text-white overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0c0c12] border-r border-white/[0.05] flex flex-col pt-8">
                <div className="px-8 mb-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight leading-none">Superadmin</h1>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Management CMS</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavItem
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                        icon={<LayoutDashboard className="w-4 h-4" />}
                        label="Overview"
                    />
                    <NavItem
                        active={activeTab === 'tenants'}
                        onClick={() => setActiveTab('tenants')}
                        icon={<Building2 className="w-4 h-4" />}
                        label="Tenant Gallery"
                    />
                    <NavItem
                        active={activeTab === 'logs'}
                        onClick={() => setActiveTab('logs')}
                        icon={<Activity className="w-4 h-4" />}
                        label="System Logs"
                    />
                    <div className="pt-8 pb-4">
                        <p className="px-4 text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Internal Tools</p>
                        <NavItem
                            active={activeTab === 'settings'}
                            onClick={() => setActiveTab('settings')}
                            icon={<Settings className="w-4 h-4" />}
                            label="Global Settings"
                        />
                    </div>
                </nav>

                <div className="p-6 mt-auto border-t border-white/[0.03]">
                    <div className="flex items-center gap-3 mb-6 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border border-indigo-500/20">
                            <span className="text-sm font-bold text-indigo-300">{currentUser.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white/80 truncate">{currentUser.name}</p>
                            <p className="text-[10px] text-white/30 truncate">System Authority</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all border border-red-500/10"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative bg-[#07070a]">
                {/* Top Header */}
                <header className="sticky top-0 z-10 bg-[#07070a]/80 backdrop-blur-xl border-b border-white/[0.05] px-10 py-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black capitalize tracking-tight">{activeTab}</h2>
                        <p className="text-xs text-white/30 font-medium">Global platform control center</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search across platform..."
                                className="bg-[#0c0c12] border border-white/[0.06] rounded-2xl pl-11 pr-5 py-3 text-sm text-white w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-white/10"
                            />
                        </div>
                        <div className="w-px h-6 bg-white/10 mx-2" />
                        <button className="relative w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group hover:bg-indigo-500/20 transition-all">
                            <Activity className="w-5 h-5 text-indigo-400" />
                            <span className="absolute top-[-2px] right-[-2px] w-3 h-3 bg-red-500 rounded-full border-2 border-[#07070a] animate-pulse" />
                        </button>
                    </div>
                </header>

                <div className="p-10">
                    {activeTab === 'overview' && (
                        <div className="space-y-10 animate-fade-in">
                            {/* Global Stats cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard
                                    label="Total Managed Tenants"
                                    value={stats.totalTenants.toLocaleString()}
                                    icon={<Building2 className="w-5 h-5" />}
                                    color="indigo"
                                />
                                <StatCard
                                    label="Registered Users"
                                    value={stats.totalUsers.toLocaleString()}
                                    icon={<Users className="w-5 h-5" />}
                                    color="blue"
                                />
                                <StatCard
                                    label="Total Platform Assets"
                                    value={formatSize(stats.totalStorage)}
                                    icon={<Database className="w-5 h-5" />}
                                    color="purple"
                                />
                                <StatCard
                                    label="Active Cloud Pipes"
                                    value={stats.activeConnections.toLocaleString()}
                                    icon={<Cloud className="w-5 h-5" />}
                                    color="cyan"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Recent Global Activity */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-indigo-400" />
                                            Global Event Stream
                                        </h3>
                                        <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300">SEE FULL AUDIT →</button>
                                    </div>
                                    <div className="bg-[#0c0c12] border border-white/[0.05] rounded-3xl overflow-hidden">
                                        <div className="divide-y divide-white/[0.03]">
                                            {globalLogs.slice(0, 10).map((log) => {
                                                const tenant = tenants.find(t => t.id === log.tenantId);
                                                return (
                                                    <div key={log.id} className="p-6 flex items-start gap-5 hover:bg-white/[0.01] transition-colors group">
                                                        <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover:border-indigo-500/30 transition-all">
                                                            <Activity className="w-4 h-4 text-white/20 group-hover:text-indigo-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <span className="text-xs font-bold text-white/20 uppercase tracking-widest">{tenant?.name || 'Unknown Tenant'}</span>
                                                                <span className="text-[10px] text-white/15 font-medium">{new Date(log.createdAt).toLocaleString()}</span>
                                                            </div>
                                                            <p className="text-sm font-medium text-white/80">
                                                                <span className="text-indigo-400 font-bold capitalize">{log.action.replace('_', ' ')}</span>
                                                                <span className="mx-2 text-white/10">→</span>
                                                                <span className="text-white/50">{log.target}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {globalLogs.length === 0 && (
                                                <div className="p-12 text-center">
                                                    <p className="text-sm text-white/20 italic">No events recorded in the last 24h</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Performance / System Health */}
                                <div className="space-y-8">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-yellow-400" />
                                        System Heartbeat
                                    </h3>
                                    <div className="rounded-3xl bg-indigo-600/5 border border-indigo-500/15 p-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all" />
                                        <div className="relative space-y-6">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-indigo-300">Infrastructure</span>
                                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-[9px] font-black text-emerald-400 uppercase tracking-wider border border-emerald-500/20 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Optimal
                                                </span>
                                            </div>
                                            <div className="space-y-4">
                                                <HealthStat label="Neon SQL Latency" value="14ms" trend="up" />
                                                <HealthStat label="Vercel Function Exec" value="82ms" trend="down" />
                                                <HealthStat label="API Uptime" value="99.99%" trend="neutral" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl bg-[#0c0c12] border border-white/[0.05] p-8 space-y-6">
                                        <h4 className="text-sm font-bold text-white/40 uppercase tracking-wider">Plan Distribution</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                                <div className="flex-1 text-sm text-white/60">Pro Plan</div>
                                                <div className="text-sm font-black text-white">{Math.round((tenants.filter(t => t.plan === 'pro').length / (tenants.length || 1)) * 100)}%</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                <div className="flex-1 text-sm text-white/60">Free Tier</div>
                                                <div className="text-sm font-black text-white">{Math.round((tenants.filter(t => t.plan === 'free').length / (tenants.length || 1)) * 100)}%</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-3 h-3 rounded-full bg-purple-500" />
                                                <div className="flex-1 text-sm text-white/60">Enterprise</div>
                                                <div className="text-sm font-black text-white">{Math.round((tenants.filter(t => t.plan === 'enterprise').length / (tenants.length || 1)) * 100)}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tenants' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold">Platform Workspace Registry</h3>
                                    <p className="text-sm text-white/20 mt-1">{filteredTenants.length} active instances across global fabric</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all">
                                        Register New Tenant
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredTenants.map(tenant => (
                                    <button
                                        key={tenant.id}
                                        onClick={() => onManageTenant(tenant)}
                                        className="p-8 rounded-3xl bg-[#0c0c12] border border-white/[0.05] hover:border-indigo-500/40 hover:bg-white/[0.02] transition-all group text-left relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rotate-45 -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-all" />

                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-white/[0.06] flex items-center justify-center text-indigo-400 font-black text-lg group-hover:scale-110 transition-transform">
                                                {tenant.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors uppercase tracking-tight">{tenant.name}</div>
                                                <div className="text-xs text-white/20 font-bold uppercase tracking-widest">{tenant.slug}.pixelvault.io</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 mb-8 border-y border-white/[0.03] py-6">
                                            <div>
                                                <div className="text-[10px] text-white/10 font-black uppercase tracking-widest mb-1.5">Usage Rank</div>
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                                    tenant.plan === 'pro' ? "bg-indigo-500/10 text-indigo-400" :
                                                        tenant.plan === 'enterprise' ? "bg-purple-500/10 text-purple-400" : "bg-white/5 text-white/40"
                                                )}>
                                                    {tenant.plan}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-white/10 font-black uppercase tracking-widest mb-1.5">Storage Cap</div>
                                                <div className="text-sm font-bold text-white/60">{formatSize(tenant.maxStorageBytes)}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-[10px] text-white/15 font-bold uppercase tracking-[0.2em]">{tenant.createdAt.split('T')[0]}</span>
                                            <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                                                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'settings' && (
                        <div className="animate-fade-in space-y-6 max-w-4xl">
                            <div>
                                <h3 className="text-xl font-bold">Global AI & System Settings</h3>
                                <p className="text-sm text-white/20 mt-1">Configure your LLM providers for Image Auto-Tagging and OCR.</p>
                            </div>

                            <div className="bg-[#0c0c12] border border-white/[0.05] rounded-3xl p-8 space-y-8">
                                <div>
                                    <h4 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Active AI Provider</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {['gemini', 'openai', 'qwen', 'glm', 'custom'].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setLlmProvider(p)}
                                                className={cn(
                                                    "p-4 rounded-xl border text-left transition-all",
                                                    llmProvider === p 
                                                        ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                                                        : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                                                )}
                                            >
                                                <div className={cn("font-bold capitalize", llmProvider === p ? "text-indigo-400" : "text-white")}>{p === 'glm' ? 'GLM (Zhipu)' : p}</div>
                                                <div className="text-xs text-white/30 mt-1">Vision Model</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white/40 uppercase tracking-wider">Provider Configuration</h4>
                                    
                                    {llmProvider === 'gemini' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-white/60 mb-2">Gemini API Key (Google AI Studio)</label>
                                                <input type="password" value={llmConfig.gemini_api_key || ''} onChange={e => setLlmConfig({...llmConfig, gemini_api_key: e.target.value})} className="w-full bg-[#07070a] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50" placeholder="AIzaSy..." />
                                                <p className="text-xs text-white/30 mt-2">15 RPM Free Tier. Model: gemini-1.5-flash</p>
                                            </div>
                                        </div>
                                    )}

                                    {llmProvider === 'openai' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-white/60 mb-2">OpenAI API Key</label>
                                                <input type="password" value={llmConfig.openai_api_key || ''} onChange={e => setLlmConfig({...llmConfig, openai_api_key: e.target.value})} className="w-full bg-[#07070a] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50" placeholder="sk-..." />
                                                <p className="text-xs text-white/30 mt-2">Model: gpt-4o-mini</p>
                                            </div>
                                        </div>
                                    )}

                                    {llmProvider === 'qwen' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-white/60 mb-2">DashScope API Key (Alibaba)</label>
                                                <input type="password" value={llmConfig.qwen_api_key || ''} onChange={e => setLlmConfig({...llmConfig, qwen_api_key: e.target.value})} className="w-full bg-[#07070a] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50" placeholder="sk-..." />
                                                <p className="text-xs text-white/30 mt-2">Model: qwen-vl-max</p>
                                            </div>
                                        </div>
                                    )}

                                    {llmProvider === 'glm' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-white/60 mb-2">Zhipu BigModel API Key</label>
                                                <input type="password" value={llmConfig.glm_api_key || ''} onChange={e => setLlmConfig({...llmConfig, glm_api_key: e.target.value})} className="w-full bg-[#07070a] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
                                                <p className="text-xs text-white/30 mt-2">Model: glm-4v</p>
                                            </div>
                                        </div>
                                    )}

                                    {llmProvider === 'custom' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-white/60 mb-2">Custom Base URL (OpenAI Compatible)</label>
                                                <input type="text" value={llmConfig.custom_base_url || ''} onChange={e => setLlmConfig({...llmConfig, custom_base_url: e.target.value})} className="w-full bg-[#07070a] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50" placeholder="https://api.yourprovider.com/v1" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-white/60 mb-2">API Key</label>
                                                <input type="password" value={llmConfig.custom_api_key || ''} onChange={e => setLlmConfig({...llmConfig, custom_api_key: e.target.value})} className="w-full bg-[#07070a] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-white/60 mb-2">Vision Model Name</label>
                                                <input type="text" value={llmConfig.custom_model || ''} onChange={e => setLlmConfig({...llmConfig, custom_model: e.target.value})} className="w-full bg-[#07070a] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50" placeholder="e.g. llama-3.2-11b-vision-preview" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t border-white/[0.05]">
                                    <button 
                                        onClick={handleSaveSettings}
                                        disabled={settingsSaving}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center justify-center min-w-[120px]"
                                    >
                                        {settingsSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save System Configuration'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group relative overflow-hidden",
                active
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/10"
                    : "text-white/30 hover:bg-white/[0.04] hover:text-white/60 border border-transparent"
            )}
        >
            <div className={cn(
                "transition-colors",
                active ? "text-indigo-400" : "text-white/20 group-hover:text-white/40"
            )}>
                {icon}
            </div>
            <span className="text-sm font-bold tracking-tight">{label}</span>
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
            )}
        </button>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: 'indigo' | 'blue' | 'purple' | 'cyan' }) {
    const colors = {
        indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20",
        blue: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20",
        purple: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20",
        cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
    };

    return (
        <div className={cn("rounded-3xl bg-gradient-to-br border p-7 group hover:scale-[1.02] transition-transform", colors[color])}>
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.05] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div className="text-3xl font-black mb-1.5 tracking-tight text-white">{value}</div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{label}</p>
        </div>
    );
}

function HealthStat({ label, value, trend }: { label: string; value: string; trend: 'up' | 'down' | 'neutral' }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-white/30 font-bold tracking-wide">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-white/80">{value}</span>
                {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-red-400" />}
                {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-emerald-400" />}
                {trend === 'neutral' && <div className="w-1 h-1 rounded-full bg-white/20" />}
            </div>
        </div>
    );
}
