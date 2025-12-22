import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useMessage } from '../../hooks/useMessage';
import { useAppStore } from '../../store/useAppStore';
import { logger } from '../../utils/logger';
import { Commands, invokeCommand } from '../../tauri/commands';
import { MAX_CURSOR_SIZE } from '../../constants/cursorConstants';
import type { HotspotPickerProps, Hotspot, CursorInfo, BackgroundType, HotspotMode, HotspotColor, UseHotspotLogicReturn } from './types';
import { useImageScaler } from './hooks/useImageScaler';
import { useCursorFileHandler } from './hooks/useCursorFileHandler';

/**
 * Custom hook that encapsulates all HotspotPicker business logic
 * Manages state, effects, and event handlers for the hotspot picking functionality
 */
export function useHotspotLogic({
    file,
    filePath,
    itemId,
    defaultSize = MAX_CURSOR_SIZE
}: HotspotPickerProps): UseHotspotLogicReturn {
    const { invoke } = useApp();
    const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);
    const { showMessage } = useMessage();

    // State
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    // Fixed resolution: 256x256 is the maximum quality for Windows .CUR format
    const [targetSize, setTargetSize] = useState(() => Math.min(defaultSize, MAX_CURSOR_SIZE));
    const [hotspot, setHotspot] = useState<Hotspot>({ x: 0, y: 0 }); // Default to top-left corner
    const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null); // Store cursor dimensions and hotspot
    const [previewBg, setPreviewBg] = useState<BackgroundType>('checkerboard'); // Background: checkerboard, black, yellow, white, custom
    const [hotspotMode, setHotspotMode] = useState<HotspotMode>('crosshair'); // 'axis' or 'crosshair'
    const [hotspotColor, setHotspotColor] = useState<HotspotColor>('red'); // Hotspot color: 'red', 'black', or 'white'

    // Refs
    const imgRef = useRef<HTMLImageElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const holdRafRef = useRef<number | null>(null);
    const holdActiveRef = useRef(false);
    const holdActionRef = useRef<(() => void) | null>(null);
    const holdNextFireAtRef = useRef<number>(0);

    // Store stable references to prevent effect re-runs
    const invokeRef = useRef(invoke);
    const showMessageRef = useRef(showMessage);

    // Keep refs up to date
    useEffect(() => {
        invokeRef.current = invoke;
        showMessageRef.current = showMessage;
    }, [invoke, showMessage]);

    // Use the new hooks
    const { imageTransform, setImageTransform, calculateFitScale } = useImageScaler({
        imgRef,
        targetSize,
        objectUrl,
        cursorInfo
    });

    const filename = useMemo(() => {
        if (file) return file.name || 'image';
        if (filePath) return filePath.split('\\').pop() || filePath.split('/').pop() || 'cursor';
        return 'image';
    }, [file, filePath]);

    const {
        busy,
        isRemovingBackground,
        handleConfirm,
        handleDelete,
        handleRemoveBackground
    } = useCursorFileHandler({
        file: file ?? null,
        filePath: filePath ?? null,
        itemId: itemId ?? null,
        filename,
        hotspot,
        targetSize,
        imageTransform,
        overlayRef,
        invoke,
        showMessage,
        loadLibraryCursors,
        setObjectUrl
    });

    // When targetSize changes, reset hotspot to top-left corner (but NOT when editing existing library cursor)
    useEffect(() => {
        if (!filePath) {
            setHotspot({ x: 0, y: 0 });
        }
    }, [targetSize, filePath]);

    // Add keyboard navigation for hotspot (arrow keys)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (busy) return; // Don't allow navigation while processing

            let newX = hotspot.x;
            let newY = hotspot.y;
            let handled = false;

            switch (e.key) {
                case 'ArrowLeft':
                    newX = Math.max(0, hotspot.x - 1);
                    handled = true;
                    break;
                case 'ArrowRight':
                    newX = Math.min(targetSize - 1, hotspot.x + 1);
                    handled = true;
                    break;
                case 'ArrowUp':
                    newY = Math.max(0, hotspot.y - 1);
                    handled = true;
                    break;
                case 'ArrowDown':
                    newY = Math.min(targetSize - 1, hotspot.y + 1);
                    handled = true;
                    break;
            }

            if (handled) {
                e.preventDefault();
                setHotspot({ x: newX, y: newY });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hotspot, targetSize, busy]);

    // Create/revoke a blob URL for the uploaded file for preview
    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setObjectUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (filePath) {
            // Load existing library cursor with hotspot information
            invokeCommand(invokeRef.current, Commands.getCursorWithClickPoint, { file_path: filePath })
                .then((info) => {
                    setObjectUrl(info.data_url);
                    setCursorInfo({
                        width: info.width,
                        height: info.height,
                        hotspot_x: info.click_point_x,
                        hotspot_y: info.click_point_y
                    });
                    // Set current hotspot from the file
                    setHotspot({ x: info.click_point_x, y: info.click_point_y });
                    // Set targetSize from the existing cursor's dimensions (use width as it's square)
                    setTargetSize(info.width);
                })
                .catch((err: any) => {
                    logger.error('Failed to load cursor info:', err);
                    showMessageRef.current('Failed to load cursor info', 'error');
                });
        }
        return undefined;
    }, [file, filePath]);

    const handlePick = (e: React.MouseEvent<HTMLDivElement>) => {
        const overlay = overlayRef.current;
        if (!overlay) return;

        const rect = overlay.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Map click coordinates from rendered canvas size to logical cursor size (targetSize x targetSize)
        const scaleX = targetSize / rect.width;
        const scaleY = targetSize / rect.height;

        const hx = Math.max(0, Math.min(targetSize - 1, Math.round(clickX * scaleX)));
        const hy = Math.max(0, Math.min(targetSize - 1, Math.round(clickY * scaleY)));

        setHotspot({ x: hx, y: hy });
    };

    // Click-and-hold helper function
    const startHoldAction = (action: () => void) => {
        if (holdActiveRef.current) {
            stopHoldAction();
        }

        // Execute immediately on first press
        action();

        holdActiveRef.current = true;
        holdActionRef.current = action;

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const initialDelayMs = 120;
        holdNextFireAtRef.current = now + initialDelayMs;

        const repeatMs = 30;
        const tick = () => {
            if (!holdActiveRef.current || !holdActionRef.current) return;

            const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (t >= holdNextFireAtRef.current) {
                holdActionRef.current();
                holdNextFireAtRef.current = t + repeatMs;
            }

            holdRafRef.current = requestAnimationFrame(tick);
        };

        holdRafRef.current = requestAnimationFrame(tick);
    };

    const stopHoldAction = () => {
        holdActiveRef.current = false;
        holdActionRef.current = null;
        if (holdRafRef.current !== null) {
            cancelAnimationFrame(holdRafRef.current);
            holdRafRef.current = null;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopHoldAction();
        };
    }, []);

    return {
        // State
        objectUrl,
        targetSize,
        setTargetSize,
        hotspot,
        setHotspot,
        busy,
        cursorInfo,
        previewBg,
        setPreviewBg,
        hotspotMode,
        setHotspotMode,
        hotspotColor,
        setHotspotColor,
        imageTransform,
        setImageTransform,
        filename,
        isRemovingBackground,

        // Refs
        imgRef,
        overlayRef,

        // Functions
        calculateFitScale,
        handlePick,
        handleConfirm,
        handleDelete,
        handleRemoveBackground,
        startHoldAction,
        stopHoldAction
    };
}
