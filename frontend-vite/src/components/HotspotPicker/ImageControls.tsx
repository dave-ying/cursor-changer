import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCcw } from 'lucide-react';
import type { ImageControlsProps } from './types';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

/**
 * ImageControls component - scale and position adjustment controls for the cursor image
 */
export function ImageControls({
    imageTransform,
    setImageTransform,
    onReset,
    startHoldAction,
    stopHoldAction
}: ImageControlsProps) {
    const [localScale, setLocalScale] = useState<number>(imageTransform.scale);
    const lastCommittedScale = useRef<number>(imageTransform.scale);
    const isDragging = useRef<boolean>(false);

    // Sync local state with context state when it changes from external sources
    // BUT NOT while the user is actively dragging (prevents feedback loop/jitter)
    useEffect(() => {
        if (!isDragging.current) {
            setLocalScale(imageTransform.scale);
            lastCommittedScale.current = imageTransform.scale;
        }
    }, [imageTransform.scale]);

    // Debounced function to update scale in real-time while dragging
    // Uses 30ms delay for near-instant feedback while preventing excessive backend calls
    const debouncedSetScale = useMemo(
        () => debounce((scale: number) => {
            setImageTransform(prev => ({ ...prev, scale }));
            lastCommittedScale.current = scale;
        }, 30),
        [setImageTransform]
    );

    // Handle value changes during dragging - updates local state immediately
    // and triggers debounced backend updates for real-time scale changes
    const handleScaleChange = useCallback((value: number[]) => {
        const newScale = value[0];
        if (newScale !== undefined) {
            isDragging.current = true;  // Mark as dragging to prevent sync feedback loop
            setLocalScale(newScale);
            debouncedSetScale(newScale);
        }
    }, [debouncedSetScale]);

    // Handle final value commit when user releases the slider
    // Ensures the final value is always committed even if debounce hasn't fired yet
    const handleScaleCommit = useCallback((value: number[]) => {
        const finalScale = value[0];
        if (finalScale !== undefined && finalScale !== lastCommittedScale.current) {
            setImageTransform(prev => ({ ...prev, scale: finalScale }));
            lastCommittedScale.current = finalScale;
        }
        // Small delay before re-enabling sync to allow any pending backend updates to settle
        setTimeout(() => {
            isDragging.current = false;
        }, 50);
    }, [setImageTransform]);

    const handleScaleReset = useCallback(() => {
        const defaultScale = 1;
        setLocalScale(defaultScale);
        lastCommittedScale.current = defaultScale;
        isDragging.current = false;
        setImageTransform(prev => ({ ...prev, scale: defaultScale }));
    }, [setImageTransform]);

    const createHoldHandlers = useCallback(
        (action: () => void) => {
            return {
                onPointerDown: (e: React.PointerEvent) => {
                    e.preventDefault();
                    try {
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    } catch {
                    }
                    startHoldAction(action);
                },
                onPointerUp: () => stopHoldAction(),
                onPointerCancel: () => stopHoldAction(),
                onLostPointerCapture: () => stopHoldAction()
            };
        },
        [startHoldAction, stopHoldAction]
    );

    return (
        <>
            {/* Scale Control */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="text-sm font-medium text-foreground min-w-[52px]">
                        Scale
                    </span>
                    <div style={{ flex: 1 }}>
                        <Slider
                            id="scale-slider"
                            min={0.1}
                            max={5}
                            step={0.1}
                            value={[Number(localScale)]}
                            onValueChange={handleScaleChange}
                            onValueCommit={handleScaleCommit}
                            className="w-full"
                        />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground min-w-[45px] text-right">
                        {(localScale * 100).toFixed(0)}%
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Reset scale to 100%"
                        onClick={handleScaleReset}
                        disabled={Math.abs(localScale - 1) < 0.001}
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Position Control */}
            <div>
                <label className="text-sm font-medium text-foreground block mb-2">Position</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '120px', margin: '0 auto' }}>
                    <div></div>
                    <Button
                        {...createHoldHandlers(() => setImageTransform(prev => ({ ...prev, offsetY: prev.offsetY - 5 })))}
                        variant="outline"
                        size="sm"
                        style={{ padding: '4px', height: '32px' }}
                    >
                        ▲
                    </Button>
                    <div></div>
                    <Button
                        {...createHoldHandlers(() => setImageTransform(prev => ({ ...prev, offsetX: prev.offsetX - 5 })))}
                        variant="outline"
                        size="sm"
                        style={{ padding: '4px', height: '32px' }}
                    >
                        ◀
                    </Button>
                    <Button
                        onClick={() => setImageTransform(prev => ({ ...prev, offsetX: 0, offsetY: 0 }))}
                        variant="outline"
                        size="sm"
                        style={{ padding: '4px', height: '32px', fontSize: '10px' }}
                        title="Center position"
                    >
                        ●
                    </Button>
                    <Button
                        {...createHoldHandlers(() => setImageTransform(prev => ({ ...prev, offsetX: prev.offsetX + 5 })))}
                        variant="outline"
                        size="sm"
                        style={{ padding: '4px', height: '32px' }}
                    >
                        ▶
                    </Button>
                    <div></div>
                    <Button
                        {...createHoldHandlers(() => setImageTransform(prev => ({ ...prev, offsetY: prev.offsetY + 5 })))}
                        variant="outline"
                        size="sm"
                        style={{ padding: '4px', height: '32px' }}
                    >
                        ▼
                    </Button>
                    <div></div>
                </div>
            </div>

            {/* Reset Button */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                    onClick={onReset}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                >
                    Reset Transform
                </Button>
            </div>
        </>
    );
}
