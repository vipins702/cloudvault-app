import { useState } from 'react';
import {
    X, Check, Palette, Type, Building,
    Moon, Sun, Layout, Image as ImageIcon,
    Sparkles
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface BrandingSettingsProps {
    open: boolean;
    onClose: () => void;
    branding: {
        companyName: string;
        logoUrl: string;
        theme: 'light' | 'dark';
        font: 'sans' | 'serif' | 'mono';
    };
    onUpdate: (updates: Partial<BrandingSettingsProps['branding']>) => void;
}

export function BrandingSettings({ open, onClose, branding, onUpdate }: BrandingSettingsProps) {
    const [tempBranding, setTempBranding] = useState(branding);
    const [saved, setSaved] = useState(false);

    if (!open) return null;

    const handleSave = () => {
        onUpdate(tempBranding);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fade-in">
            <div className="w-full max-w-2xl bg-[#0c0c14] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="flex items-center justify-between px-10 py-8 border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                            <Sparkles className="w-6 h-6 text-brand-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Vibe & Branding</h2>
                            <p className="text-xs text-white/30 font-medium">Personalize your vault's professional aesthetic</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 text-white/20 hover:text-white transition-all rounded-xl hover:bg-white/[0.06]">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex">
                    {/* Navigation */}
                    <div className="w-48 border-r border-white/[0.06] p-6 space-y-2">
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-500/10 text-brand-400 text-sm font-bold border border-brand-500/10 transition-all">
                            <Building className="w-4 h-4" /> Identity
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] text-sm font-bold transition-all">
                            <Palette className="w-4 h-4" /> Theme
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] text-sm font-bold transition-all">
                            <Type className="w-4 h-4" /> Typography
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-10 space-y-10 overflow-y-auto max-h-[60vh]">
                        {/* Identity */}
                        <section className="space-y-6">
                            <h3 className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">Company Identity</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/60 ml-1">Company Name</label>
                                    <input
                                        value={tempBranding.companyName}
                                        onChange={e => setTempBranding({ ...tempBranding, companyName: e.target.value })}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                        placeholder="PixelVault Inc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/60 ml-1">Logo URL (Icon)</label>
                                    <div className="flex gap-4">
                                        <input
                                            value={tempBranding.logoUrl}
                                            onChange={e => setTempBranding({ ...tempBranding, logoUrl: e.target.value })}
                                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-mono"
                                            placeholder="https://..."
                                        />
                                        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                                            {tempBranding.logoUrl ? (
                                                <img src={tempBranding.logoUrl} className="w-8 h-8 object-contain" alt="Logo preview" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-white/10" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Theme */}
                        <section className="space-y-6">
                            <h3 className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">Visual Mode</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setTempBranding({ ...tempBranding, theme: 'light' })}
                                    className={cn(
                                        "p-6 rounded-3xl border transition-all flex flex-col items-center gap-3",
                                        tempBranding.theme === 'light'
                                            ? "bg-white text-black border-white shadow-xl shadow-white/5"
                                            : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05]"
                                    )}
                                >
                                    <Sun className="w-8 h-8" />
                                    <span className="text-sm font-black">Light Mode</span>
                                </button>
                                <button
                                    onClick={() => setTempBranding({ ...tempBranding, theme: 'dark' })}
                                    className={cn(
                                        "p-6 rounded-3xl border transition-all flex flex-col items-center gap-3",
                                        tempBranding.theme === 'dark'
                                            ? "bg-brand-600 text-white border-brand-500 shadow-xl shadow-brand-500/20"
                                            : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05]"
                                    )}
                                >
                                    <Moon className="w-8 h-8" />
                                    <span className="text-sm font-black">Dark Mode</span>
                                </button>
                            </div>
                        </section>

                        {/* Typography */}
                        <section className="space-y-6">
                            <h3 className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">Typography</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { id: 'sans', name: 'Inter Sans', desc: 'Modern & Clean' },
                                    { id: 'serif', name: 'Premium Serif', desc: 'Luxury & Elegant' },
                                    { id: 'mono', name: 'System Mono', desc: 'Technical & Fast' }
                                ].map(font => (
                                    <button
                                        key={font.id}
                                        onClick={() => setTempBranding({ ...tempBranding, font: font.id as any })}
                                        className={cn(
                                            "p-5 rounded-[2rem] border transition-all text-left space-y-2",
                                            tempBranding.font === font.id
                                                ? "bg-white/[0.08] border-brand-500/50 ring-1 ring-brand-500/20 shadow-lg"
                                                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                                        )}
                                    >
                                        <div className={cn("text-lg font-black", `font - ${font.id} `)}>Aa</div>
                                        <div>
                                            <div className="text-[11px] font-black text-white">{font.name}</div>
                                            <div className="text-[9px] text-white/30 uppercase tracking-wider font-bold">{font.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-8 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                    <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Layout className="w-3 h-3" /> Styles update in real-time
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saved}
                        className={cn(
                            "flex items-center gap-3 px-10 py-4 font-black text-sm rounded-2xl transition-all active:scale-95",
                            saved
                                ? "bg-emerald-500 text-white"
                                : "bg-brand-600 text-white hover:bg-brand-500 shadow-xl shadow-brand-500/20"
                        )}
                    >
                        {saved ? <Check className="w-5 h-5" /> : null}
                        {saved ? 'Branding Applied!' : 'Save Branding'}
                    </button>
                </div>
            </div>
        </div>
    );
}
