import { useState, useRef, useEffect } from 'react';
import {
  Camera, Mail, Lock, Eye, EyeOff, ArrowRight,
  Shield, Users, Cloud, Trash2, Upload, Zap,
  Layers, Smartphone, ChevronRight, Sparkles,
  Building2, User as UserIcon, CheckCircle2, AlertCircle,
  Star, Globe, Database, ArrowUpRight, Play,
  Check, Image as ImageIcon, FolderOpen, Search,
  MonitorSmartphone, BarChart3, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { signup, login, persistSessionToken } from '@/lib/tenant-db';
import type { User, Tenant, Session } from '@/types/schema';

interface Props {
  initialPlan?: 'free' | 'pro' | 'enterprise';
  onAuthenticated: (user: User, tenant: Tenant | null, session: Session) => void;
  onBack?: () => void;
}

type Mode = 'landing' | 'login' | 'signup';

// Animated counter component
function AnimatedStat({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-black text-text-primary">
        {value}<span className="text-brand-500">{suffix}</span>
      </div>
      <div className="text-xs text-text-secondary/60 mt-1 font-medium">{label}</div>
    </div>
  );
}

export function AuthPage({ initialPlan, onAuthenticated, onBack }: Props) {
  const [mode, setMode] = useState<Mode>(initialPlan ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('My Workspace'); // Default for quick signup
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStaffMode, setIsStaffMode] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    // If we have an initial plan, we want to go straight to signup
    if (initialPlan) {
      setMode('signup');
    }
  }, [initialPlan]);

  useEffect(() => {
    if (mode !== 'landing' && emailRef.current) {
      emailRef.current.focus();
    }
  }, [mode]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await login({ email, password });

      // Enforce Superadmin role if in staff mode
      if (isStaffMode && result.user.role !== 'superadmin') {
        throw new Error('Access denied: Staff credentials required.');
      }

      persistSessionToken(result.session.token);
      onAuthenticated(result.user, result.tenant, result.session);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !name) { setError('Please fill in Name, Email and Password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      // We'll create the user and a placeholder tenant first.
      // The OnboardingFlow will then let them customize it.
      const result = await signup({ email, password, name, teamName });
      persistSessionToken(result.session.token);

      // If we are doing full onboarding, we might want to pass 'null' for tenant
      // but the existing signup creates one. We'll just pass it and let App decide.
      onAuthenticated(result.user, null, result.session);
    } catch (e: any) {
      setError(e.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    const demoEmail = `demo-${Date.now()}@pixelvault.app`;
    try {
      const result = await signup({ email: demoEmail, password: 'demo1234', name: 'Demo User', teamName: 'Demo Team' });
      persistSessionToken(result.session.token);
      onAuthenticated(result.user, result.tenant, result.session);
    } catch (e: any) {
      setError(e.message || 'Demo creation failed');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LANDING PAGE (Logic to redirect to LandingPage component)
  // ═══════════════════════════════════════════════════════════════
  if (mode === 'landing') {
    if (onBack) {
      onBack();
      return null;
    }
    return (
      <div className="min-h-screen bg-surface text-text-primary overflow-x-hidden">
        {/* ─── Background Effects ─── */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full bg-gradient-to-b from-brand-600/[0.12] to-transparent blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-purple-600/[0.06] blur-[150px]" />
          <div className="absolute top-[60%] right-0 w-[500px] h-[500px] rounded-full bg-cyan-600/[0.04] blur-[130px]" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* ─── Navigation ─── */}
        <nav className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrollY > 50
            ? "bg-surface/80 backdrop-blur-xl border-b border-border py-3"
            : "py-5"
        )}>
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30 rotate-3 hover:rotate-0 transition-transform">
                <Camera className="w-5 h-5 text-surface" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-text-primary via-text-primary to-text-secondary/60 bg-clip-text text-transparent">PixelVault</span>
                <span className="hidden sm:inline ml-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-full">
                  Beta
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('login')}
                className="px-4 py-2 text-sm font-medium text-text-secondary/60 hover:text-text-primary transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => setMode('signup')}
                className="px-5 py-2.5 text-sm font-bold bg-text-primary text-surface rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-500/10"
              >
                Start Free →
              </button>
            </div>
          </div>
        </nav>

        {/* ═══════════════════════════════════════════════════
            HERO SECTION
        ═══════════════════════════════════════════════════ */}
        <section className="relative z-10 pt-32 md:pt-44 pb-8">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-lighter border border-border text-sm mb-8 animate-fade-in">
                <span className="flex items-center gap-1.5 text-brand-500 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Now in Beta
                </span>
                <span className="w-px h-4 bg-border" />
                <span className="text-text-secondary/60">Multi-tenant cloud photo manager</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[84px] font-black tracking-tight leading-[0.95] mb-7 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <span className="block">The smart way to</span>
                <span className="block mt-1 bg-gradient-to-r from-brand-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  manage photos
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-lg md:text-xl text-white/35 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
                Connect <strong className="text-white/60">Vercel Blob</strong>, <strong className="text-white/60">AWS S3</strong>, or any cloud storage.
                Upload from your phone. Organize with albums. Delete permanently.
                All from one beautiful, team-ready dashboard.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
                <button
                  onClick={() => setMode('signup')}
                  className="group relative flex items-center gap-3 px-8 py-4 text-base font-bold bg-white text-black rounded-2xl hover:bg-white/95 transition-all shadow-2xl shadow-white/10 hover:shadow-white/20 hover:scale-[1.02]"
                >
                  <span>Get Started — It's Free</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={handleDemo}
                  disabled={loading}
                  className="group flex items-center gap-2.5 px-6 py-4 text-base font-medium text-white/50 hover:text-white/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                    <Play className="w-3 h-3 ml-0.5" fill="currentColor" />
                  </div>
                  {loading ? 'Loading...' : 'Try Live Demo'}
                </button>
              </div>

              <p className="text-xs text-white/20 animate-fade-in" style={{ animationDelay: '350ms' }}>
                No credit card required · Free forever for personal use
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            HERO IMAGE / APP PREVIEW
        ═══════════════════════════════════════════════════ */}
        <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pt-12 pb-24">
          <div
            className="relative rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_20px_80px_-20px_rgba(99,102,241,0.15)] animate-fade-in"
            style={{ animationDelay: '400ms' }}
          >
            {/* Glow effect */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />

            {/* Browser chrome */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#0c0c14] border-b border-white/[0.06]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 bg-white/[0.04] text-white/25 text-xs px-5 py-1.5 rounded-lg border border-white/[0.06]">
                  <Lock className="w-3 h-3 text-emerald-400/60" />
                  <span className="font-mono">app.pixelvault.io</span>
                </div>
              </div>
              <div className="w-16" />
            </div>

            {/* App screenshot mock */}
            <div className="flex bg-[#0a0a12]">
              {/* Sidebar */}
              <div className="w-60 border-r border-white/[0.05] p-4 hidden md:block">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white/80">PixelVault</div>
                    <div className="text-[10px] text-white/25">Design Team</div>
                  </div>
                </div>
                <div className="relative mb-4">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15" />
                  <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-3 py-2 text-xs text-white/20">
                    Search photos...
                  </div>
                </div>
                <div className="space-y-0.5">
                  {[
                    { n: 'All Photos', c: 128, active: true },
                    { n: 'Recent Uploads', c: 24, active: false },
                    { n: 'Travel', c: 45, active: false },
                    { n: 'Product Shots', c: 32, active: false },
                    { n: 'Team Events', c: 27, active: false },
                  ].map(f => (
                    <div
                      key={f.n}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-xs",
                        f.active ? "bg-brand-500/15 text-brand-300" : "text-white/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-3.5 h-3.5" />
                        {f.n}
                      </div>
                      <span className="text-[10px] text-white/15">{f.c}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.04]">
                  <p className="text-[10px] font-bold text-white/10 uppercase tracking-wider mb-2 px-3">Storage</p>
                  <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <Cloud className="w-3.5 h-3.5" />
                      <span className="font-medium">Vercel Blob</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-5">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold text-white/70">All Photos</div>
                    <div className="text-[10px] text-white/25">128 items · 2.4 GB</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-lg text-xs text-brand-400">
                      <Upload className="w-3 h-3" /> Upload
                    </div>
                    <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
                      <div className="p-1.5 rounded bg-brand-500/20 text-brand-400">
                        <div className="w-3 h-3 grid grid-cols-2 gap-0.5">
                          <div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" />
                          <div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" />
                        </div>
                      </div>
                      <div className="p-1.5 text-white/20">
                        <div className="w-3 h-3 flex flex-col gap-0.5">
                          <div className="h-px bg-current rounded" /><div className="h-px bg-current rounded" /><div className="h-px bg-current rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  {[
                    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=70',
                    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&q=70',
                    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&q=70',
                    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=70',
                    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=70',
                    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&q=70',
                    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&q=70',
                    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=70',
                    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=70',
                    'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=300&q=70',
                  ].map((src, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg overflow-hidden relative group"
                    >
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {i === 2 && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-brand-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges around preview */}
          <div className="hidden lg:block">
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 animate-fade-in" style={{ animationDelay: '600ms' }}>
              <div className="glass rounded-xl px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white/70">Connected</div>
                    <div className="text-white/25">Vercel Blob</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-2 top-1/3 animate-fade-in" style={{ animationDelay: '700ms' }}>
              <div className="glass rounded-xl px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary/70">Real Delete</div>
                    <div className="text-text-secondary/25">Permanent removal</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 bottom-1/4 animate-fade-in" style={{ animationDelay: '800ms' }}>
              <div className="glass rounded-xl px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-brand-500/20 flex items-center justify-center">
                    <Smartphone className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary/70">Phone Upload</div>
                    <div className="text-text-secondary/25">Camera + Gallery</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            TRUSTED BY / SOCIAL PROOF
        ═══════════════════════════════════════════════════ */}
        <section className="relative z-10 border-y border-border py-12">
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <p className="text-center text-xs font-bold text-text-secondary/30 uppercase tracking-[0.2em] mb-8">
              Built for modern teams
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <AnimatedStat value="5" suffix="+" label="Storage Providers" />
              <AnimatedStat value="∞" label="Photos & Videos" />
              <AnimatedStat value="256" suffix="-bit" label="Encryption Ready" />
              <AnimatedStat value="100" suffix="%" label="Open Architecture" />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            FEATURES GRID — "Why PixelVault"
        ═══════════════════════════════════════════════════ */}
        <section className="relative z-10 py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-5">
                <Zap className="w-3 h-3" /> Features
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-text-primary">
                Everything you need.
                <br />
                <span className="text-text-secondary/40">Nothing you don't.</span>
              </h2>
              <p className="text-text-secondary max-w-xl mx-auto">
                A complete photo management platform that works with your existing cloud storage — not against it.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Feature 1 — Large */}
              <div className="md:col-span-2 rounded-2xl border border-border bg-gradient-to-br from-brand-500/[0.08] to-purple-500/[0.04] p-8 relative overflow-hidden group hover:border-brand-500/20 transition-all">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-brand-500/[0.08] blur-[80px] group-hover:bg-brand-500/[0.12] transition-all" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center mb-5">
                    <Cloud className="w-6 h-6 text-brand-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-text-primary">Multi-Provider Storage Hub</h3>
                  <p className="text-sm text-text-secondary max-w-md mb-6 leading-relaxed">
                    Connect Vercel Blob, AWS S3, Supabase Storage, Google Cloud, or Cloudflare R2.
                    Switch between providers seamlessly. Your photos, your infrastructure.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['▲ Vercel Blob', '☁ AWS S3', '⚡ Supabase', '☁ Cloudflare R2', '☁ GCS'].map(p => (
                      <span key={p} className="px-3 py-1.5 text-xs font-medium text-text-secondary/40 bg-surface-lighter border border-border rounded-lg">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-border bg-gradient-to-br from-red-500/[0.08] to-orange-500/[0.04] p-8 group hover:border-red-500/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center mb-5">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-text-primary">Permanent Delete</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Delete files permanently from your cloud storage with typed confirmation. Batch support for bulk operations. No ghost files.
                </p>
                <div className="mt-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/15 font-mono text-xs text-red-300/60">
                  POST /v1/blob/del → 204 OK
                </div>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-500/[0.08] to-green-500/[0.04] p-8 group hover:border-emerald-500/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-5">
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-text-primary">Phone Gallery Upload</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Upload directly from your phone camera roll or take new photos. Works on iOS and Android. Drag & drop on desktop.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-amber-500/[0.08] to-yellow-500/[0.04] p-8 group hover:border-amber-500/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center mb-5">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Team Workspaces</h3>
                <p className="text-sm text-white/35 leading-relaxed">
                  Multi-tenant architecture with role-based access. Owner, Admin, Member, Viewer roles. Complete team isolation.
                </p>
              </div>

              {/* Feature 5 — Large */}
              <div className="md:col-span-2 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-cyan-500/[0.08] to-blue-500/[0.04] p-8 relative overflow-hidden group hover:border-cyan-500/20 transition-all">
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-cyan-500/[0.08] blur-[80px]" />
                <div className="relative flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center mb-5">
                      <Layers className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Metadata-Driven API</h3>
                    <p className="text-sm text-white/35 leading-relaxed mb-4">
                      Every operation reads connection metadata to route to the correct provider.
                      List, upload, delete — all through one unified API that adapts to your storage backend.
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl bg-surface-lighter border border-border p-4 font-mono text-xs shadow-inner">
                    <div className="text-text-secondary/30 mb-1">// Metadata-driven routing</div>
                    <div><span className="text-purple-400">const</span> <span className="text-cyan-600">api</span> = <span className="text-yellow-600">createAPI</span>(connection);</div>
                    <div className="mt-2 text-text-secondary/30">// Same interface, any provider</div>
                    <div><span className="text-purple-400">await</span> api.<span className="text-yellow-600">list</span>();  <span className="text-text-secondary/20">// → Vercel</span></div>
                    <div><span className="text-purple-400">await</span> api.<span className="text-yellow-600">delete</span>(urls); <span className="text-text-secondary/20">// → S3</span></div>
                    <div><span className="text-purple-400">await</span> api.<span className="text-yellow-600">upload</span>(file); <span className="text-text-secondary/20">// → GCS</span></div>
                  </div>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-purple-500/[0.08] to-violet-500/[0.04] p-8 group hover:border-purple-500/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center mb-5">
                  <ImageIcon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Smart Gallery</h3>
                <p className="text-sm text-white/35 leading-relaxed">
                  Grid & list views. Lightbox with zoom. Side-by-side compare. Full EXIF & metadata panel. Folder and album organization.
                </p>
              </div>

              {/* Feature 7 */}
              <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-pink-500/[0.08] to-rose-500/[0.04] p-8 group hover:border-pink-500/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-pink-500/15 flex items-center justify-center mb-5">
                  <MonitorSmartphone className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Works Everywhere</h3>
                <p className="text-sm text-white/35 leading-relaxed">
                  Fully responsive design. Works on desktop, tablet, and mobile browsers. PWA-ready. Offline cache via IndexedDB.
                </p>
              </div>

              {/* Feature 8 */}
              <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-teal-500/[0.08] to-emerald-500/[0.04] p-8 group hover:border-teal-500/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-teal-500/15 flex items-center justify-center mb-5">
                  <Shield className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Privacy First</h3>
                <p className="text-sm text-white/35 leading-relaxed">
                  Credentials stored locally. Row-Level Security in the database. Tenant isolation by design. Your data stays yours.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            ARCHITECTURE SECTION
        ═══════════════════════════════════════════════════ */}
        <section className="relative z-10 py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-text-primary">
                Production-grade infrastructure
              </h2>
              <p className="text-text-secondary max-w-lg mx-auto">
                Built on Neon PostgreSQL with Row-Level Security. Every query is tenant-scoped. Every operation is audited.
              </p>
            </div>

            {/* Architecture Diagram */}
            <div className="rounded-2xl border border-border bg-surface-lighter/50 p-8 md:p-10">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                {[
                  { icon: <UserIcon className="w-5 h-5" />, label: 'Auth', sub: 'Email + JWT', color: 'text-emerald-400 bg-emerald-500/15' },
                  { icon: <Building2 className="w-5 h-5" />, label: 'Tenant', sub: 'Team Scope', color: 'text-blue-400 bg-blue-500/15' },
                  { icon: <Layers className="w-5 h-5" />, label: 'SaaS API', sub: 'Router', color: 'text-brand-400 bg-brand-500/15' },
                  { icon: <Cloud className="w-5 h-5" />, label: 'Storage', sub: 'Any Provider', color: 'text-cyan-400 bg-cyan-500/15' },
                  { icon: <Database className="w-5 h-5" />, label: 'Neon DB', sub: 'PostgreSQL', color: 'text-purple-400 bg-purple-500/15' },
                ].map((item, i) => (
                  <div key={i} className="relative text-center group">
                    <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110", item.color)}>
                      {item.icon}
                    </div>
                    <p className="text-sm font-bold text-text-primary/70">{item.label}</p>
                    <p className="text-[10px] text-text-secondary/40 mt-0.5">{item.sub}</p>
                    {i < 4 && (
                      <ChevronRight className="hidden md:block absolute top-6 -right-3 w-4 h-4 text-border" />
                    )}
                  </div>
                ))}
              </div>

              {/* SQL Preview */}
              <div className="mt-8 rounded-xl bg-surface-lighter border border-border overflow-hidden shadow-inner">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-text-secondary/40 font-mono">neon-schema.sql</span>
                </div>
                <div className="p-4 font-mono text-[11px] leading-relaxed text-text-secondary/40 overflow-x-auto">
                  <span className="text-purple-400">CREATE TABLE</span> <span className="text-cyan-600">tenants</span> (<br />
                  {'  '}<span className="text-yellow-600">id</span> UUID <span className="text-text-secondary/40">PRIMARY KEY</span>,<br />
                  {'  '}<span className="text-yellow-600">plan</span> VARCHAR <span className="text-text-secondary/40">DEFAULT</span> <span className="text-orange-600">'free'</span><br />
                  );<br /><br />
                  <span className="text-purple-400">ALTER TABLE</span> files <span className="text-purple-400">ENABLE ROW LEVEL SECURITY</span>;<br />
                  <span className="text-purple-400">CREATE POLICY</span> <span className="text-cyan-600">tenant_isolation</span> <span className="text-text-secondary/40">ON</span> files<br />
                  {'  '}<span className="text-text-secondary/40">USING</span> (tenant_id = <span className="text-orange-600">current_tenant</span>());
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            HOW IT WORKS
        ═══════════════════════════════════════════════════ */}
        <section className="relative z-10 py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-text-primary">
                Get started in 3 steps
              </h2>
              <p className="text-text-secondary max-w-lg mx-auto">From zero to managing your photos in under 2 minutes</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Create Account',
                  desc: 'Sign up with your email. Create a team workspace. Invite your collaborators.',
                  icon: <UserIcon className="w-6 h-6" />,
                  gradient: 'from-brand-500/20 to-brand-500/5',
                },
                {
                  step: '02',
                  title: 'Connect Storage',
                  desc: 'Follow our guided wizard to connect Vercel Blob, S3, or any supported provider.',
                  icon: <Cloud className="w-6 h-6" />,
                  gradient: 'from-cyan-500/20 to-cyan-500/5',
                },
                {
                  step: '03',
                  title: 'Start Managing',
                  desc: 'Upload from phone, browse in grid view, organize albums, delete what you don\'t need.',
                  icon: <ImageIcon className="w-6 h-6" />,
                  gradient: 'from-emerald-500/20 to-emerald-500/5',
                },
              ].map((s, i) => (
                <div key={i} className="relative">
                  <div className={cn("rounded-2xl border border-border bg-gradient-to-b p-8 h-full", s.gradient)}>
                    <div className="text-5xl font-black text-text-secondary/10 mb-4">{s.step}</div>
                    <div className="w-12 h-12 rounded-xl bg-surface-lighter flex items-center justify-center mb-4 text-text-secondary/60">
                      {s.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-text-primary">{s.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{s.desc}</p>
                  </div>
                  {i < 2 && (
                    <ArrowRight className="hidden md:block absolute top-1/2 -right-5 w-5 h-5 text-white/10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            PRICING
        ═══════════════════════════════════════════════════ */}
        <section className="relative z-10 py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-5">
                <BarChart3 className="w-3 h-3" /> Pricing
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-text-primary">
                Simple, transparent pricing
              </h2>
              <p className="text-text-secondary">Free forever for personal use. Upgrade when your team grows.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  name: 'Starter',
                  price: '$0',
                  period: 'forever',
                  desc: 'Perfect for personal use',
                  features: ['1 GB Storage', '3 Team Members', '1 Storage Connection', 'Grid & List Views', 'Phone Upload', 'Basic Albums'],
                  cta: 'Start Free',
                  popular: false,
                  gradient: 'border-white/[0.06]',
                },
                {
                  name: 'Pro',
                  price: '$29',
                  period: '/month',
                  desc: 'For growing teams',
                  features: ['50 GB Storage', '10 Team Members', '5 Storage Connections', 'Everything in Starter', 'Batch Operations', 'Priority Support', 'API Access', 'Custom Branding'],
                  cta: 'Start Pro Trial',
                  popular: true,
                  gradient: 'border-brand-500/30 ring-1 ring-brand-500/20 bg-brand-500/[0.02]',
                },
                {
                  name: 'Enterprise',
                  price: 'Custom',
                  period: '',
                  desc: 'For large organizations',
                  features: ['500 GB+ Storage', '100+ Team Members', '20+ Connections', 'Everything in Pro', 'SSO / SAML', 'SLA & Uptime', 'Dedicated Support', 'On-Premise Option'],
                  cta: 'Contact Sales',
                  popular: false,
                  gradient: 'border-border',
                },
              ].map((plan, i) => (
                <div key={i} className={cn("rounded-2xl border bg-surface-lighter/50 p-8 relative flex flex-col", plan.gradient)}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-600 text-white text-xs font-bold rounded-full shadow-lg shadow-brand-500/30">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-1 text-text-primary">{plan.name}</h3>
                    <p className="text-xs text-text-secondary/60">{plan.desc}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-black text-text-primary">{plan.price}</span>
                    <span className="text-sm text-text-secondary/60 ml-1">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm text-text-secondary">
                        <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setMode('signup')}
                    className={cn(
                      "w-full py-3 rounded-xl text-sm font-bold transition-all",
                      plan.popular
                        ? "bg-brand-600 text-surface hover:bg-brand-500 shadow-lg shadow-brand-500/20"
                        : "bg-surface-lighter text-text-secondary hover:bg-surface-light border border-border"
                    )}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            TECH STACK BADGES
        ═══════════════════════════════════════════════════ */}
        <section className="relative z-10 py-16 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <p className="text-center text-xs font-bold text-white/15 uppercase tracking-[0.2em] mb-8">
              Powered by
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { name: 'TypeScript', icon: '🔷' },
                { name: 'React 19', icon: '⚛️' },
                { name: 'Tailwind CSS', icon: '🎨' },
                { name: 'Neon PostgreSQL', icon: '🐘' },
                { name: 'Vercel', icon: '▲' },
                { name: 'IndexedDB', icon: '💾' },
              ].map(t => (
                <div key={t.name} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-lighter border border-border text-sm text-text-secondary/60 shadow-sm">
                  <span>{t.icon}</span>
                  <span className="font-medium">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            FINAL CTA
        ═══════════════════════════════════════════════════ */}
        <section className="relative z-10 py-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-500/30 rotate-3">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-text-primary">
              Ready to take control?
            </h2>
            <p className="text-lg text-text-secondary mb-10 max-w-lg mx-auto">
              Your photos deserve better than being trapped in one platform.
              Connect your cloud. Own your data. Start today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setMode('signup')}
                className="group flex items-center gap-3 px-10 py-5 text-lg font-bold bg-text-primary text-surface rounded-2xl hover:opacity-90 transition-all shadow-2xl shadow-brand-500/10 hover:scale-[1.02]"
              >
                Get Started Free
                <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
              <button
                onClick={handleDemo}
                disabled={loading}
                className="px-6 py-5 text-lg font-medium text-text-secondary/60 hover:text-text-primary transition-colors"
              >
                or try the demo →
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════ */}
        <footer className="relative z-10 border-t border-border py-10">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-surface" />
                </div>
                <span className="font-bold text-text-secondary/50">PixelVault</span>
                <span className="text-xs text-text-secondary/20">© 2024</span>
              </div>
              <div className="flex items-center gap-6 text-xs text-text-secondary/30">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  Built with TypeScript + React 19 + Tailwind CSS
                </span>
                <span>·</span>
                <span>Neon PostgreSQL</span>
                <span>·</span>
                <span>Vercel Blob</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGIN / SIGNUP FORMS
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-surface text-text-primary flex">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[40%] w-[600px] h-[600px] rounded-full bg-brand-600/[0.06] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[30%] w-[500px] h-[500px] rounded-full bg-purple-600/[0.05] blur-[120px]" />
      </div>

      {/* Left Panel (desktop) */}
      <div className="hidden lg:flex flex-col justify-between flex-1 px-16 py-12 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25 rotate-3">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight">PixelVault</span>
              <p className="text-[10px] text-white/20 font-medium">Cloud Photo Management</p>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-black tracking-tight mb-3 leading-tight text-text-primary">
              Your photos.
              <br />
              <span className="text-text-secondary/40">Your cloud.</span>
              <br />
              <span className="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">Your control.</span>
            </h2>
            <p className="text-sm text-text-secondary/40 mb-10 leading-relaxed">
              Connect any storage provider. Upload from phone. Manage your team's photos with enterprise-grade security.
            </p>

            <div className="space-y-5">
              {[
                { icon: <Cloud className="w-5 h-5" />, title: 'Multi-Provider', desc: 'Vercel Blob, S3, Supabase, R2 — connect any provider' },
                { icon: <Smartphone className="w-5 h-5" />, title: 'Phone Upload', desc: 'Camera roll integration on iOS & Android' },
                { icon: <Users className="w-5 h-5" />, title: 'Team Workspaces', desc: 'Multi-tenant with role-based access control' },
                { icon: <Trash2 className="w-5 h-5" />, title: 'Real Delete', desc: 'Permanently remove files from cloud storage' },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-lighter border border-border flex items-center justify-center flex-shrink-0 text-brand-500">
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary/70 text-sm">{f.title}</h4>
                    <p className="text-xs text-text-secondary/40 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="max-w-md">
          <div className="rounded-xl bg-surface-lighter border border-border p-5 shadow-sm">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 text-amber-500" fill="#f59e0b" />
              ))}
            </div>
            <p className="text-sm text-text-secondary/60 italic leading-relaxed">
              "Finally, a photo manager that works with our existing cloud infrastructure instead of forcing us into another walled garden."
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-xs font-bold text-surface">
                S
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary/60">Sarah K.</p>
                <p className="text-[10px] text-text-secondary/30">Creative Director</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-[420px] animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center rotate-3">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold">PixelVault</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black mb-2 text-text-primary">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-text-secondary/60 text-sm">
              {mode === 'login'
                ? 'Sign in to your PixelVault workspace'
                : 'Start managing your photos in seconds'}
            </p>
          </div>

          <div className="rounded-2xl bg-surface-lighter/50 border border-border p-7 backdrop-blur-sm space-y-4 shadow-xl">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary/60 mb-1.5">Your Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => { setName(e.target.value); setError(''); }}
                      placeholder="John Doe"
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-secondary/20 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary/60 mb-1.5">Team Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                    <input
                      type="text"
                      value={teamName}
                      onChange={e => { setTeamName(e.target.value); setError(''); }}
                      placeholder="Acme Studio"
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-secondary/20 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all shadow-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary/60 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@company.com"
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary/60 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleSignup(); }}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                  className="w-full pl-11 pr-12 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all shadow-sm"
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary/40 hover:text-text-primary transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && password.length > 0 && (
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-1 rounded-full transition-colors",
                      password.length >= i * 2
                        ? i <= 1 ? "bg-red-500" : i <= 2 ? "bg-amber-500" : i <= 3 ? "bg-blue-500" : "bg-emerald-500"
                        : "bg-white/[0.06]"
                    )}
                  />
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">{error}</span>
              </div>
            )}

            <button
              onClick={mode === 'login' ? handleLogin : handleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold bg-text-primary text-surface rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-500/10"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            {mode === 'signup' && (
              <div className="flex items-start gap-2 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-white/20">
                  Free plan includes 1GB storage, 3 team members, and 1 storage connection.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-white/15">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleDemo}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-text-secondary/40 hover:text-text-primary bg-surface-lighter hover:bg-surface-light border border-border rounded-xl transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" />
              Try Demo — No Signup Required
            </button>

            <p className="text-center text-sm text-white/25">
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => { setMode('signup'); setError(''); }} className="text-brand-400 hover:text-brand-300 font-semibold">
                    Sign Up
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(''); }} className="text-brand-400 hover:text-brand-300 font-semibold">
                    Log In
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-white/[0.04]">
            <button
              onClick={() => {
                setIsStaffMode(!isStaffMode);
                setMode('login');
                setError('');
              }}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isStaffMode
                  ? "text-brand-400 bg-brand-500/5 hover:bg-brand-500/10"
                  : "text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10"
              )}
            >
              {isStaffMode ? (
                <>Return to Client Login</>
              ) : (
                <><ShieldCheck className="w-3.5 h-3.5" /> Staff Access</>
              )}
            </button>
          </div>

          <button
            onClick={() => setMode('landing')}
            className="block mx-auto mt-8 text-xs text-white/15 hover:text-white/30 transition-colors"
          >
            ← Back to homepage
          </button>
        </div>
      </div>
    </div>
  );
}
