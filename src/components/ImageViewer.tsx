import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Trash2, Info, ZoomIn, ZoomOut, Folder, RotateCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Photo } from '@/types/storage';

interface Props {
    images: Photo[];
    initialIndex: number;
    onClose: () => void;
    onDelete?: (photo: Photo) => void;
}

export function ImageViewer({ images, initialIndex, onClose, onDelete }: Props) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showInfo, setShowInfo] = useState(false);
    const [scale, setScale] = useState(1);
    const [isLoaded, setIsLoaded] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

    const currentImage = images[currentIndex];

    useEffect(() => {
        setScale(1);
        setIsLoaded(false);
    }, [currentIndex]);

    const handleNext = useCallback(() => {
        if (currentIndex < images.length - 1) {
            setSlideDirection('left');
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setSlideDirection(null);
            }, 150);
        }
    }, [currentIndex, images.length]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setSlideDirection('right');
            setTimeout(() => {
                setCurrentIndex(prev => prev - 1);
                setSlideDirection(null);
            }, 150);
        }
    }, [currentIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === '+' || e.key === '=') setScale(s => Math.min(3, s + 0.25));
            if (e.key === '-') setScale(s => Math.max(0.5, s - 0.25));
            if (e.key === '0') setScale(1);
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleNext, handlePrev, onClose]);

    if (!currentImage) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
            {/* Cinematic Backdrop */}
            <div className="absolute inset-0 bg-black/95" />
            <div
                className="absolute inset-0 opacity-20 blur-[80px] scale-110 transition-all duration-700"
                style={{
                    backgroundImage: `url(${currentImage.src})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]" />

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 px-5 py-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center gap-4">
                    <span className="text-white/90 text-sm font-bold tabular-nums bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                        {currentIndex + 1} / {images.length}
                    </span>
                    <span className="text-white/40 text-sm font-medium truncate max-w-[300px] hidden md:block">
                        {currentImage.name}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {onDelete && (
                        <button
                            onClick={() => onDelete(currentImage)}
                            className="p-2.5 rounded-xl text-white/50 hover:text-red-400 hover:bg-white/10 transition-all"
                            title="Delete"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className={cn(
                            "p-2.5 rounded-xl transition-all",
                            showInfo ? "text-white bg-white/15" : "text-white/50 hover:text-white hover:bg-white/10"
                        )}
                        title="Info"
                    >
                        <Info className="w-5 h-5" />
                    </button>
                    <a
                        href={currentImage.src}
                        download={currentImage.name}
                        className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                        title="Download"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Download className="w-5 h-5" />
                    </a>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all ml-1"
                        title="Close (Esc)"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Image Area */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {/* Navigation Buttons */}
                {currentIndex > 0 && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-5 z-10 p-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-white/15 hover:text-white backdrop-blur-md transition-all border border-white/5 hover:border-white/10 hidden md:flex items-center justify-center group"
                    >
                        <ChevronLeft className="w-7 h-7 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                )}

                {currentIndex < images.length - 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-5 z-10 p-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-white/15 hover:text-white backdrop-blur-md transition-all border border-white/5 hover:border-white/10 hidden md:flex items-center justify-center group"
                    >
                        <ChevronRight className="w-7 h-7 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                )}

                {/* Image Container */}
                <div
                    className={cn(
                        "relative transition-all duration-300 ease-premium",
                        slideDirection === 'left' && "opacity-0 -translate-x-8",
                        slideDirection === 'right' && "opacity-0 translate-x-8",
                        !slideDirection && "opacity-100 translate-x-0"
                    )}
                    style={{ transform: `scale(${scale})` }}
                >
                    {/* Loading Spinner */}
                    {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 border-2 border-white/10 border-t-brand-400 rounded-full animate-spin" />
                        </div>
                    )}
                    <img
                        src={currentImage.src}
                        alt={currentImage.name}
                        className={cn(
                            "max-h-[85vh] max-w-[90vw] object-contain transition-all duration-500 rounded-lg",
                            isLoaded ? "opacity-100 shadow-[0_0_80px_rgba(0,0,0,0.5)]" : "opacity-0"
                        )}
                        onLoad={() => setIsLoaded(true)}
                        draggable={false}
                    />
                </div>
            </div>

            {/* Info Panel */}
            {showInfo && (
                <div className="absolute right-0 top-0 bottom-0 w-80 glass border-l border-white/10 p-6 animate-slide-in z-20 overflow-y-auto custom-scrollbar">
                    <h3 className="text-lg font-bold text-white mb-6">Details</h3>

                    <div className="space-y-5">
                        {[
                            { label: 'Filename', value: currentImage.name, breakAll: true },
                            { label: 'Size', value: `${(currentImage.size / 1024 / 1024).toFixed(2)} MB` },
                            { label: 'Quality', value: 'Original' },
                            { label: 'Format', value: (currentImage.contentType?.split('/')[1] || 'Unknown').toUpperCase() },
                            { label: 'Uploaded', value: new Date(currentImage.createdAt).toLocaleString() },
                        ].map(item => (
                            <div key={item.label}>
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] block mb-1.5">{item.label}</label>
                                <p className={cn("text-sm text-white/80 font-medium", item.breakAll && "break-all")}>{item.value}</p>
                            </div>
                        ))}
                        <div>
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] block mb-1.5">Folder</label>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 font-medium">
                                <Folder className="w-3 h-3 text-white/30" />
                                {currentImage.folder}
                            </div>
                        </div>

                        {/* Technical Metadata */}
                        {currentImage.metadata && Object.keys(currentImage.metadata || {}).filter(k => k !== 'source' && k !== 'device').length > 0 && (
                            <div className="pt-5 border-t border-white/5 space-y-5 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.15em] block">Technical Specs</label>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                    {Object.entries(currentImage.metadata || {}).map(([key, value]) => {
                                        if (key === 'source' || key === 'device') return null;
                                        if (typeof value === 'object') return null; // Skip complex objects for now (like gps)
                                        return (
                                            <div key={key}>
                                                <label className="text-[9px] font-bold text-white/20 uppercase block mb-1">{key}</label>
                                                <p className="text-xs text-white/70 font-medium truncate">{String(value)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <button
                    onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setScale(1)}
                    className="text-[11px] font-bold text-white/60 hover:text-white w-12 text-center tabular-nums transition-colors"
                >
                    {Math.round(scale * 100)}%
                </button>
                <button
                    onClick={() => setScale(s => Math.min(3, s + 0.25))}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button
                    onClick={() => setScale(1)}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                    title="Reset zoom"
                >
                    <RotateCw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 max-w-md overflow-x-auto custom-scrollbar px-2 py-1">
                    {images.slice(Math.max(0, currentIndex - 3), Math.min(images.length, currentIndex + 4)).map((img, i) => {
                        const actualIndex = Math.max(0, currentIndex - 3) + i;
                        return (
                            <button
                                key={img.id}
                                onClick={() => setCurrentIndex(actualIndex)}
                                className={cn(
                                    "w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 border-2",
                                    actualIndex === currentIndex
                                        ? "border-brand-400 scale-110 shadow-glow-brand"
                                        : "border-transparent opacity-50 hover:opacity-80 hover:border-white/20"
                                )}
                            >
                                <img src={img.src} alt="" className="w-full h-full object-cover" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
