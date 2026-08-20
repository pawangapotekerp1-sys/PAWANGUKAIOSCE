import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MaterialLink } from '@/lib/api/material-api';
import { X, Maximize2, Minimize2, Loader2, Video, FileText, Link as LinkIcon, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';

export type ModalSize = 'standard' | 'fullscreen';

interface MediaPreviewModalProps {
  link: MaterialLink | null;
  onClose: () => void;
}

export function getEmbedUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const url = rawUrl.trim();
    // 1. Google Drive File Preview (PDFs, PPT, Videos, Documents)
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    // 2. Google Docs / Presentation / Spreadsheets
    if (url.includes('docs.google.com')) {
      return url.replace(/\/(edit|view|htmlview).*$/, '/preview');
    }
    // 3. YouTube
    if (url.includes('youtube.com/watch')) {
      const parsed = new URL(url);
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (url.includes('youtu.be/')) {
      const match = url.match(/youtu\.be\/([^\?]+)/);
      if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
  } catch {
    return rawUrl;
  }
}

export function MediaPreviewModal({ link, onClose }: MediaPreviewModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!link) return null;

  const embedUrl = getEmbedUrl(link.url);
  const IconComponent = link.drive_type === 'VIDEO' ? Video : link.drive_type === 'PPT' ? FileText : LinkIcon;

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.3, 1.9));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.3, 1));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  return createPortal(
    <div 
      className={`fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in-0 duration-200 ${
        isFullscreen ? 'p-0' : 'p-3 md:p-6'
      }`}
      onClick={onClose}
    >
      <div 
        ref={containerRef}
        className={`bg-slate-950 shadow-2xl overflow-hidden flex flex-col border border-slate-800 transition-all duration-200 ${
          isFullscreen 
            ? 'w-screen h-screen rounded-none border-0' 
            : 'w-full max-w-5xl h-[85vh] max-h-[820px] rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-slate-100 flex-shrink-0 gap-2 z-30">
          <div className="flex items-center space-x-3 overflow-hidden mr-2">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              link.drive_type === 'VIDEO'
                ? 'bg-rose-500/20 text-rose-400'
                : link.drive_type === 'PPT'
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h3 className="font-semibold text-base text-slate-100 truncate">
                {link.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Zoom / Lebarkan Control Buttons */}
            {link.drive_type !== 'VIDEO' && (
              <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 space-x-1">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded"
                  title="Kecilkan Teks PDF"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    zoomScale > 1 ? 'bg-primary/20 text-primary border border-primary/30' : 'text-slate-400'
                  }`}
                  title="Reset Zoom"
                >
                  {Math.round(zoomScale * 100)}% {zoomScale > 1 ? '(Lebar)' : ''}
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 1.9}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded"
                  title="Perbesar / Lebarkan Teks PDF"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kecilkan</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Iframe */}
        <div className="relative w-full flex-1 bg-black flex items-center justify-center overflow-hidden">
          {iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-950/80 z-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium text-slate-300">Memuat pratinjau...</p>
            </div>
          )}

          {/* Security Shield Overlay: Blocks Google Drive native top-right pop-out [↗] button */}
          <div 
            className="absolute top-0 right-0 w-28 h-16 z-30 bg-transparent cursor-default" 
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            title="Pratinjau Materi"
          />
          
          <div 
            className="w-full h-full flex items-center justify-center transition-transform duration-300 origin-center overflow-auto"
            style={{
              transform: `scale(${zoomScale})`,
            }}
          >
            <iframe
              key={embedUrl}
              src={embedUrl}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              onLoad={() => setIframeLoading(false)}
              title={link.title}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
