import { useState, useEffect } from 'react';
import {
    Building2, Globe, ArrowRight, ArrowLeft, Check, Database,
    Sparkles, ShieldCheck, Zap, Lock, Rocket, Layout,
    CheckCircle2, Server, Cloud
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface OnboardingFlowProps {
    initialPlan?: 'free' | 'pro' | 'enterprise';
    onComplete: (data: { name: string; slug: string; plan: string }) => void;
    onLogout: () => void;
}

export function OnboardingFlow({ initialPlan = 'free', onComplete, onLogout }: OnboardingFlowProps) {
    const [step, setStep] = useState(1);
    const [plan, setPlan] = useState(initialPlan);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleNext = () => {
        if (step === 2 && (!name || !slug)) return;
        if (step === 3) {
            setLoading(true);
            // Simulate creation with a delay for cinematic effect
            setTimeout(() => {
                onComplete({ name, slug, plan });
            }, 2500);
            return;
        }
        setStep(s => s + 1);
    };

    const updateSlug = (n: string) => {
        setName(n);
        setSlug(n.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    };

    if (!isMounted) return null;

    return (
        <div className="fixed inset-0 z-50 bg-surface text-text-primary flex flex-col overflow-hidden bg-gradient-mesh bg-noise selection:bg-brand-500/30">
            {/* Ambient Background Blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-500/10 rounded-full blur-[160px] animate-float-slow opacity-50" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[140px] animate-float-slow opacity-30" style={{ animationDelay: '2s' }} />

            {/* Header */}
            <header className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-white/[0.03] glass">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25 animate-glow-border">
                        <Sparkles className="w-5 h-5 text-white/90" />
                    </div>
                    <div>
                        <div className="font-black text-sm uppercase tracking-tighter">Tenant Setup</div>
                        <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-[0.2em] -mt-1">PixelVault Cloud</div>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-white hover:bg-white/[0.05] transition-all border border-transparent hover:border-white/[0.05]"
                >
                    Sign Out <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
            </header>

            {/* Progress indicator */}
            <div className="relative z-10 w-full flex justify-center pt-8">
                <div className="flex items-center gap-3">
                    {[1, 2, 3].map(s => (
                        <div key={s} className="flex items-center">
                            <div
                                className={cn(
                                    "w-8 h-1 transition-all duration-700 rounded-full",
                                    s === step ? "w-16 bg-brand-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" : s < step ? "bg-emerald-500" : "bg-white/[0.08]"
                                )}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-12 max-w-6xl mx-auto w-full">

                {/* Step 1: Destination Selection */}
                {step === 1 && (
                    <div className="w-full max-w-4xl space-y-12 animate-reveal-up text-center">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                <Zap className="w-3 h-3 animate-pulse" /> Phase 01: Plan Selection
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-text-primary leading-[1.1]">
                                Choose your <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-brand-600">Digital Realm.</span>
                            </h1>
                            <p className="text-text-tertiary text-lg max-w-xl mx-auto font-medium">
                                Select a plan that fits your studio's creative output. <br />
                                <span className="text-brand-500/60">Scale up or down as your vault grows.</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                {
                                    id: 'free',
                                    name: 'Hobbyist',
                                    price: '$0',
                                    icon: Zap,
                                    desc: 'Ideal for small libraries',
                                    features: ['1GB Storage', 'Basic S3 Provider', 'Public Link Sharing'],
                                    color: 'brand'
                                },
                                {
                                    id: 'pro',
                                    name: 'Studio Pro',
                                    price: '$12',
                                    icon: Sparkles,
                                    desc: 'Everything for creators',
                                    features: ['50GB Storage', 'AI Search Tools', 'Global CDN Edge'],
                                    popular: true,
                                    color: 'indigo'
                                },
                                {
                                    id: 'enterprise',
                                    name: 'Enterprise',
                                    price: 'Custom',
                                    icon: Building2,
                                    desc: 'For large organizations',
                                    features: ['Unlimited Storage', 'Team Permissions', 'Dedicated Support'],
                                    color: 'slate'
                                }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setPlan(p.id as any)}
                                    className={cn(
                                        "p-8 rounded-[2.5rem] border-2 text-left transition-all relative group flex flex-col hover-lift",
                                        plan === p.id
                                            ? "bg-brand-500/[0.08] border-brand-500/50 shadow-2xl shadow-brand-500/20"
                                            : "glass border-transparent hover:border-white/[0.08]"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center silver-ring", plan === p.id ? "bg-brand-500/20 text-brand-400" : "bg-white/[0.05] text-white/20")}>
                                            <p.icon className="w-7 h-7" />
                                        </div>
                                        {p.popular && <span className="px-3 py-1 rounded-full bg-brand-500 text-[9px] font-black uppercase text-white tracking-widest shadow-lg shadow-brand-500/40">Most Popular</span>}
                                    </div>
                                    <div className="mb-6">
                                        <h4 className="text-2xl font-black text-text-primary flex items-center gap-2">
                                            {p.name}
                                            {plan === p.id && <CheckCircle2 className="w-4 h-4 text-brand-400" />}
                                        </h4>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-3xl font-black text-text-primary">{p.price}</span>
                                            {p.id !== 'enterprise' && <span className="text-text-tertiary text-xs">/mo</span>}
                                        </div>
                                    </div>
                                    <ul className="space-y-3 mt-auto border-t border-white/[0.05] pt-6">
                                        {p.features.map((f, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-xs font-bold text-text-tertiary">
                                                <div className="w-1 h-1 rounded-full bg-brand-500/50" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Destination Identity */}
                {step === 2 && (
                    <div className="w-full space-y-12 animate-reveal-up max-w-2xl text-center">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                <Building2 className="w-3 h-3" /> Phase 02: Brand Identity
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-text-primary">Name your <span className="text-brand-400">Empire.</span></h1>
                            <p className="text-text-tertiary text-lg max-w-lg mx-auto font-medium leading-relaxed">
                                Every vault needs a name. This will be your sub-domain where you and your team will access your assets.
                            </p>
                        </div>

                        <div className="space-y-8 text-left bg-white/[0.02] border border-white/[0.05] p-10 rounded-[3rem] glass shadow-2xl">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] ml-2">Studio / Organization Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                        <Building2 className="w-5 h-5 text-text-tertiary group-focus-within:text-brand-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={name}
                                        onChange={(e) => updateSlug(e.target.value)}
                                        placeholder="e.g. Maverick Studios"
                                        className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.12] focus:border-brand-500/50 rounded-2xl py-5 pl-16 pr-6 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all placeholder:text-text-tertiary/40 text-text-primary text-lg font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] ml-2">Your Personal Vault URL</label>
                                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20 flex flex-col sm:flex-row items-stretch">
                                    <div className="px-6 py-4 flex items-center bg-white/[0.02] border-r border-white/[0.05] text-text-tertiary text-xs font-black uppercase tracking-widest whitespace-nowrap">
                                        pixelvault.app /
                                    </div>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))}
                                        className="flex-1 bg-transparent px-6 py-4 text-brand-400 text-lg font-black outline-none placeholder:text-white/[0.05]"
                                        placeholder="your-url"
                                    />
                                    {slug && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-[0.2em] animate-fade-in shadow-glow">Available</div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-text-tertiary/60 italic ml-4">Tip: Keep it short and memorable for your team.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Launch Protocol */}
                {step === 3 && (
                    <div className="w-full space-y-12 animate-reveal-up text-center max-w-2xl">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-brand-500/10 border-2 border-brand-500/40 flex items-center justify-center mx-auto mb-10 silver-ring animate-float relative z-10">
                                <Rocket className="w-16 h-16 text-brand-400 rotate-45" />
                            </div>
                            <div className="absolute inset-0 bg-brand-500/20 blur-[60px] animate-pulse rounded-full" />
                        </div>

                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                <Lock className="w-3 h-3" /> Step 03: Final Authorization
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-text-primary">Launch <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-brand-500">Initiated.</span></h1>
                            <p className="text-text-tertiary text-lg max-w-lg mx-auto font-medium">
                                Everything is set. Your private cloud instance for <span className="text-text-primary font-black uppercase">{name}</span> is ready to spawn.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                            {[
                                { icon: Database, label: 'Data Hub' },
                                { icon: ShieldCheck, label: 'Secure RLS' },
                                { icon: Zap, label: 'Edge Nodes' },
                                { icon: Cloud, label: 'Cloud Sync' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-3 p-6 rounded-[2rem] glass border border-white/[0.05] animate-scale-up hover-lift shadow-card" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-brand-400">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[9px] uppercase font-black tracking-widest text-text-tertiary">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Action Bar */}
                <div className="fixed bottom-12 left-0 right-0 z-20 flex flex-col items-center gap-6 px-12">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
                        {step > 1 && !loading && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-text-primary font-black text-sm transition-all active:scale-95 silver-ring hover:bg-white/[0.1]"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                        )}
                        <button
                            disabled={loading || (step === 2 && !name)}
                            onClick={handleNext}
                            className={cn(
                                "flex-1 w-full flex items-center justify-center gap-3 px-12 py-5 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 text-white font-black text-lg transition-all active:scale-95 shadow-2xl shadow-brand-600/20 group disabled:opacity-50 silver-ring hover:shadow-brand-500/40 hover:from-brand-500 hover:to-brand-600",
                                loading ? "animate-pulse" : ""
                            )}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Materializing Space...
                                </>
                            ) : (
                                <>
                                    {step === 3 ? 'Ignite Vault' : 'Next Protocol'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-[9px] text-text-tertiary italic font-medium uppercase tracking-[0.2em]">
                        {loading ? 'Finalizing security protocols & cloud allocation...' : 'A World-Class Experience from PixelVault Engineering'}
                    </p>
                </div>
            </main>

            {/* Background Decor element */}
            <div className="fixed inset-x-0 bottom-0 h-1/2 pointer-events-none -z-10 bg-gradient-to-t from-brand-500/[0.05] via-transparent to-transparent opacity-50" />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-brand-500/5 rounded-full blur-[100px] animate-morph" />
                <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] animate-morph opacity-60" style={{ animationDelay: '-4s' }} />
            </div>
        </div>
    );
}
