import { removeBackground } from '@imgly/background-removal';
import { logger } from '../utils/logger';

/**
 * Utility function to remove background from an image file
 * @param file - The image file to process
 * @returns Promise with the processed image as a Blob
 */
export async function removeImageBackground(file: File): Promise<Blob> {
    try {
        // Read the file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Convert to Blob that the background removal library can process
        const blob = new Blob([uint8Array], { type: file.type });

        // Use imgly background removal
        const resultBlob = await removeBackground(blob, {
            // You can add options here if needed
            // For example: debug: true, publicPath: '/path'
        });

        return resultBlob;
    } catch (error) {
        logger.error('Background removal failed:', error);
        throw new Error('Failed to remove background: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Utility function to check if background removal is supported for a file type
 * @param file - The file to check
 * @returns boolean indicating if background removal is supported
 */
export function isBackgroundRemovalSupported(file: File): boolean {
    const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    return supportedTypes.includes(file.type);
}