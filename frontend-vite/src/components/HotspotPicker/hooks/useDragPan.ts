import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for drag-to-pan functionality
 * 
 * Features:
 * - Continues tracking drag even when mouse leaves the canvas element
 * - Allows free repositioning without boundary constraints
 *
 * @param isEnabled - Whether dragging is currently enabled
 * @param scale - Current scale factor for scaling movement calculations
 * @param onDrag - Callback function to handle drag delta (dx, dy in scaled units)
 * @returns Drag state and event handlers
 */
export function useDragPan(
    isEnabled: boolean,
    scale: number,
    onDrag: (dx: number, dy: number) => void
) {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    // Track if we're in a global drag mode (mouse left canvas but still dragging)
    const isGlobalDraggingRef = useRef(false);

    /**
     * Calculate scaled movement to maintain 1:1 feel with mouse cursor
     */
    const calculateScaledMovement = useCallback(
        (delta: number) => delta / scale,
        [scale]
    );

    /**
     * End drag operation and cleanup
     */
    const endDrag = useCallback(() => {
        setIsDragging(false);
        dragStartRef.current = null;
        isGlobalDraggingRef.current = false;
    }, []);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (isEnabled) {
                setIsDragging(true);
                dragStartRef.current = { x: e.clientX, y: e.clientY };
                e.preventDefault(); // Prevent default drag behavior
            }
        },
        [isEnabled]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (isDragging && dragStartRef.current && isEnabled) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;

                // Update drag start for next frame
                dragStartRef.current = { x: e.clientX, y: e.clientY };

                // Call onDrag with scaled movement (so it feels 1:1 with mouse cursor)
                onDrag(
                    calculateScaledMovement(dx),
                    calculateScaledMovement(dy)
                );
            }
        },
        [isDragging, isEnabled, onDrag, calculateScaledMovement]
    );

    const handleMouseUp = useCallback(() => {
        endDrag();
    }, [endDrag]);

    const handleMouseLeave = useCallback(() => {
        // When mouse leaves canvas while dragging, switch to global tracking mode
        // Don't end the drag - we'll continue tracking globally
        if (isDragging) {
            isGlobalDraggingRef.current = true;
        }
    }, [isDragging]);

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // If we're returning from global drag mode, update the drag start position
        if (isGlobalDraggingRef.current && isDragging) {
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            isGlobalDraggingRef.current = false;
        }
    }, [isDragging]);

    // Handle global mouse events for dragging outside the canvas
    useEffect(() => {
        if (!isDragging) return;

        const handleGlobalMouseMove = (e: MouseEvent) => {
            // Only process if we're in global drag mode (mouse left the canvas)
            if (isGlobalDraggingRef.current && dragStartRef.current && isEnabled) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;

                // Update drag start for next frame
                dragStartRef.current = { x: e.clientX, y: e.clientY };

                // Call onDrag with scaled movement
                onDrag(
                    calculateScaledMovement(dx),
                    calculateScaledMovement(dy)
                );
            }
        };

        const handleGlobalMouseUp = () => {
            endDrag();
        };

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        
        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, isEnabled, onDrag, calculateScaledMovement, endDrag]);

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
