import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for drag-to-move hotspot functionality
 *
 * @param isEnabled - Whether hotspot dragging is currently enabled
 * @param overlayRef - Reference to the overlay element for coordinate mapping
 * @param targetSize - The logical cursor size (e.g., 256px)
 * @param onHotspotChange - Callback function to handle hotspot position changes
 * @returns Drag state and event handlers
 */
export function useHotspotDrag(
    isEnabled: boolean,
    overlayRef: React.RefObject<HTMLDivElement | null>,
    targetSize: number,
    onHotspotChange: (x: number, y: number) => void
) {
    const [isDragging, setIsDragging] = useState(false);
    const [mouseButtonDown, setMouseButtonDown] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const lastHotspotRef = useRef<{ x: number; y: number } | null>(null);

    /**
     * Calculate hotspot position from mouse coordinates
     */
    const calculateHotspotFromMouse = useCallback(
        (clientX: number, clientY: number): { x: number; y: number } | null => {
            const overlay = overlayRef.current;
            if (!overlay) return null;

            const rect = overlay.getBoundingClientRect();
            const clickX = clientX - rect.left;
            const clickY = clientY - rect.top;

            // Map click coordinates from rendered canvas size to logical cursor size
            const scaleX = targetSize / rect.width;
            const scaleY = targetSize / rect.height;

            const hx = Math.max(0, Math.min(targetSize - 1, Math.round(clickX * scaleX)));
            const hy = Math.max(0, Math.min(targetSize - 1, Math.round(clickY * scaleY)));

            return { x: hx, y: hy };
        },
        [overlayRef, targetSize]
    );

    /**
     * End drag operation and cleanup
     */
    const endDrag = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            dragStartRef.current = null;
            lastHotspotRef.current = null;
        }
    }, [isDragging, mouseButtonDown]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (isEnabled) {
                setIsDragging(true);
                setMouseButtonDown(true);
                dragStartRef.current = { x: e.clientX, y: e.clientY };

                // Set initial hotspot position
                const hotspot = calculateHotspotFromMouse(e.clientX, e.clientY);
                if (hotspot) {
                    lastHotspotRef.current = hotspot;
                    onHotspotChange(hotspot.x, hotspot.y);
                }

                e.preventDefault(); // Prevent default drag behavior
            }
        },
        [isEnabled, calculateHotspotFromMouse, onHotspotChange]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (isDragging && dragStartRef.current && isEnabled) {
                // Calculate new hotspot position directly from current mouse position
                const hotspot = calculateHotspotFromMouse(e.clientX, e.clientY);
                if (hotspot && (!lastHotspotRef.current ||
                    hotspot.x !== lastHotspotRef.current.x ||
                    hotspot.y !== lastHotspotRef.current.y)) {

                    lastHotspotRef.current = hotspot;
                    onHotspotChange(hotspot.x, hotspot.y);
                }

                // Update drag start for next frame
                dragStartRef.current = { x: e.clientX, y: e.clientY };
            }
        },
        [isDragging, isEnabled, calculateHotspotFromMouse, onHotspotChange]
    );

    const handleMouseUp = useCallback(() => {
        setMouseButtonDown(false);
        endDrag();
    }, [endDrag]);

    const handleMouseLeave = useCallback(() => {
        // If the user leaves the overlay while dragging, do NOT end drag here.
        // Instead, only end the local overlay drag state when the mouse button
        // is not down. We continue to track the mouse globally while the
        // button is depressed so the hotspot follows the cursor even outside
        // the canvas (clamped to the canvas boundary).
        if (isDragging && !mouseButtonDown) {
            setIsDragging(false);
        }
    }, [isDragging, mouseButtonDown]);

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Resume dragging if mouse button is still down
        if (mouseButtonDown && !isDragging && isEnabled) {
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX, y: e.clientY };
        }
    }, [mouseButtonDown, isDragging, isEnabled]);
    // Track global mouse move & button state while the mouse is down.
    // When the user presses the mouse button and drags off the canvas, we
    // want to continue tracking the cursor globally and update the hotspot
    // (clamped by the canvas bounds). We attach global listeners only while
    // the mouse button is down to reduce overhead.
    useEffect(() => {
        if (!isEnabled || !mouseButtonDown) return;

        const handleDocumentMouseMove = (e: MouseEvent) => {
            // Only act while dragging/holding the button down
            const hotspot = calculateHotspotFromMouse(e.clientX, e.clientY);
            if (hotspot && (!lastHotspotRef.current ||
                hotspot.x !== lastHotspotRef.current.x ||
                hotspot.y !== lastHotspotRef.current.y)) {

                lastHotspotRef.current = hotspot;
                onHotspotChange(hotspot.x, hotspot.y);
            }
        };

        const handleDocumentMouseUp = () => {
            setMouseButtonDown(false);
            endDrag();
        };

        document.addEventListener('mousemove', handleDocumentMouseMove);
        document.addEventListener('mouseup', handleDocumentMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleDocumentMouseMove);
            document.removeEventListener('mouseup', handleDocumentMouseUp);
        };
    }, [mouseButtonDown, isEnabled, calculateHotspotFromMouse, onHotspotChange, endDrag]);

    return {
        isDragging,
        handlers: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseLeave,
            onMouseEnter: handleMouseEnter
        }
    };
}