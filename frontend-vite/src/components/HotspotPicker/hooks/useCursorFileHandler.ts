import { useState, RefObject } from 'react';
import { removeImageBackground, isBackgroundRemovalSupported } from '../../../lib/backgroundRemoval';
import type { Hotspot, ImageTransform } from '../types';
import { Commands, invokeCommand } from '../../../tauri/commands';
import { logger } from '../../../utils/logger';

interface UseCursorFileHandlerProps {
    file: File | null;
    filePath: string | null;
    itemId: string | null;
    filename: string;
    hotspot: Hotspot;
    targetSize: number;
    imageTransform: ImageTransform;
    overlayRef: RefObject<HTMLDivElement | null>;
    invoke: any;
    showMessage: (message: string, type?: 'success' | 'error' | 'info') => void;
    loadLibraryCursors: () => Promise<void>;
    setObjectUrl: (url: string | null) => void;
}

interface UseCursorFileHandlerReturn {
    busy: boolean;
    isRemovingBackground: boolean;
    handleConfirm: () => Promise<void>;
    handleDelete: () => Promise<void>;
    handleRemoveBackground: () => Promise<void>;
}

export function useCursorFileHandler({
    file,
    filePath,
    itemId,
    filename,
    hotspot,
    targetSize,
    imageTransform,
    overlayRef,
    invoke,
    showMessage,
    loadLibraryCursors,
    setObjectUrl
}: UseCursorFileHandlerProps): UseCursorFileHandlerReturn {
    const [busy, setBusy] = useState(false);
    const [isRemovingBackground, setIsRemovingBackground] = useState(false);

    const handleConfirm = async () => {
        if (!file && !filePath) return;
        setBusy(true);
        try {
            if (file) {
                // New upload - read file bytes and add to library with transformations
                let arrayBuffer: ArrayBuffer;
                if (typeof file.arrayBuffer === 'function') {
                    arrayBuffer = await file.arrayBuffer();
                } else {
                    arrayBuffer = await new Response(file).arrayBuffer();
                }
                const bytes = new Uint8Array(arrayBuffer);
                const data = Array.from(bytes);

                // Normalize offsets from preview CSS pixel space into targetSize space.
                // The preview canvas is responsive (not always 256x256), but the backend
                // renders to a fixed `targetSize` bitmap. Without this normalization,
                // the exported cursor can be misaligned vs the preview.
                const rect = overlayRef.current?.getBoundingClientRect();
                const scaleX = rect?.width ? (targetSize / rect.width) : 1;
                const scaleY = rect?.height ? (targetSize / rect.height) : 1;

                const normalizedOffsetX = Math.round(imageTransform.offsetX * scaleX);
                const normalizedOffsetY = Math.round(imageTransform.offsetY * scaleY);

                // Ask backend to convert with explicit hotspot, size, and transformations
                const cursor = await invokeCommand(invoke, Commands.addUploadedImageWithClickPointToLibrary, {
                    filename: filename,
                    data,
                    size: targetSize,
                    click_point_x: hotspot.x,
                    click_point_y: hotspot.y,
                    scale: imageTransform.scale,
                    offset_x: normalizedOffsetX,
                    offset_y: normalizedOffsetY,
                });

                showMessage(`Added ${cursor?.name || filename} to library with hotspot (${hotspot.x}, ${hotspot.y})`, 'success');
            } else if (filePath) {
                // For existing library cursor, only update the hotspot (transformations cannot be applied)
                try {
                    if (!itemId) {
                        throw new Error('Missing itemId for existing library cursor');
                    }
                    await invokeCommand(invoke, Commands.updateLibraryCursorClickPoint, {
                        id: itemId,
                        click_point_x: hotspot.x,
                        click_point_y: hotspot.y,
                    });

                    showMessage(`Updated hotspot for ${filename} to (${hotspot.x}, ${hotspot.y})`, 'success');
                } catch (innerErr) {
                    logger.error('Failed to update library cursor hotspot:', innerErr);
                    throw new Error('Could not update hotspot for existing library cursor: ' + innerErr);
                }
            }
        } catch (err) {
            logger.error('Failed to update hotspot:', err);
            showMessage('Failed to update hotspot: ' + err, 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!itemId) return; // Only allow delete for existing library cursors with ID

        setBusy(true);
        try {
            await invokeCommand(invoke, Commands.removeCursorFromLibrary, { id: itemId });
            showMessage(`Deleted ${filename} from library`, 'success');
            await loadLibraryCursors();
        } catch (err) {
            logger.error('Failed to delete cursor:', err);
            showMessage('Failed to delete cursor: ' + err, 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleRemoveBackground = async () => {
        if (!file) {
            logger.warn('handleRemoveBackground: No file available');
            return;
        }

        if (!isBackgroundRemovalSupported(file)) {
            showMessage('Background removal is not supported for this file type', 'error');
            return;
        }

        setIsRemovingBackground(true);
        try {
            const processedBlob = await removeImageBackground(file);
            // Create a new File object from the processed blob
            const processedFile = new File([processedBlob], file.name, {
                type: 'image/png',
                lastModified: Date.now()
            });

            // Update the file reference to trigger re-processing
            // This will cause the useEffect to create a new objectUrl
            // Note: This is a simplified approach - in a real app you might want to
            // handle this differently to preserve the original file reference
            const url = URL.createObjectURL(processedFile);
            setObjectUrl(url);

            showMessage('Background removed successfully!', 'success');
        } catch (error) {
            logger.error('Failed to remove background:', error);
            showMessage('Failed to remove background: ' + (error instanceof Error ? error.message : String(error)), 'error');
        } finally {
            setIsRemovingBackground(false);
        }
    };

    return {
        busy,
        isRemovingBackground,
        handleConfirm,
        handleDelete,
        handleRemoveBackground
    };
}
