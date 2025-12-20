import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useMessage } from '../../context/MessageContext';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { clearPreviewCache } from '../../services/cursorPreviewCache';
import { useDebounce } from '../../hooks/safe/useDebounce';
import { Commands, invokeCommand } from '../../tauri/commands';
import { MAX_CURSOR_SIZE } from '@/constants/cursorConstants';
import { logger } from '../../utils/logger';

export function CursorSettings() {
    const { invoke } = useApp();
    const { showMessage } = useMessage();
    const cursorState = useAppStore((s) => s.cursorState);
    const setCursorSize = useAppStore((s) => s.operations.setCursorSize);
    const setDefaultCursorStyle = useAppStore((s) => s.operations.setDefaultCursorStyle);
    const loadAvailableCursors = useAppStore((s) => s.operations.loadAvailableCursors);
    const [localCursorSize, setLocalCursorSize] = useState<number>(cursorState?.cursorSize || 32);
    const [resetLibraryDialogOpen, setResetLibraryDialogOpen] = useState<boolean>(false);
    const lastCommittedSize = useRef<number>(cursorState?.cursorSize || 32);
    const isDragging = useRef<boolean>(false);

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

    const handleResetCursors = async () => {
        try {
            // Clear preview cache since cursors will be reset
            clearPreviewCache();
            await invokeCommand(invoke, Commands.resetCurrentModeCursors);
            showMessage('Active Reset to Default', 'success');
            await loadAvailableCursors();
        } catch (error) {
            logger.error('Failed to reset cursors:', error);
            showMessage('Failed to reset cursors: ' + String(error), 'error');
        }
    };

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

                    <Separator className="my-4" />

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div>
                            <strong className="text-base">Default Cursors</strong>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Choose the style for default cursors
                            </p>
                        </div>
                        <ToggleGroup
                            type="single"
                            value={cursorState?.defaultCursorStyle || 'windows'}
                            onValueChange={async (value) => {
                                if (value && value !== cursorState?.defaultCursorStyle) {
                                    await setDefaultCursorStyle(value as 'windows' | 'mac');
                                    // Reset cursors to apply the new style
                                    await invokeCommand(invoke, Commands.resetCurrentModeCursors);
                                    await loadAvailableCursors();
                                }
                            }}
                            className="bg-muted rounded-full p-1"
                            aria-label="Default Cursor Style"
                        >
                            <ToggleGroupItem
                                value="windows"
                                className="rounded-full px-4 py-1 data-[state=on]:text-primary-foreground"
                                style={cursorState?.defaultCursorStyle === 'windows' ? {
                                    backgroundColor: cursorState.accentColor || '#7c3aed',
                                    borderColor: cursorState.accentColor || '#7c3aed'
                                } : {}}
                                aria-label="Windows style cursors"
                            >
                                Windows
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="mac"
                                className="rounded-full px-4 py-1 data-[state=on]:text-primary-foreground"
                                style={cursorState?.defaultCursorStyle === 'mac' ? {
                                    backgroundColor: cursorState.accentColor || '#7c3aed',
                                    borderColor: cursorState.accentColor || '#7c3aed'
                                } : {}}
                                aria-label="Mac style cursors"
                            >
                                Mac
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center justify-between">
                        <strong className="text-base">Reset Active to Default</strong>
                        <Button
                            id="reset-cursors-btn"
                            variant="default"
                            className="sm:w-auto rounded-full"
                            onClick={handleResetCursors}
                        >
                            Reset Cursors
                        </Button>
                    </div>
                </Card>
            </section>

        </>
    );
}
