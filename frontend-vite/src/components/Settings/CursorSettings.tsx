import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useMessage } from '../../hooks/useMessage';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

import { useDebounce } from '../../hooks/safe/useDebounce';
import { Commands } from '../../tauri/commands';
import { MAX_CURSOR_SIZE } from '@/constants/cursorConstants';
import { logger } from '../../utils/logger';
import { invokeWithFeedback } from '../../store/operations/invokeWithFeedback';
import type { Message } from '../../store/slices/uiStateStore';
import type { CursorInfo } from '@/types/generated/CursorInfo';

export function CursorSettings() {
    const { invoke } = useApp();
    const { showMessage } = useMessage();
    const showMessageTyped = React.useCallback(
        (text: string, type?: Message['type']) => {
            const normalized: Message['type'] | undefined = type === '' || type === undefined ? undefined : type;
            showMessage(text, normalized);
        },
        [showMessage]
    );
    const cursorState = useAppStore((s) => s.cursorState);
    // Default to empty array so tests and initial renders don't throw before cursors load
    const availableCursors = useAppStore((s) => s.availableCursors) ?? [];
    const setCursorSize = useAppStore((s) => s.operations.setCursorSize);
    const loadAvailableCursors = useAppStore((s) => s.operations.loadAvailableCursors);
    const [localCursorSize, setLocalCursorSize] = useState<number>(cursorState?.cursorSize || 32);
    const lastCommittedSize = useRef<number>(cursorState?.cursorSize || 32);
    const isDragging = useRef<boolean>(false);
    const [normalPreviewUrl, setNormalPreviewUrl] = useState<string | null>(null);
    const [normalPreviewLoading, setNormalPreviewLoading] = useState<boolean>(false);
    const [thumbCursorData, setThumbCursorData] = useState<{
        url: string;
        hotspotX: number;
        hotspotY: number;
    } | null>(null);
    const normalCursor = useMemo(
        () => availableCursors.find((cursor) => cursor.name.toLowerCase() === 'normal'),
        [availableCursors]
    );
    const sliderMin = 32;
    const sliderMax = MAX_CURSOR_SIZE;

    const handleResetCursors = useCallback(async () => {
        const result = await invokeWithFeedback(invoke, Commands.resetCurrentModeCursors, {
            logLabel: '[CursorSettings] Failed to reset cursors:',
            errorMessage: 'Failed to reset cursors',
            errorType: 'error',
            successMessage: 'Active cursors reset to default',
            successType: 'success'
        });
        if (result.status === 'success') {
            await loadAvailableCursors();
        }
    }, [invoke, loadAvailableCursors]);

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

    // Load preview for the current Normal select cursor
    useEffect(() => {
        if (!normalCursor) {
            setNormalPreviewUrl(null);
            setNormalPreviewLoading(false);
            return;
        }

        let isMounted = true;
        setNormalPreviewLoading(true);
        const loadPreview = async () => {
            const previewResult = await invokeWithFeedback(
                invoke,
                normalCursor.image_path ? Commands.getLibraryCursorPreview : Commands.getSystemCursorPreview,
                {
                    args: normalCursor.image_path
                        ? { file_path: normalCursor.image_path }
                        : { cursor_name: 'Normal' },
                    logLabel: '[CursorSettings] Failed to load Normal cursor preview:'
                }
            );
            if (!isMounted) return;

            if (previewResult.status === 'success') {
                setNormalPreviewUrl(previewResult.value as string);
            } else {
                logger.warn('[CursorSettings] Failed to load Normal cursor preview:', previewResult.status === 'error' ? previewResult.error : 'skipped');
                setNormalPreviewUrl(null);
            }

            setNormalPreviewLoading(false);
        };

        loadPreview();
        return () => {
            isMounted = false;
        };
    }, [normalCursor, invoke]);

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

    // Reduce preview size to better match on-screen cursor
    const PREVIEW_SCALE = 0.8;
    const sliderPercent = Math.min(
        100,
        Math.max(0, ((localCursorSize - sliderMin) / (sliderMax - sliderMin)) * 100)
    );
    type CursorWithHotspot = CursorInfo & { hotspot_x?: number; hotspot_y?: number };

    useEffect(() => {
        if (!normalPreviewUrl || !normalCursor) {
            setThumbCursorData(null);
            return;
        }

        let isCancelled = false;
        const img = new Image();
        img.src = normalPreviewUrl;
        img.onload = () => {
            if (isCancelled) return;
            const targetSize = Math.max(sliderMin, Math.min(sliderMax, localCursorSize));
            const canvas = document.createElement('canvas');
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setThumbCursorData(null);
                return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.clearRect(0, 0, targetSize, targetSize);
            ctx.drawImage(img, 0, 0, targetSize, targetSize);

            const scaledUrl = canvas.toDataURL('image/png');
            const hotspotCursor = normalCursor as CursorWithHotspot | undefined;
            const baseHotspotX = typeof hotspotCursor?.hotspot_x === 'number' ? hotspotCursor.hotspot_x : 0;
            const baseHotspotY = typeof hotspotCursor?.hotspot_y === 'number' ? hotspotCursor.hotspot_y : 0;
            const sourceWidth = img.naturalWidth || targetSize;
            const sourceHeight = img.naturalHeight || targetSize;
            const scaleX = sourceWidth ? targetSize / sourceWidth : 1;
            const scaleY = sourceHeight ? targetSize / sourceHeight : 1;
            setThumbCursorData({
                url: scaledUrl,
                hotspotX: Math.round(baseHotspotX * scaleX),
                hotspotY: Math.round(baseHotspotY * scaleY)
            });
        };
        img.onerror = () => {
            if (!isCancelled) {
                setThumbCursorData(null);
            }
        };

        return () => {
            isCancelled = true;
        };
    }, [normalPreviewUrl, normalCursor, localCursorSize, sliderMin, sliderMax]);

    const sliderThumbCursor = useMemo(() => {
        if (!thumbCursorData) return undefined;
        return `url(${thumbCursorData.url}) ${thumbCursorData.hotspotX} ${thumbCursorData.hotspotY}, auto`;
    }, [thumbCursorData]);

    return (
        <>
            <section id="cursor-settings-section">
                <h2 className="mb-3 text-base font-semibold text-foreground">Cursor Settings</h2>
                <Card className="p-4 sm:p-5 bg-muted/30 border-muted-foreground/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                        <strong className="text-base whitespace-nowrap sm:mr-3">Cursor Size</strong>
                        <div className="w-full sm:w-auto sm:min-w-[320px] sm:max-w-none space-y-3 sm:ml-auto sm:flex sm:flex-col sm:items-end sm:text-right">
                            <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap sm:justify-end sm:items-center">
                                <div
                                    className="flex items-center justify-center overflow-hidden flex-shrink-0 self-center"
                                    style={{
                                        width: `${Math.round(32 * PREVIEW_SCALE)}px`,
                                        height: `${Math.round(32 * PREVIEW_SCALE)}px`
                                    }}
                                >
                                    {normalPreviewLoading ? (
                                        <div className="h-5 w-5 rounded-full bg-muted animate-pulse" aria-label="Loading preview" />
                                    ) : normalPreviewUrl ? (
                                        <img
                                            src={normalPreviewUrl}
                                            alt="Normal select preview 32px"
                                            className="object-contain pointer-events-none select-none"
                                            style={{
                                                width: `${Math.round(32 * PREVIEW_SCALE)}px`,
                                                height: `${Math.round(32 * PREVIEW_SCALE)}px`
                                            }}
                                        />
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground text-center px-1">
                                            No preview
                                        </span>
                                    )}
                                </div>

                                <div className="relative w-full sm:w-[360px] md:w-[400px] lg:w-[440px] min-w-[220px] sm:min-w-[300px] max-w-[480px] flex items-center self-center">
                                    <span
                                        className="absolute -top-8 -translate-x-1/2 text-lg font-semibold text-foreground pointer-events-none whitespace-nowrap"
                                        style={{
                                            left: `calc(${sliderPercent}% + 9px)` // half of 18px thumb to center label with knob
                                        }}
                                    >
                                        <span>{localCursorSize}</span>
                                        <span className="ml-0.5">px</span>
                                    </span>
                                    <Slider
                                        id="cursor-size-slider"
                                        min={sliderMin}
                                        max={sliderMax}
                                        value={[Number(localCursorSize)]}
                                        step={8}
                                        onValueChange={handleValueChange}
                                        onValueCommit={handleValueCommit}
                                        className="w-full"
                                        thumbCursor="pointer"
                                        thumbActiveCursor={sliderThumbCursor}
                                    />
                                </div>

                                <div
                                    className="flex items-center justify-center overflow-hidden flex-shrink-0 self-center"
                                    style={{
                                        width: `${Math.round(256 * PREVIEW_SCALE)}px`,
                                        height: `${Math.round(256 * PREVIEW_SCALE)}px`
                                    }}
                                >
                                    {normalPreviewLoading ? (
                                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" aria-label="Loading preview" />
                                    ) : normalPreviewUrl ? (
                                        <img
                                            src={normalPreviewUrl}
                                            alt="Normal select preview 256px"
                                            className="object-contain pointer-events-none select-none"
                                            style={{
                                                width: `${Math.round(256 * PREVIEW_SCALE)}px`,
                                                height: `${Math.round(256 * PREVIEW_SCALE)}px`
                                            }}
                                        />
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground text-center px-1">
                                            No preview
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </Card>
            </section>

        </>
    );
}
