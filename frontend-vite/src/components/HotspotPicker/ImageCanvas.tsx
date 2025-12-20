import React, { useCallback } from 'react';
import { HotspotMarker } from './HotspotMarker';
import { useDragPan } from './hooks/useDragPan';
import { useHotspotDrag } from './hooks/useHotspotDrag';
import type { ImageCanvasProps } from './types';

/**
 * ImageCanvas component - renders the 1:1 aspect ratio canvas with cursor image
 * and hotspot marker overlay
 */
export function ImageCanvas({
    objectUrl,
    filename,
    overlayRef,
    imgRef,
    previewBg,
    imageTransform,
    hotspot,
    targetSize,
    hotspotMode,
    hotspotColor,
    accentColorValue,
    activeTab,
    setImageTransform,
    setHotspot,
    onPick
}: ImageCanvasProps) {
    // NOTE: Previously we reset the image transform when switching from
    // resize -> hotspot mode to avoid overflow/clipping. That behavior caused
    // the editor to unexpectedly lose the user's translation/zoom. Keep the
    // user's transform as-is across mode switches so they can continue working
    // without losing context.
    // Get background style based on selected background type
    const getBackgroundStyle = () => {
        switch (previewBg) {
            case 'checkerboard':
                return 'repeating-conic-gradient(#fff 0% 25%, #ddd 0% 50%) 50% / 20px 20px';
            case 'black':
                return '#000';
            case 'yellow':
                return '#FFF800';
            case 'white':
                return '#fff';
            default:
                return previewBg; // Custom color
        }
    };

    // Handle drag callback - updates image transform on drag
    const handleDrag = useCallback(
        (dx: number, dy: number) => {
            setImageTransform(prev => ({
                ...prev,
                offsetX: prev.offsetX + dx,
                offsetY: prev.offsetY + dy
            }));
        },
        [setImageTransform]
    );

    // Use drag-to-pan hook for resize mode with global tracking
    const { isDragging: isPanDragging, handlers: panHandlers } = useDragPan(
        activeTab === 'resize',
        imageTransform.scale,
        handleDrag
    );

    // Handle hotspot position change
    const handleHotspotChange = useCallback(
        (x: number, y: number) => {
            setHotspot({ x, y });
        },
        [setHotspot]
    );

    // Use hotspot drag hook for hotspot mode
    const { isDragging: isHotspotDragging, handlers: hotspotHandlers } = useHotspotDrag(
        activeTab === 'hotspot',
        overlayRef,
        targetSize,
        handleHotspotChange
    );

    // Handle click for hotspot picking (fallback for single clicks)
    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (activeTab === 'hotspot') {
                onPick(e);
            }
        },
        [activeTab, onPick]
    );

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {/* Make the canvas responsive: full width of the card, keep a 1:1 aspect ratio
      and cap the maximum size so it doesn't grow too large. */}
            <div
                id="cursor-preview-canvas"
                ref={overlayRef}
                onMouseDown={activeTab === 'resize' ? panHandlers.onMouseDown : hotspotHandlers.onMouseDown}
                onMouseMove={activeTab === 'resize' ? panHandlers.onMouseMove : hotspotHandlers.onMouseMove}
                onMouseUp={activeTab === 'resize' ? panHandlers.onMouseUp : hotspotHandlers.onMouseUp}
                onMouseLeave={activeTab === 'resize' ? panHandlers.onMouseLeave : hotspotHandlers.onMouseLeave}
                onMouseEnter={activeTab === 'resize' ? panHandlers.onMouseEnter : hotspotHandlers.onMouseEnter}
                onClick={handleClick}
                data-testid="image-overlay"
                style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    maxWidth: '420px',
                    borderRadius: 4,
                    // Don't allow the image to visually overflow the canvas —
                    // this prevents the cursor preview from appearing outside its
                    // container and interfering with other UI elements.
                    overflow: 'hidden',
                    background: getBackgroundStyle(),
                    boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                    border: '2px solid rgba(124,58,237,0.8)',
                    cursor: activeTab === 'resize' ? (isPanDragging ? 'grabbing' : 'grab') : (isHotspotDragging ? 'grabbing' : 'crosshair'),
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                }}
            >
                {objectUrl && (
                    <>
                        {/* Single image that user can position */}
                        <img
                            ref={imgRef}
                            src={objectUrl}
                            alt={filename}
                            draggable={false}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block',
                                imageRendering: 'pixelated',
                                transform: `scale(${imageTransform.scale}) translate(${imageTransform.offsetX}px, ${imageTransform.offsetY}px)`,
                                transformOrigin: 'center',
                                transition: activeTab === 'resize' ? 'none' : (isPanDragging ? 'none' : 'transform 0.1s ease-out'),
                                pointerEvents: 'none',
                                userSelect: 'none',
                                WebkitUserDrag: 'none'
                            } as React.CSSProperties}
                        />
                    </>
                )}
                {/* Crosshair marker at current hotspot - only show in hotspot mode */}
                {activeTab === 'hotspot' && (
                    <HotspotMarker overlayRef={overlayRef} hotspot={hotspot} size={targetSize} mode={hotspotMode} color={hotspotColor} accentColorValue={accentColorValue} />
                )}
            </div>
        </div>
    );
}
