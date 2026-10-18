import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPostgresAssetImageMeta } from '../../lib/api';

export interface InspectableAssetImage {
  id: string;
  code?: string;
  name: string;
  category?: string;
  subCategory?: string;
  imageUrl: string;
  imageAlt?: string;
  highResImageUrl?: string;
}

interface FullScreenImageViewerModalProps {
  item: InspectableAssetImage | null;
  onClose: () => void;
}

export const FullScreenImageViewerModal: React.FC<FullScreenImageViewerModalProps> = ({
  item,
  onClose,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [displayImageUrl, setDisplayImageUrl] = useState<string>(item?.imageUrl || '');
  const [isLoadingHighRes, setIsLoadingHighRes] = useState<boolean>(false);
  const [isHighResLoaded, setIsHighResLoaded] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageSizeBytes, setImageSizeBytes] = useState<number | null>(null);

  // Reset transform and load high-res image from PostgreSQL asset_images table when item changes
  useEffect(() => {
    if (!item) return;

    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setDisplayImageUrl(item.imageUrl);
    setIsHighResLoaded(false);
    setImageDimensions(null);
    setImageSizeBytes(null);

    // If item already has an inline high-res data URL (e.g., in Camera Review before saving)
    if (item.highResImageUrl && item.highResImageUrl.startsWith('data:')) {
      setDisplayImageUrl(item.highResImageUrl);
      setIsHighResLoaded(true);
      setImageSizeBytes(Math.round((item.highResImageUrl.length * 3) / 4));
      return;
    }

    // Fetch dedicated high-res record from PostgreSQL /api/images/:itemId
    if (item.id && !item.id.startsWith('preview-')) {
      let cancelled = false;
      setIsLoadingHighRes(true);
      fetchPostgresAssetImageMeta(item.id)
        .then((meta) => {
          if (cancelled || !meta || !meta.imageUrl) return;
          setDisplayImageUrl(meta.imageUrl);
          setIsHighResLoaded(Boolean(meta.isHighRes));
          if (meta.width && meta.height) {
            setImageDimensions({ width: meta.width, height: meta.height });
          }
          if (meta.sizeBytes) {
            setImageSizeBytes(meta.sizeBytes);
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoadingHighRes(false);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [item]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(4, Number((prev + 0.5).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(2)));
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const handleResetView = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleDoubleTap = useCallback(() => {
    setScale((prev) => {
      if (prev > 1) {
        setPosition({ x: 0, y: 0 });
        return 1;
      }
      return 2.5;
    });
  }, []);

  const handleDownloadOriginal = useCallback(() => {
    if (!item || !displayImageUrl) return;
    const safeName = (item.name || 'asset')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const prefix = item.code ? `${item.code.replace(/[^a-zA-Z0-9-_]/g, '')}-` : '';
    const link = document.createElement('a');
    link.href = displayImageUrl;
    link.download = `${prefix}${safeName || 'omnivault-asset'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [item, displayImageUrl]);

  // Keyboard navigation
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-' || e.key === '_') handleZoomOut();
      else if (e.key === 'r' || e.key === 'R') handleRotateRight();
      else if (e.key === '0') handleResetView();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose, handleZoomIn, handleZoomOut, handleRotateRight, handleResetView]);

  if (!item) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))));
    } else {
      setScale((prev) => {
        const next = Math.max(1, Number((prev - 0.25).toFixed(2)));
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const formattedSize = imageSizeBytes
    ? imageSizeBytes > 1024 * 1024
      ? `${(imageSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.round(imageSizeBytes / 1024))} KB`
    : null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between select-none animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <header
        className="w-full px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between gap-3 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            aria-label="Close full-screen viewer"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-colors shrink-0 active:scale-95"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {item.code && (
                <span className="font-mono text-[11px] text-blue-300 font-semibold tabular-nums">
                  {item.code}
                </span>
              )}
              {item.code && <span className="text-white/40 text-xs">·</span>}
              <span className="font-mono text-[11px] text-emerald-300 font-medium">
                {isLoadingHighRes
                  ? 'Loading HD Master...'
                  : isHighResLoaded
                  ? 'PostgreSQL HD Image'
                  : 'Vault Asset Image'}
              </span>
              {imageDimensions && (
                <>
                  <span className="text-white/40 text-xs">·</span>
                  <span className="font-mono text-[11px] text-white/70 tabular-nums">
                    {imageDimensions.width}×{imageDimensions.height}px
                  </span>
                </>
              )}
              {formattedSize && (
                <>
                  <span className="text-white/40 text-xs">·</span>
                  <span className="font-mono text-[11px] text-white/70 tabular-nums">
                    {formattedSize}
                  </span>
                </>
              )}
            </div>
            <h3 className="text-white font-semibold text-[15px] truncate leading-snug">
              {item.name}
            </h3>
          </div>
        </div>

        {/* Download Original Button */}
        <button
          onClick={handleDownloadOriginal}
          className="min-h-[44px] px-3.5 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-lg transition-all shrink-0 whitespace-nowrap active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          <span className="hidden sm:inline">Download Photo</span>
        </button>
      </header>

      {/* Interactive Zoom & Pan Canvas */}
      <div
        className={`relative flex-1 w-full h-full overflow-hidden flex items-center justify-center touch-none ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleTap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <img
          src={displayImageUrl}
          alt={item.imageAlt || item.name}
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={(e) => {
            const imgEl = e.currentTarget;
            if (imgEl.naturalWidth && imgEl.naturalHeight) {
              setImageDimensions({
                width: imgEl.naturalWidth,
                height: imgEl.naturalHeight,
              });
            }
          }}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="max-w-[92vw] max-h-[76vh] object-contain rounded-lg shadow-2xl select-none pointer-events-none"
        />

        {/* Helper Hint when zoomed in */}
        {scale > 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md text-white/85 px-3 py-1 rounded-full text-[11px] font-mono border border-white/10 pointer-events-none">
            Drag to pan · Double-tap to reset
          </div>
        )}
      </div>

      {/* Bottom Interactive Inspection Toolbar (Thumb Zone) */}
      <footer
        className="w-full px-4 pb-6 pt-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-2 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl max-w-full overflow-x-auto">
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            aria-label="Zoom out"
            title="Zoom Out (-)"
            className="min-w-[44px] min-h-[44px] rounded-xl text-white hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent flex items-center justify-center transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">zoom_out</span>
          </button>

          {/* Zoom Percentage Readout */}
          <button
            onClick={handleResetView}
            title="Click to reset zoom to 100%"
            className="min-h-[44px] px-2.5 rounded-xl hover:bg-white/10 text-white font-mono text-[12px] font-bold tabular-nums flex items-center justify-center shrink-0"
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            disabled={scale >= 4}
            aria-label="Zoom in"
            title="Zoom In (+)"
            className="min-w-[44px] min-h-[44px] rounded-xl text-white hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent flex items-center justify-center transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">zoom_in</span>
          </button>

          <div className="w-px h-6 bg-white/20 mx-0.5 shrink-0" />

          {/* Rotate Counter-Clockwise */}
          <button
            onClick={handleRotateLeft}
            aria-label="Rotate counter-clockwise"
            title="Rotate Left (-90°)"
            className="min-w-[44px] min-h-[44px] rounded-xl text-white hover:bg-white/15 flex items-center justify-center transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">rotate_left</span>
          </button>

          {/* Rotate Clockwise */}
          <button
            onClick={handleRotateRight}
            aria-label="Rotate clockwise"
            title="Rotate Right (+90°)"
            className="min-w-[44px] min-h-[44px] rounded-xl text-white hover:bg-white/15 flex items-center justify-center transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">rotate_right</span>
          </button>

          <div className="w-px h-6 bg-white/20 mx-0.5 shrink-0" />

          {/* Reset View */}
          <button
            onClick={handleResetView}
            disabled={scale === 1 && rotation % 360 === 0 && position.x === 0 && position.y === 0}
            aria-label="Reset view"
            title="Reset Zoom & Rotation"
            className="min-h-[44px] px-3 rounded-xl text-white hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent text-[12px] font-medium flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            <span>Reset</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
