import React, { useEffect, useState } from 'react';
import type { HotspotMarkerProps } from './types';

/**
 * HotspotMarker component - renders the hotspot visualization
 * Supports two modes: 'axis' (full crosshair) and 'crosshair' (FPS-style)
 */
export function HotspotMarker({ overlayRef, hotspot, size, mode, color, accentColorValue }: HotspotMarkerProps) {
    const [pos, setPos] = useState({ left: 0, top: 0 });

    useEffect(() => {
        const overlay = overlayRef.current;
        if (!overlay) return;

        // Map hotspot coordinates from logical size to rendered canvas size
        const rect = overlay.getBoundingClientRect();
        const scaleX = rect.width / size;
        const scaleY = rect.height / size;

        const left = Math.round(hotspot.x * scaleX);
        const top = Math.round(hotspot.y * scaleY);

        setPos({ left, top });
    }, [overlayRef, hotspot, size]);

    // Map color name to CSS color value
    const getColorValue = (c: string) => {
        switch (c) {
            case 'red': return 'rgba(255, 0, 0, 0.9)';
            case 'green': return 'rgba(0, 255, 0, 0.9)';
            case 'blue': return 'rgba(0, 0, 255, 0.9)';
            case 'black': return 'rgba(0, 0, 0, 0.9)';
            case 'white': return 'rgba(255, 255, 255, 0.9)';
            default: return 'rgba(124,58,237,0.9)'; // Default purple
        }
    };

    const colorValue = getColorValue(color);
    const centerColorValue = color === 'white' ? 'black' : (color === 'black' ? 'white' : colorValue);

    if (mode === 'crosshair') {
        // FPS-style crosshair with circle and center dot
        return (
            <div style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                pointerEvents: 'none',
                zIndex: 20,
                transform: 'translate(-50%, -50%)',
                color: colorValue
            }}>
                <svg xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    {/* outer circle */}
                    <circle cx="12" cy="12" r="10" />
                    {/* crosshair lines */}
                    <line x1="22" y1="12" x2="18" y2="12" />
                    <line x1="6" y1="12" x2="2" y2="12" />
                    <line x1="12" y1="6" x2="12" y2="2" />
                    <line x1="12" y1="22" x2="12" y2="18" />
                    {/* center dot */}
                    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
                </svg>
            </div>
        );
    }

    if (mode === 'dot') {
        // Dot mode - SVG-based single dot (similar to crosshair but without lines)
        return (
            <div style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                pointerEvents: 'none',
                zIndex: 20,
                transform: 'translate(-50%, -50%)',
                color: colorValue
            }}>
                <svg xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    {/* center dot - same size as crosshair center dot */}
                    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
                </svg>
            </div>
        );
    }

    // Default: Axis mode (simplified SVG center + full-span lines extending out)
    return (
        <>
            {/* Simplified SVG as requested */}
            <div style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                pointerEvents: 'none',
                zIndex: 20,
                transform: 'translate(-50%, -50%)',
                color: colorValue
            }}>
                <svg xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    {/* outer circle */}
                    <circle cx="12" cy="12" r="10" />
                    {/* center dot */}
                    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
                </svg>
            </div>

            {/* Vertical crosshair line - top segment (above center, extending out) */}
            <div
                style={{
                    position: 'absolute',
                    left: pos.left, // Center on the hotspot position
                    top: 0,
                    width: 2,
                    height: `${pos.top - 10}px`, // Stop 10px before center
                    backgroundColor: colorValue,
                    pointerEvents: 'none',
                    zIndex: 19,
                    transform: 'translateX(-50%)' // Center horizontally like the SVG
                }}
            />

            {/* Vertical crosshair line - bottom segment (below center, extending out) */}
            <div
                style={{
                    position: 'absolute',
                    left: pos.left, // Center on the hotspot position
                    top: `${pos.top + 10}px`, // Start 10px after center
                    width: 2,
                    height: `calc(100% - ${pos.top + 10}px)`,
                    backgroundColor: colorValue,
                    pointerEvents: 'none',
                    zIndex: 19,
                    transform: 'translateX(-50%)' // Center horizontally like the SVG
                }}
            />

            {/* Horizontal crosshair line - left segment (left of center, extending out) */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: pos.top, // Center on the hotspot position
                    width: `${pos.left - 10}px`, // Stop 10px before center
                    height: 2,
                    backgroundColor: colorValue,
                    pointerEvents: 'none',
                    zIndex: 19,
                    transform: 'translateY(-50%)' // Center vertically like the SVG
                }}
            />

            {/* Horizontal crosshair line - right segment (right of center, extending out) */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pos.left + 10}px`, // Start 10px after center
                    top: pos.top, // Center on the hotspot position
                    width: `calc(100% - ${pos.left + 12}px)`,
                    height: 2,
                    backgroundColor: colorValue,
                    pointerEvents: 'none',
                    zIndex: 19,
                    transform: 'translateY(-50%)' // Center vertically like the SVG
                }}
            />
        </>
    );
}
