import { useState, useEffect } from 'react';
import {
  Cloud, Shield, Zap, Check, ArrowRight,
  Layout, Smartphone, Globe, Lock, Sparkles,
  Play, MousePointer2, Layers, Cpu, ShieldCheck,
  Box, Maximize2, Search, ImageIcon, Menu, X as CloseIcon
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface LandingPageProps {
  onGetStarted: (plan?: 'free' | 'pro' | 'enterprise') => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    // Dynamic SEO Metadata Injection
    document.title = "PixelVault | Enterprise S3 Photo Viewer & Multi-Cloud Asset Manager";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Privacy-first Cloud Photo Gallery and Enterprise Google Photos alternative. Connect AWS S3, Vercel Blob, and Cloudflare R2 for seamless cross-provider management.');
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Cloud,
      title: 'Multi-Cloud Photo Studio',
      desc: 'Seamless S3 Photo Viewer for AWS, Vercel Blob, and R2. The ultimate centralized cloud asset manager.',
      color: 'text-blue-400'
    },
    {
      icon: ShieldCheck,
      title: 'Enterprise Security',
      desc: 'Row-Level Security (RLS) and end-to-end encryption ensure your assets are for your eyes only.',
      color: 'text-emerald-400'
    },
    {
      icon: Zap,
      title: 'Lightning Sync',
      desc: 'Real-time background synchronization powered by edge workers. Zero latency, infinite scale.',
      color: 'text-amber-400'
    }
  ];

  return (
    <div className="min-h-screen bg-surface text-text-primary selection:bg-brand-500/30 bg-gradient-mesh bg-noise scroll-smooth">
      {/* ─── Navigation ─── */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b",
        scrolled ? "glass py-4 border-border/30 shadow-premium" : "bg-transparent py-6 border-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25 animate-glow-border group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5 text-white/90" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight group-hover:text-brand-400 transition-colors">PixelVault</span>
              <span className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest block -mt-0.5">Cloud Studio</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-text-tertiary">
            <a href="#features" className="hover:text-brand-400 transition-colors">Infrastructure</a>
            <a href="#pricing" className="hover:text-brand-400 transition-colors">Pricing</a>
            <a href="#security" className="hover:text-brand-400 transition-colors">Security</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-text-tertiary hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            <button
              onClick={onLogin}
              className="px-5 py-2 text-xs font-black uppercase tracking-widest text-text-tertiary hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => onGetStarted()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white text-[10px] font-black uppercase tracking-widest hover:from-brand-500 hover:to-brand-600 transition-all active:scale-95 shadow-lg shadow-brand-500/20 silver-ring"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <div className={cn(
          "fixed inset-0 top-[73px] bg-surface/95 backdrop-blur-2xl z-40 transition-all duration-500 md:hidden flex flex-col items-center justify-center gap-8 px-6 border-t border-white/5",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none translate-y-4"
        )}>
          <div className="flex flex-col items-center gap-8 text-sm font-black uppercase tracking-[0.2em] text-text-tertiary">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-brand-400 transition-colors">Infrastructure</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-brand-400 transition-colors">Pricing</a>
            <a href="#security" onClick={() => setMobileMenuOpen(false)} className="hover:text-brand-400 transition-colors">Security</a>
          </div>
          <div className="w-full h-px bg-white/5" />
          <div className="flex flex-col w-full gap-4">
            <button
              onClick={() => { onLogin(); setMobileMenuOpen(false); }}
              className="w-full py-5 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-black uppercase tracking-widest text-xs"
            >
              Sign In
            </button>
            <button
              onClick={() => { onGetStarted(); setMobileMenuOpen(false); }}
              className="w-full py-5 rounded-2xl bg-brand-500 text-white font-black uppercase tracking-widest text-xs silver-ring"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-40 pb-20 overflow-hidden lg:min-h-screen flex items-center">
        {/* Ambient Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[150px] animate-float opacity-50" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-500/5 rounded-full blur-[120px] animate-float opacity-30" style={{ animationDelay: '2s' }} />

        <div className="max-w-7xl mx-auto px-6 relative w-full">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] animate-reveal-up shadow-glow">
                <Zap className="w-3 h-3 animate-pulse" />
                Next-Gen Metadata Cloud
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1] sm:leading-[0.95] animate-reveal-up" style={{ animationDelay: '0.1s' }}>
                Your Assets. <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-indigo-400 to-brand-600">
                  Infinite Storage.
                </span>
              </h1>
              <p className="text-[10px] font-bold text-brand-400/80 uppercase tracking-[0.3em] mb-4">The #1 Enterprise Google Photos Alternative</p>

              <p className="text-lg md:text-xl text-text-tertiary max-w-xl mx-auto lg:mx-0 leading-relaxed animate-reveal-up font-medium" style={{ animationDelay: '0.2s' }}>
                Unified Multi-Cloud Asset Management. Connect your S3 buckets, Vercel Blobs, and custom cloud storage to the world\'s most powerful photo studio and dashboad.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4 animate-reveal-up" style={{ animationDelay: '0.3s' }}>
                <button
                  onClick={() => onGetStarted('pro')}
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 text-white font-black text-lg hover:from-brand-500 hover:to-brand-600 transition-all shadow-2xl shadow-brand-600/20 active:scale-95 flex items-center justify-center gap-3 group silver-ring"
                >
                  Start Building
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-text-primary font-black text-lg hover:bg-white/[0.08] transition-all flex items-center justify-center gap-3 silver-ring"
                >
                  The Stack
                  <Layers className="w-5 h-5 text-text-tertiary" />
                </button>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-8 pt-8 animate-reveal-up text-text-tertiary" style={{ animationDelay: '0.4s' }}>
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-surface bg-surface-lighter flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-brand-500/20 to-brand-800/20" />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest block text-left">
                  <span className="text-white block">Trusted by 500+ Studios</span>
                  <span className="opacity-50">Global Infrastructure</span>
                </div>
              </div>
            </div>

            {/* Premium CSS-based Dashboard Preview */}
            <div className="relative animate-reveal-up hidden lg:block" style={{ animationDelay: '0.5s' }}>
              <div className="absolute -inset-2 bg-gradient-to-r from-brand-500 to-purple-600 rounded-[3rem] blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative glass border border-white/[0.1] rounded-[2.5rem] shadow-2xl overflow-hidden aspect-[4/3] flex">
                {/* Sidebar */}
                <div className="w-16 border-r border-white/5 bg-white/[0.02] p-4 flex flex-col gap-4">
                  {[Layout, ImageIcon, Search, Lock, Zap].map((Icon, i) => (
                    <div key={i} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", i === 0 ? "bg-brand-500/20 text-brand-400" : "text-white/20")}>
                      <Icon className="w-4 h-4" />
                    </div>
                  ))}
                </div>
                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-6 w-32 bg-white/10 rounded-lg" />
                    <div className="h-8 w-8 rounded-full bg-brand-500/20 border border-brand-500/30" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-3">
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-brand-500/10 via-transparent to-transparent" />
                      </div>
                    ))}
                  </div>
                  <div className="h-40 rounded-3xl bg-white/[0.02] border border-white/[0.05] p-4 flex flex-col gap-3">
                    <div className="h-4 w-1/3 bg-white/10 rounded" />
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="rounded-lg bg-white/[0.03]" />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Overlay Glows */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[40px] rounded-full pointer-events-none" />
              </div>

              {/* Floating Widgets */}
              <div className="absolute -right-8 top-1/4 glass border border-white/[0.1] p-4 rounded-2xl shadow-premium animate-float w-48">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Check className="w-4 h-4 text-emerald-400" /></div>
                  <div className="text-[10px] font-black uppercase tracking-widest">Metadata Sync</div>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </div>

              <div className="absolute -left-8 bottom-1/4 glass border border-white/[0.1] p-4 rounded-2xl shadow-premium animate-float w-40" style={{ animationDelay: '1.5s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center"><Lock className="w-4 h-4 text-amber-400" /></div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">Locked</div>
                </div>
                <div className="text-[9px] text-text-tertiary">Tenant Isolation Active</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Sequence ─── */}
      <section className="py-20 border-y border-white/[0.03] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { label: 'Cloud Objects', value: '10M+' },
            { label: 'Edge Regions', value: '180+' },
            { label: 'System Uptime', value: '99.9%' },
            { label: 'Active Vaults', value: '15k' }
          ].map((stat, i) => (
            <div key={i} className="space-y-1">
              <div className="text-3xl font-black tracking-tight text-white">{stat.value}</div>
              <div className="text-[10px] uppercase font-black tracking-widest text-text-tertiary">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features Stack ─── */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-20">
            <div className="lg:w-1/3 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] text-text-tertiary text-[9px] font-black uppercase tracking-widest">The Core Engine</div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight">Built for <span className="text-brand-400">Performance.</span></h2>
              <p className="text-text-tertiary text-lg lg:max-w-xs font-medium">A unified metadata layer that spans across every storage provider you own.</p>

              <div className="space-y-4 pt-8">
                {features.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveFeature(i)}
                    className={cn(
                      "w-full text-left p-6 rounded-2xl transition-all flex items-start gap-4",
                      activeFeature === i ? "glass ring-1 ring-white/10 shadow-premium" : "opacity-40 hover:opacity-60"
                    )}
                  >
                    <f.icon className={cn("w-6 h-6 mt-1", f.color)} />
                    <div>
                      <h4 className="font-black uppercase tracking-widest text-xs mb-1">{f.title}</h4>
                      {activeFeature === i && <p className="text-[11px] text-text-tertiary leading-relaxed animate-reveal-up">{f.desc}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:w-2/3">
              <div className="h-full min-h-[500px] rounded-[3rem] glass border border-white/[0.05] p-12 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/10 blur-[100px] rounded-full group-hover:bg-brand-500/20 transition-all duration-1000" />

                <div className="relative z-10 grid md:grid-cols-2 gap-12">
                  {[
                    { title: 'RLS Implementation', icon: Lock, val: 'Row Level Security guarantees that no data leaks between tenants. Every query is scoped automatically.' },
                    { title: 'Global Edge Sync', icon: Zap, val: 'Synchronize across Vercel, AWS, and Cloudflare in milliseconds using our proprietary sync engine.' },
                    { title: 'AI Orchestration', icon: Cpu, val: 'Automatic vectorization and tagging of every asset. Search by content, context, or visual similarity.' },
                    { title: 'Custom Domains', icon: Globe, val: 'White-label your studio. Map custom domains to your vault instances with automatic SSL.' }
                  ].map((item, i) => (
                    <div key={i} className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-brand-400 silver-ring">
                        <item.icon className="w-6 h-6" />
                      </div>
                      <h4 className="text-xl font-black text-white">{item.title}</h4>
                      <p className="text-sm text-text-tertiary font-medium leading-relaxed">{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Security Highlight ─── */}
      <section id="security" className="py-32 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
          <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto silver-ring">
            <ShieldCheck className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">Fortified by <span className="text-emerald-400">Default.</span></h2>
          <p className="text-text-tertiary text-xl font-medium leading-relaxed max-w-2xl mx-auto">
            Our Multi-Tenant architecture ensures that your data is isolated at the database level. No shared pools, no leakage, no compromises.
          </p>
          <div className="grid md:grid-cols-3 gap-6 pt-8">
            {['AES-256 Encryption', 'Context Routing', 'Audit Trails'].map((label, i) => (
              <div key={i} className="px-6 py-4 rounded-2xl glass border border-white/[0.05] text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_60%)]" />
      </section>

      {/* ─── Pricing Section ─── */}
      <section id="pricing" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-24">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">Engineered for <span className="text-brand-400">Scale.</span></h2>
            <p className="text-text-tertiary text-lg font-medium">Transparent pricing for every stage of your studio's evolution.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '$0',
                desc: 'Perfect for archiving',
                features: ['1GB Storage', '1 Cloud Connection', 'Basic Search', 'Email Support'],
                btn: 'Get Started'
              },
              {
                name: 'Studio Pro',
                price: '$12',
                desc: 'The professional standard',
                features: ['50GB Storage', 'Infinite Connections', 'AI Features', 'Audit Logs', 'Priority Support'],
                btn: 'Go Pro Now',
                popular: true
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                desc: 'For global organizations',
                features: ['Unlimited Storage', 'White-label UI', 'Custom Domains', '24/7 Concierge'],
                btn: 'Contact Sales'
              }
            ].map((p, i) => (
              <div key={i} className={cn(
                "p-12 rounded-[3.5rem] flex flex-col transition-all group relative",
                p.popular
                  ? "glass border-2 border-brand-500 shadow-2xl scale-105 z-10"
                  : "bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]"
              )}>
                {p.popular && (
                  <div className="absolute top-0 right-12 -translate-y-1/2 px-4 py-1.5 rounded-full bg-brand-500 text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-brand-500/40">Highly Recommended</div>
                )}
                <div className="space-y-2 mb-10">
                  <h4 className="text-sm font-black uppercase tracking-widest text-text-tertiary">{p.name}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white">{p.price}</span>
                    {p.price !== 'Custom' && <span className="text-text-tertiary text-xs">/mo</span>}
                  </div>
                  <p className="text-xs font-medium text-text-tertiary/60 italic">{p.desc}</p>
                </div>
                <ul className="space-y-4 mb-12 flex-1">
                  {p.features.map((f, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-xs font-bold text-text-tertiary">
                      <div className={cn("w-1.5 h-1.5 rounded-full", p.popular ? "bg-brand-500" : "bg-white/10")} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onGetStarted(p.name.toLowerCase().includes('pro') ? 'pro' : p.price === 'Custom' ? 'enterprise' : 'free')}
                  className={cn(
                    "w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 silver-ring",
                    p.popular
                      ? "bg-brand-500 text-white hover:bg-brand-400 shadow-xl shadow-brand-500/20"
                      : "bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08]"
                  )}
                >
                  {p.btn}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-40 relative">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12 relative z-10">
          <h2 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.95]">Secure your <br /><span className="text-brand-400 tracking-tighter">Legacy today.</span></h2>
          <button
            onClick={() => onGetStarted()}
            className="px-16 py-6 rounded-2xl bg-white text-surface font-black text-xl hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/10 silver-ring"
          >
            Launch PixelVault
          </button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-600/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-20 border-t border-white/[0.03] relative bg-black/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <Sparkles className="w-4 h-4 text-white/90" />
                </div>
                <span className="text-xl font-black tracking-tight text-white">PixelVault</span>
              </div>
              <p className="text-text-tertiary text-sm max-w-sm font-medium leading-relaxed">
                The world's most advanced multi-tenant metadata layer for creative professionals. Built for scale, secured by design.
              </p>
            </div>
            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">System</h5>
              <div className="flex flex-col gap-3 text-xs font-bold text-text-tertiary">
                <a href="#" className="hover:text-brand-400 transition-colors">Documentation</a>
                <a href="#" className="hover:text-brand-400 transition-colors">API Reference</a>
                <a href="#" className="hover:text-brand-400 transition-colors">Status</a>
                <a href="#" className="hover:text-brand-400 transition-colors">Changelog</a>
              </div>
            </div>
            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Legal</h5>
              <div className="flex flex-col gap-3 text-xs font-bold text-text-tertiary">
                <a href="#" className="hover:text-brand-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-brand-400 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-brand-400 transition-colors">Security Audit</a>
                <a href="#" className="hover:text-brand-400 transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-white/5">
            <div className="flex items-center gap-4 text-text-tertiary">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest">All Systems Operational</span>
            </div>
            <p className="text-[9px] text-text-tertiary/50 font-black tracking-[0.2em] uppercase">
              © 2024 PIXELVAULT CLOUD INFRASTRUCTURE INC.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
