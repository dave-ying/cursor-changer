import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useMessage } from '../../context/MessageContext';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

import { useDebounce } from '../../hooks/safe/useDebounce';
import { Commands, invokeCommand } from '../../tauri/commands';
import { MAX_CURSOR_SIZE } from '@/constants/cursorConstants';
import { logger } from '../../utils/logger';

export function CursorSettings() {
    const { invoke } = useApp();
    const { showMessage } = useMessage();
    const cursorState = useAppStore((s) => s.cursorState);
    const setCursorSize = useAppStore((s) => s.operations.setCursorSize);
    const loadAvailableCursors = useAppStore((s) => s.operations.loadAvailableCursors);
    const [localCursorSize, setLocalCursorSize] = useState<number>(cursorState?.cursorSize || 32);
    const lastCommittedSize = useRef<number>(cursorState?.cursorSize || 32);
    const isDragging = useRef<boolean>(false);

    const handleResetCursors = useCallback(async () => {
        try {
            await invokeCommand(invoke, Commands.resetCurrentModeCursors);
            await loadAvailableCursors();
            showMessage('Active cursors reset to default', 'success');
        } catch (error) {
            logger.error('Failed to reset cursors', error);
            showMessage('Failed to reset cursors', 'error');
        }
    }, [invoke, loadAvailableCursors, showMessage]);

    // Debounce utility function
    const { debounce, cleanup } = useDebounce();

    useEffect(() => cleanup, [cleanup]);

    // Sync local state with context state when it changes from external sources
    // BUT NOT while the user is actively dragging (prevents feedback loop/jitter)
    useEffect(() => {
        if (cursorState?.cursorSize && !isDragging.current) {
            setLocalCursorSize(cursorState.cursorSize);
            lastCommittedSize.current = cursorState.cursorSize;
        }
    }, [cursorState?.cursorSize]);

    // Debounced function to update cursor size in real-time while dragging
    // Uses 30ms delay for near-instant feedback while preventing excessive backend calls
    const debouncedSetCursorSize = useMemo(
        () => debounce((size: number) => {
            setCursorSize(String(size));
            lastCommittedSize.current = size;
        }, 30),
        [debounce, setCursorSize]
    );

    // Handle value changes during dragging - updates local state immediately
    // and triggers debounced backend updates for real-time cursor resizing
    const handleValueChange = useCallback((value: number[]) => {
        const newSize = value[0];
        if (newSize !== undefined) {
            isDragging.current = true;  // Mark as dragging to prevent sync feedback loop
            setLocalCursorSize(newSize);
            debouncedSetCursorSize(newSize);
        }
    }, [debouncedSetCursorSize]);

    // Handle final value commit when user releases the slider
    // Ensures the final value is always committed even if debounce hasn't fired yet
    const handleValueCommit = useCallback((value: number[]) => {
        const finalSize = value[0];
        if (finalSize !== undefined && finalSize !== lastCommittedSize.current) {
            setCursorSize(String(finalSize));
            lastCommittedSize.current = finalSize;
        }
        // Small delay before re-enabling sync to allow any pending backend updates to settle
        setTimeout(() => {
            isDragging.current = false;
        }, 50);
    }, [setCursorSize]);

    return (
        <>
            <section id="cursor-settings-section">
                <h2 className="mb-3 text-base font-semibold text-foreground">Cursor Settings</h2>
                <Card className="p-4 sm:p-5 bg-muted/30 border-muted-foreground/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <strong className="text-base">Cursor Size</strong>
                        <div className="w-full sm:w-[42%] sm:min-w-[200px]">
                            <label htmlFor="cursor-size-slider" className="block mb-2">
                                <span id="cursor-size-display" className="font-bold">{localCursorSize}</span> px
                            </label>
                            <Slider
                                id="cursor-size-slider"
                                min={32}
                                max={MAX_CURSOR_SIZE}
                                value={[Number(localCursorSize)]}
                                step={8}
                                onValueChange={handleValueChange}
                                onValueCommit={handleValueCommit}
                                className="w-full"
                            />
                        </div>
                    </div>
                </Card>
            </section>

        </>
    );
}
