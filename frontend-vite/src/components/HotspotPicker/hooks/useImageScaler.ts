import { useState, useEffect, useRef, RefObject, Dispatch, SetStateAction } from 'react';
import type { ImageTransform, CursorInfo } from '../types';

interface UseImageScalerProps {
    imgRef: RefObject<HTMLImageElement | null>;
    targetSize: number;
    objectUrl: string | null;
    cursorInfo: CursorInfo | null;
}

interface UseImageScalerReturn {
    imageTransform: ImageTransform;
    setImageTransform: Dispatch<SetStateAction<ImageTransform>>;
    calculateFitScale: () => number;
}

export function useImageScaler({
    imgRef,
    targetSize,
    objectUrl,
    cursorInfo
}: UseImageScalerProps): UseImageScalerReturn {
    // Image transform state for resize & reposition
    // Default scale to 100% (1.0) since image fitting is handled by CSS object-fit
    const [imageTransform, setImageTransform] = useState<ImageTransform>({
        scale: 1.0,
        offsetX: 0,
        offsetY: 0
    });
    // Ref to track if we've already run the initial fit
    const hasRunInitialFit = useRef(false);

    // Helper function to calculate fit-to-canvas scale (kept for reference but no longer used for auto-fitting)
    const calculateFitScale = (): number => {
        if (!imgRef.current) return 1;
        const img = imgRef.current;
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;

        if (!imgWidth || !imgHeight) return 1;

        // Calculate scale to fit image within targetSize maintaining aspect ratio
        const scaleX = targetSize / imgWidth;
        const scaleY = targetSize / imgHeight;
        return Math.min(scaleX, scaleY, 1); // Don't upscale beyond 100%
    };

    // No longer auto-fit using transform scale since image fitting is handled by CSS object-fit
    // The transform scale should remain at 100% by default for manual user adjustment
    useEffect(() => {
        if (objectUrl && imgRef.current && !cursorInfo && !hasRunInitialFit.current) {
            // Mark that we've processed the initial image load
            hasRunInitialFit.current = true;
        }
        return undefined;
    }, [objectUrl, cursorInfo, imgRef]);

    return {
        imageTransform,
        setImageTransform,
        calculateFitScale
    };
}
